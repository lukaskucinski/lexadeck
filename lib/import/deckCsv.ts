import Papa from "papaparse";
import { CardType, Gender, WordType } from "../types";
import { stripBom } from "./notion";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ImportCard {
  term: string;
  translation: string | null;
  wordType: WordType;
  gender: Gender | null;
  cardType: CardType;
  example: string | null;
  exampleEn: string | null;
  notes: string | null;
  conjugation: string | null;
  emoji: string | null;
}

export interface RowIssue {
  /** 1-based record number in the file (the header is row 1). */
  row: number;
  term: string | null;
  message: string;
}

export interface DeckCsvResult {
  cards: ImportCard[];
  issues: RowIssue[];
  /** Non-empty data rows seen (importable + skipped). */
  totalRows: number;
  /** Set when the file as a whole is unusable; cards/issues are empty. */
  headerError?: string;
}

export const MAX_IMPORT_ROWS = 2000;

/** Canonical header — also the first line of the downloadable template. */
export const TEMPLATE_HEADER =
  "Term,Translation,Word Type,Gender,Card Type,Example,Example Translation,Notes,Conjugation,Emoji";

/* ------------------------------------------------------------------ */
/* Header mapping                                                      */
/* ------------------------------------------------------------------ */

type Field = keyof ImportCard;

const HEADER_ALIASES: Record<Field, string[]> = {
  term: ["term", "word", "vocab", "vocab word", "spanish", "front"],
  translation: ["translation", "english", "meaning", "definition", "back"],
  wordType: ["word type", "wordtype", "part of speech", "pos"],
  gender: ["gender"],
  cardType: ["card type", "cardtype"],
  example: ["example", "example sentence", "sentence", "example spanish", "spanish example"],
  exampleEn: [
    "example translation",
    "example english",
    "english example",
    "example en",
    "sentence translation",
  ],
  notes: ["notes", "note", "description"],
  conjugation: ["conjugation", "conjugations"],
  emoji: ["emoji", "icon"],
};

const ALIAS_TO_FIELD = new Map<string, Field>(
  (Object.entries(HEADER_ALIASES) as [Field, string[]][]).flatMap(([field, aliases]) =>
    aliases.map((alias) => [alias, field] as const),
  ),
);

/** "Example (Spanish)" → "example spanish", "word_type" → "word type" */
const normalizeHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Match a single header label to a canonical card field (or undefined).
 *  Shared with the Anki importer so its column mapping reuses these aliases. */
export function headerToField(raw: string): keyof ImportCard | undefined {
  return ALIAS_TO_FIELD.get(normalizeHeader(raw));
}

/* ------------------------------------------------------------------ */
/* Value coercion                                                      */
/* ------------------------------------------------------------------ */

const WORD_TYPES = new Map(Object.values(WordType).map((wt) => [wt.toLowerCase(), wt]));
const CARD_TYPES = new Map(Object.values(CardType).map((ct) => [ct.toLowerCase(), ct]));

const GENDERS = new Map<string, Gender>([
  ["m", "MASCULINE"],
  ["masc", "MASCULINE"],
  ["masculine", "MASCULINE"],
  ["f", "FEMININE"],
  ["fem", "FEMININE"],
  ["feminine", "FEMININE"],
  ["n", "NEUTER"],
  ["neuter", "NEUTER"],
  ["either", "EITHER"],
  ["both", "EITHER"],
]);

function coerceWordType(raw: string): WordType | undefined {
  const lower = raw.toLowerCase();
  // accept plurals: "nouns" → "noun"
  return WORD_TYPES.get(lower) ?? WORD_TYPES.get(lower.replace(/s$/, ""));
}

const CAPS: [Field, number][] = [
  ["term", 200],
  ["translation", 500],
  ["example", 500],
  ["exampleEn", 500],
  ["notes", 5000],
  ["conjugation", 2000],
  ["emoji", 16],
];

const CAP_LABELS: Partial<Record<Field, string>> = {
  exampleEn: "Example translation",
};

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const isEmptyRow = (row: string[]) => row.every((cell) => cell.trim() === "");

