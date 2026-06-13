/**
 * The AI "detail layer" stored in Card.details (a JSON column) and rendered as
 * labeled specimen sections on the card page. Kept separate from the scalar
 * card columns (translation, example, conjugation, …) because these fields are
 * display-only — never queried or filtered — so one JSON column beats a column
 * per field. Always read through getCardDetails (legacy rows are null).
 */
import type { EnrichmentItem } from "./ai/enrichment";

// A `type` (not `interface`) so TS gives it an implicit index signature and it
// stays assignable to Prisma's Json input type at the write sites.
export type CardDetails = {
  usagePattern?: string;
  collocations?: string[];
  etymology?: string;
  wordFamily?: string[];
  /** Non-destructive "did you mean…?" flag; cleared when term/translation changes. */
  correction?: string;
};

/** What previewEnrichment returns to the new-card form for review before saving. */
export interface EnrichmentPreview {
  translation: string | null;
  wordType: string;
  gender: string | null;
  example: string;
  exampleEn: string;
  emoji: string;
  conjugation: string;
  details: CardDetails;
  correction: string;
}

/** Build the persisted detail object from a normalized enrichment — only non-empty fields. */
export function detailsFromEnrichment(item: EnrichmentItem): CardDetails {
  const d: CardDetails = {};
  if (item.usagePattern) d.usagePattern = item.usagePattern;
  if (item.collocations.length) d.collocations = item.collocations;
  if (item.etymology) d.etymology = item.etymology;
  if (item.wordFamily.length) d.wordFamily = item.wordFamily;
  if (item.correction) d.correction = item.correction;
  return d;
}

/** Read the JSON column defensively — tolerates null and malformed legacy values. */
export function getCardDetails(raw: unknown): CardDetails {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: CardDetails = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  if (str(r.usagePattern)) out.usagePattern = str(r.usagePattern);
  if (list(r.collocations).length) out.collocations = list(r.collocations);
  if (str(r.etymology)) out.etymology = str(r.etymology);
  if (list(r.wordFamily).length) out.wordFamily = list(r.wordFamily);
  if (str(r.correction)) out.correction = str(r.correction);
  return out;
}

/** Drop the spelling flag (term/translation changed, so it no longer applies). */
export function withoutCorrection(raw: unknown): CardDetails {
  const details = getCardDetails(raw); // fresh object — safe to mutate
  delete details.correction;
  return details;
}
