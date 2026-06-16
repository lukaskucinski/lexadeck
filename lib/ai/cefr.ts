/**
 * CEFR proficiency levels — captured at onboarding for language learners and
 * woven into the enrichment prompt. Pure constants/helpers, no deps.
 */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** The learner level the enrichment prompt has always assumed when none is set. */
export const DEFAULT_CEFR_PROMPT = "A2/B1";

export function isCefrLevel(value: string | null | undefined): value is CefrLevel {
  return value != null && (CEFR_LEVELS as readonly string[]).includes(value);
}

/**
 * The level phrase for the enrichment prompt: the learner's band when known,
 * else the legacy "A2/B1" — so an unset level keeps the prompt byte-identical.
 */
export function cefrPromptLevel(level: string | null | undefined): string {
  return isCefrLevel(level) ? level : DEFAULT_CEFR_PROMPT;
}
