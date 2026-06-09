import type { SRSState, WordType } from "./types";

/**
 * Word type → semantic color token. Values are CSS custom property names
 * defined in globals.css, usable as `var(--c-blue)` or via Tailwind
 * utilities like `bg-blue` / `text-blue`.
 */
export const WORD_TYPE_COLOR: Record<WordType, string> = {
  VERB: "blue",
  NOUN: "coral",
  ADJECTIVE: "purple",
  ADVERB: "teal",
  PRONOUN: "amber",
  ARTICLE: "green",
  CONJUNCTION: "green",
  PREPOSITION: "green",
  EXPRESSION: "pink",
  GRAMMAR: "lavender",
  OTHER: "muted",
};

export const SRS_STATE_COLOR: Record<SRSState, string> = {
  new: "blue",
  learning: "amber",
  due: "coral",
  scheduled: "green",
  mastered: "teal",
};

export function wordTypeVar(wordType: WordType): string {
  return `var(--c-${WORD_TYPE_COLOR[wordType]})`;
}

export function srsStateVar(state: SRSState): string {
  return `var(--c-${SRS_STATE_COLOR[state]})`;
}
