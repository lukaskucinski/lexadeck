/**
 * Anki "Notes in Plain Text" (.txt) support for the import wizard.
 *
 * Anki exports lead with `#` directive lines (`#separator:tab`, `#html:true`,
 * optionally `#columns:...` and `#<tags|guid|notetype|deck> column:N`) and
 * usually have NO field-name header row, so the normal CSV parser can't read
 * them. This module detects that format, lets the wizard map columns onto
 * LexaDeck fields, and emits a canonical CSV string that the existing
 * `parseDeckCsv` pipeline (coercion, dedup, validation) consumes unchanged.
 */
import Papa from "papaparse";
import { headerToField, type ImportCard } from "./deckCsv";
import { stripBom } from "./notion";

type Field = keyof ImportCard;
export type AnkiFieldChoice = Field | "ignore";
export type AnkiMapping = AnkiFieldChoice[];

/** Field → canonical CSV header (matches deckCsv's TEMPLATE_HEADER + aliases). */
const FIELD_HEADERS: readonly (readonly [Field, string])[] = [
  ["term", "Term"],
  ["translation", "Translation"],
  ["wordType", "Word Type"],
  ["gender", "Gender"],
  ["cardType", "Card Type"],
  ["example", "Example"],
  ["exampleEn", "Example Translation"],
  ["notes", "Notes"],
  ["conjugation", "Conjugation"],
  ["emoji", "Emoji"],
];

/** Options for the per-column <Select> in the mapping UI. */
export const ANKI_FIELD_OPTIONS: readonly { value: AnkiFieldChoice; label: string }[] = [
  { value: "ignore", label: "Ignore" },
  ...FIELD_HEADERS.map(([value, label]) => ({ value, label })),
];

const SEPARATORS: Record<string, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  space: " ",
  pipe: "|",
  colon: ":",
};

function parseSeparator(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key in SEPARATORS) return SEPARATORS[key];
  const literal = raw.trim();
  return literal.length === 1 ? literal : "\t";
}

const ANKI_DIRECTIVE = /^#(separator|html|columns|tags|guid|notetype|deck)\b/i;

export function isAnkiExport(text: string): boolean {
  const first = stripBom(text)
    .split(/\r?\n/)
    .find((l) => l.trim() !== "");
  return !!first && ANKI_DIRECTIVE.test(first.trim());
}

interface AnkiParse {
  separator: string;
  html: boolean;
  fieldNames: string[] | null;
  ignoreColumns: number[]; // 0-based meta columns (tags/guid/notetype/deck)
  rows: string[][];
}

function parseAnki(text: string): AnkiParse {
  const allLines = stripBom(text).split(/\r?\n/);
  let i = 0;
  const directives: string[] = [];
  while (i < allLines.length && allLines[i].startsWith("#")) directives.push(allLines[i++]);

  let separator = "\t";
  let html = false;
  let columnsLine: string | null = null;
  const ignoreColumns: number[] = [];

  for (const d of directives) {
    const sep = d.match(/^#separator\s*:\s*(.+)$/i);
    if (sep) {
      separator = parseSeparator(sep[1]);
      continue;
    }
    if (/^#html\s*:\s*true/i.test(d)) {
      html = true;
      continue;
    }
    const cols = d.match(/^#columns\s*:\s*(.+)$/i);
    if (cols) {
      columnsLine = cols[1];
      continue;
    }
    const meta = d.match(/^#(?:tags|guid|notetype|deck)\s+column\s*:\s*(\d+)/i);
    if (meta) ignoreColumns.push(Number(meta[1]) - 1);
  }

  const fieldNames = columnsLine ? columnsLine.split(separator).map((s) => s.trim()) : null;

  const dataText = allLines.slice(i).join("\n");
  const { data } = Papa.parse<string[]>(dataText, { delimiter: separator });
  const rows = (data as string[][]).filter((r) => r.some((c) => c.trim() !== ""));

  return { separator, html, fieldNames, ignoreColumns, rows };
}

export interface AnkiAnalysis {
  separator: string;
  html: boolean;
  fieldNames: string[] | null;
  columnCount: number;
  dataRowCount: number;
  ignoreColumns: number[];
  sampleRows: string[][];
}

export function analyzeAnki(text: string): AnkiAnalysis {
  const p = parseAnki(text);
  const columnCount = Math.max(
    p.fieldNames?.length ?? 0,
    ...p.rows.map((r) => r.length),
    0,
  );
  return {
    separator: p.separator,
    html: p.html,
    fieldNames: p.fieldNames,
    columnCount,
    dataRowCount: p.rows.length,
    ignoreColumns: p.ignoreColumns,
    sampleRows: p.rows.slice(0, 5),
  };
}

/** Best-guess column→field mapping to pre-fill the wizard's selectors. */
export function defaultMapping(a: AnkiAnalysis): AnkiMapping {
  const m: AnkiMapping = [];
  for (let i = 0; i < a.columnCount; i++) {
    if (a.ignoreColumns.includes(i)) {
      m[i] = "ignore";
    } else if (a.fieldNames?.[i]) {
      m[i] = headerToField(a.fieldNames[i]) ?? "ignore";
    } else {
      m[i] = i === 0 ? "term" : i === 1 ? "translation" : "ignore";
    }
  }
  // a deck needs a Term — promote the first non-meta column if none matched
  if (!m.includes("term")) {
    const idx = m.findIndex((_, i) => !a.ignoreColumns.includes(i));
    if (idx >= 0) m[idx] = "term";
  }
  return m;
}

export function stripAnkiHtml(s: string): string {
  return s
    .replace(/\[sound:[^\]]*\]/gi, "") // audio refs (media not imported)
    .replace(/<img[^>]*>/gi, "") // image tags
    .replace(/<br\s*\/?>/gi, "\n") // line breaks → newline
    .replace(/<\/(p|div)>/gi, "\n") // block ends → newline
    .replace(/<[^>]+>/g, "") // any remaining tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/gi, "&") // decode last so "&amp;lt;" doesn't become "<"
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Apply the column mapping and emit a canonical CSV string (the same schema
 * `parseDeckCsv` expects). Multiple columns mapped to one field are joined with
 * newlines; HTML is stripped when the export declared `#html:true`.
 */
export function ankiToCsv(text: string, mapping: AnkiMapping): string {
  const p = parseAnki(text);
  const clean = (s: string) => (p.html ? stripAnkiHtml(s) : s.trim());

  const usedFields = FIELD_HEADERS.filter(([field]) => mapping.includes(field));
  const header = usedFields.map(([, label]) => label);

  const rows = p.rows.map((cells) =>
    usedFields.map(([field]) => {
      const parts: string[] = [];
      mapping.forEach((choice, col) => {
        if (choice === field) {
          const v = clean(cells[col] ?? "");
          if (v) parts.push(v);
        }
      });
      return parts.join("\n");
    }),
  );

  return Papa.unparse({ fields: header, data: rows });
}
