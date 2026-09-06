/**
 * Pure scoring for the CEFR placement quiz. Maps a learner's chosen answers to a
 * CEFR band via a difficulty-weighted score: each correct item is worth its band
 * weight (A1=1 … C2=6), and the total falls into a band by fixed cutoffs.
 *
 * Cutoffs are calibrated for a two-items-per-band, A1–C2 bank (max score 42), so
 * acing every item up to band X lands the learner exactly in band X. The result
 * only nudges one word of the enrichment prompt, so precision is intentionally
 * coarse — these thresholds are easy to retune (the tests pin them).
 */
import { CEFR_LEVELS, type CefrLevel } from "@/lib/ai/cefr";
import type { PlacementItem } from "./items";

export interface PlacementResponse {
  id: string;
  /** The index the learner picked in that item's `choices`. */
  choice: number;
}

/** Band difficulty weight: A1=1, A2=2, … C2=6. */
export function bandWeight(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level) + 1;
}

// Highest weighted score (inclusive) that still maps to each band. Trajectory for
// a 2-per-band A1–C2 bank: A2=6, B1=12, B2=20, C1=30, C2=42.
const CUTOFFS: { max: number; level: CefrLevel }[] = [
  { max: 4, level: "A1" },
  { max: 10, level: "A2" },
  { max: 18, level: "B1" },
  { max: 28, level: "B2" },
  { max: 38, level: "C1" },
];

/**
 * Score the responses against the authoritative answer key in `items`. Unknown
 * ids and unanswered items count as wrong. Returns a valid CefrLevel.
 */
export function scorePlacement(
  items: PlacementItem[],
  responses: PlacementResponse[],
): CefrLevel {
  const chosen = new Map(responses.map((r) => [r.id, r.choice]));
  let score = 0;
  for (const item of items) {
    if (chosen.get(item.id) === item.answer) score += bandWeight(item.level);
  }
  for (const { max, level } of CUTOFFS) {
    if (score <= max) return level;
  }
  return "C2";
}

/**
 * Read submitted answers from a form-field getter (the action passes
 * `formData.get`). Each item's choice lives under `q_<id>`; blank, out-of-range,
 * and unknown fields are dropped so only valid responses reach scoring.
 */
export function parsePlacementResponses(
  get: (key: string) => string | null | undefined,
  items: PlacementItem[],
): PlacementResponse[] {
  const out: PlacementResponse[] = [];
  for (const item of items) {
    const raw = get(`q_${item.id}`);
    if (raw == null || raw === "") continue;
    const choice = Number(raw);
    if (!Number.isInteger(choice) || choice < 0 || choice >= item.choices.length) continue;
    out.push({ id: item.id, choice });
  }
  return out;
}