export function parseDeckCsv(text: string): DeckCsvResult {
  const { data } = Papa.parse<string[]>(stripBom(text));

  const headerIndex = data.findIndex((row) => !isEmptyRow(row));
  if (headerIndex === -1) {
    return { cards: [], issues: [], totalRows: 0, headerError: "The file is empty." };
  }

  const columns = new Map<Field, number>();
  data[headerIndex].forEach((cell, i) => {
    const field = ALIAS_TO_FIELD.get(normalizeHeader(cell));
    if (field && !columns.has(field)) columns.set(field, i);
  });
  if (!columns.has("term")) {
    return {
      cards: [],
      issues: [],
      totalRows: 0,
      headerError:
        "The first row must be a column header that includes a “Term” column. Download the template for the expected format.",
    };
  }

  const dataRows = data
    .map((cells, index) => ({ cells, row: index + 1 }))
    .slice(headerIndex + 1)
    .filter(({ cells }) => !isEmptyRow(cells));

  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      cards: [],
      issues: [],
      totalRows: dataRows.length,
      headerError: `The file has ${dataRows.length} rows — the import cap is ${MAX_IMPORT_ROWS} rows per file.`,
    };
  }

  const cards: ImportCard[] = [];
  const issues: RowIssue[] = [];
  const seenTerms = new Map<string, number>(); // normalized term → first row

  for (const { cells, row } of dataRows) {
    const get = (field: Field): string | null => {
      const index = columns.get(field);
      const value = index === undefined ? "" : (cells[index] ?? "").trim();
      return value === "" ? null : value;
    };
    const fail = (term: string | null, message: string) =>
      issues.push({ row, term, message });

    const term = get("term");
    if (!term) {
      fail(null, "Term is required");
      continue;
    }

    const overCap = CAPS.find(([field, max]) => (get(field)?.length ?? 0) > max);
    if (overCap) {
      const label = CAP_LABELS[overCap[0]] ?? overCap[0][0].toUpperCase() + overCap[0].slice(1);
      fail(term, `${label} exceeds ${overCap[1]} characters`);
      continue;
    }

    const wordTypeRaw = get("wordType");
    const wordTypeIn = wordTypeRaw ? coerceWordType(wordTypeRaw) : null;
    if (wordTypeRaw && !wordTypeIn) {
      fail(term, `Unknown word type "${wordTypeRaw}"`);
      continue;
    }

    const cardTypeRaw = get("cardType");
    const cardTypeIn = cardTypeRaw ? CARD_TYPES.get(cardTypeRaw.toLowerCase()) : null;
    if (cardTypeRaw && !cardTypeIn) {
      fail(term, `Unknown card type "${cardTypeRaw}"`);
      continue;
    }

    // each classification can stand in for the other when only one is given
    const wordType =
      wordTypeIn ??
      (cardTypeIn === "GRAMMAR" ? "GRAMMAR" : cardTypeIn === "EXPRESSION" ? "EXPRESSION" : "OTHER");
    const cardType =
      cardTypeIn ??
      (wordType === "GRAMMAR" ? "GRAMMAR" : wordType === "EXPRESSION" ? "EXPRESSION" : "VOCAB");

    // gender only applies to nouns (mirrors the card form)
    let gender: Gender | null = null;
    if (wordType === "NOUN") {
      const genderRaw = get("gender");
      if (genderRaw) {
        const coerced = GENDERS.get(genderRaw.toLowerCase());
        if (!coerced) {
          fail(term, `Unknown gender "${genderRaw}"`);
          continue;
        }
        gender = coerced;
      }
    }

    const key = term.normalize("NFC").toLowerCase();
    const firstRow = seenTerms.get(key);
    if (firstRow !== undefined) {
      fail(term, `Duplicate of row ${firstRow}`);
      continue;
    }
    seenTerms.set(key, row);

    cards.push({
      term,
      translation: get("translation"),
      wordType,
      gender,
      cardType,
      example: get("example"),
      exampleEn: get("exampleEn"),
      notes: get("notes"),
      conjugation: get("conjugation"),
      emoji: get("emoji"),
    });
  }

  return { cards, issues, totalRows: dataRows.length };
}
