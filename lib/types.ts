export const CardType = {
  VOCAB: "VOCAB",
  GRAMMAR: "GRAMMAR",
  EXPRESSION: "EXPRESSION",
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

export const WordType = {
  NOUN: "NOUN",
  VERB: "VERB",
  ADJECTIVE: "ADJECTIVE",
  ADVERB: "ADVERB",
  PRONOUN: "PRONOUN",
  ARTICLE: "ARTICLE", // also covers conjunctions + prepositions in the Notion data
  CONJUNCTION: "CONJUNCTION",
  PREPOSITION: "PREPOSITION",
  EXPRESSION: "EXPRESSION",
  GRAMMAR: "GRAMMAR",
  OTHER: "OTHER",
} as const;
export type WordType = (typeof WordType)[keyof typeof WordType];

export const Gender = {
  MASCULINE: "MASCULINE",
  FEMININE: "FEMININE",
  NEUTER: "NEUTER",
  EITHER: "EITHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const WORD_TYPE_LABELS: Record<WordType, string> = {
  NOUN: "Noun",
  VERB: "Verb",
  ADJECTIVE: "Adjective",
  ADVERB: "Adverb",
  PRONOUN: "Pronoun",
  ARTICLE: "Article",
  CONJUNCTION: "Conjunction",
  PREPOSITION: "Preposition",
  EXPRESSION: "Expression",
  GRAMMAR: "Grammar",
  OTHER: "Other",
};

/** Display-level SRS state derived from FSRS card state + schedule. */
export type SRSState = "new" | "learning" | "due" | "scheduled" | "mastered";

export const SRS_STATE_LABELS: Record<SRSState, string> = {
  new: "New",
  learning: "Learning",
  due: "Due",
  scheduled: "Scheduled",
  mastered: "Mastered",
};
