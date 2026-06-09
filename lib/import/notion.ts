import Papa from "papaparse";
import type { CardType, Gender, WordType } from "../types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface NotionCsvRow {
  "Vocab Word": string;
  Audio: string;
  Conjugation: string;
  Description: string;
  "Last Review": string;
  "Next Review": string;
  Resource: string;
  Stage: string;
}

export interface ParsedCard {
  term: string;
  translation: string | null;
  wordType: WordType;
  gender: Gender | null;
  cardType: CardType;
  notes: string | null;
  conjugation: string | null;
}

export interface ImportReport {
  csvRows: number;
  imported: number;
  duplicatesMerged: number;
  unknownStages: string[];
  byWordType: Record<string, number>;
  withTranslation: number;
  mdFilesParsed: number;
  mdAnswersFound: number;
  mdAnswersMatched: number;
}

export interface ImportResult {
  cards: ParsedCard[];
  report: ImportReport;
}

/* ------------------------------------------------------------------ */
/* Stage mapping (spec §10)                                            */
/* ------------------------------------------------------------------ */

interface StageMapping {
  wordType: WordType;
  gender: Gender | null;
  cardType: CardType;
}

const STAGE_MAPPING: Record<string, StageMapping> = {
  verbs: { wordType: "VERB", gender: null, cardType: "VOCAB" },
  "nouns (male)": { wordType: "NOUN", gender: "MASCULINE", cardType: "VOCAB" },
  "nouns female": { wordType: "NOUN", gender: "FEMININE", cardType: "VOCAB" },
  "nouns (either)": { wordType: "NOUN", gender: "EITHER", cardType: "VOCAB" },
  adjectives: { wordType: "ADJECTIVE", gender: null, cardType: "VOCAB" },
  adverbs: { wordType: "ADVERB", gender: null, cardType: "VOCAB" },
  pronouns: { wordType: "PRONOUN", gender: null, cardType: "VOCAB" },
  "articles conjunctions prepositions": {
    wordType: "ARTICLE",
    gender: null,
    cardType: "VOCAB",
  },
  expressions: { wordType: "EXPRESSION", gender: null, cardType: "EXPRESSION" },
  "grammar rules": { wordType: "GRAMMAR", gender: null, cardType: "GRAMMAR" },
};

const UNKNOWN_STAGE: StageMapping = {
  wordType: "OTHER",
  gender: null,
  cardType: "VOCAB",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Join key for (term, stage) — NFC-normalized, trimmed, case-insensitive. */
export function joinKey(term: string, stage: string): string {
  const norm = (s: string) => s.normalize("NFC").trim().toLowerCase();
  return `${norm(term)}||${norm(stage)}`;
}

/* ------------------------------------------------------------------ */
/* Markdown page parsing                                               */
/* ------------------------------------------------------------------ */

export interface MdEntry {
  term: string;
  stage: string;
  answer: string | null;
}

/**
 * Notion page export shape:
 *   # <Term>
 *   ...
 *   Stage: <stage>
 *   ...
 *   - Answer: <translation>
 * Filenames are truncated, so the H1 inside the file is authoritative.
 */
export function parseMdFile(content: string): MdEntry | null {
  const text = stripBom(content);

  const h1 = text.match(/^#\s+(.+)$/m);
  if (!h1) return null;
  const term = h1[1].trim();

  const stageMatch = text.match(/^Stage:\s*(.+)$/m);
  const stage = stageMatch ? stageMatch[1].trim() : "";

  const answerMatch = text.match(/^-\s+Answer:\s*(.*)$/m);
  const answer = answerMatch ? answerMatch[1].trim() : "";

  return { term, stage, answer: answer.length > 0 ? answer : null };
}

export function buildTranslationMap(mdContents: string[]): {
  map: Map<string, string>;
  parsed: number;
  answers: number;
} {
  const map = new Map<string, string>();
  let parsed = 0;
  let answers = 0;

  for (const content of mdContents) {
    const entry = parseMdFile(content);
    if (!entry) continue;
    parsed++;
    if (!entry.answer) continue;
    answers++;
    const key = joinKey(entry.term, entry.stage);
    if (!map.has(key)) map.set(key, entry.answer);
  }

  return { map, parsed, answers };
}

/* ------------------------------------------------------------------ */
/* CSV parsing + assembly                                              */
/* ------------------------------------------------------------------ */

function cleanField(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Merge a duplicate row into an existing card, filling gaps only. */
function mergeInto(card: ParsedCard, dupe: ParsedCard): void {
  card.translation ??= dupe.translation;
  card.notes ??= dupe.notes;
  card.conjugation ??= dupe.conjugation;
}

export function parseNotionExport(input: {
  csvText: string;
  mdContents: string[];
}): ImportResult {
  const translations = buildTranslationMap(input.mdContents);

  const { data } = Papa.parse<NotionCsvRow>(stripBom(input.csvText), {
    header: true,
    skipEmptyLines: true,
  });

  const seen = new Map<string, ParsedCard>();
  const unknownStages = new Set<string>();
  let duplicatesMerged = 0;
  let mdAnswersMatched = 0;

  for (const row of data) {
    const term = cleanField(row["Vocab Word"]);
    if (!term) continue;

    const stage = row.Stage?.trim() ?? "";
    const mapping = STAGE_MAPPING[stage.toLowerCase()] ?? UNKNOWN_STAGE;
    if (!(stage.toLowerCase() in STAGE_MAPPING) && stage) {
      unknownStages.add(stage);
    }

    const key = joinKey(term, stage);
    const translation =
      mapping.wordType === "GRAMMAR"
        ? null // grammar rules: the description IS the content
        : (translations.map.get(key) ?? null);

    const card: ParsedCard = {
      term,
      translation,
      wordType: mapping.wordType,
      gender: mapping.gender,
      cardType: mapping.cardType,
      notes: cleanField(row.Description),
      conjugation: cleanField(row.Conjugation),
    };

    const existing = seen.get(key);
    if (existing) {
      duplicatesMerged++;
      mergeInto(existing, card);
    } else {
      if (translation) mdAnswersMatched++;
      seen.set(key, card);
    }
  }

  const cards = [...seen.values()];
  const byWordType: Record<string, number> = {};
  for (const card of cards) {
    byWordType[card.wordType] = (byWordType[card.wordType] ?? 0) + 1;
  }

  return {
    cards,
    report: {
      csvRows: data.length,
      imported: cards.length,
      duplicatesMerged,
      unknownStages: [...unknownStages],
      byWordType,
      withTranslation: cards.filter((c) => c.translation).length,
      mdFilesParsed: translations.parsed,
      mdAnswersFound: translations.answers,
      mdAnswersMatched,
    },
  };
}
