/**
 * Per-language enrichment profiles. The enrichment stack (translation direction,
 * the Gemini prompt, gender handling, pronunciation reading, and the inline
 * conjugation summary) is parameterized by the deck's `language` through these
 * profiles instead of being hard-wired to Spanish.
 *
 * Coverage is an explicit allowlist: only languages with a profile here are
 * enrichable (isEnrichable). Adding a language is a single registry entry.
 * Structured "all tenses" conjugation tables (conjugation.table) are Spanish-only
 * in Phase 1; Japanese/German tables arrive in Phase 2 (lib/conjugation).
 */
import type { Gender } from "../types";

export interface GenderRule {
  /** Does this language mark grammatical gender on nouns? */
  enabled: boolean;
  /** Allowed Gender values — used for validation and prompt phrasing. */
  values: Gender[];
  /** Prompt phrasing, e.g. "one of MASCULINE, FEMININE, NEUTER, EITHER". */
  promptNote: string;
}

export interface ReadingRule {
  /** Does this language need a pronunciation reading (e.g. Japanese kana/romaji)? */
  enabled: boolean;
  /** Prompt phrasing describing the reading to produce. "" when disabled. */
  promptNote: string;
}

export interface ConjugationCapability {
  /**
   * A structured "show all tenses" table is available for this language.
   * Phase 1: Spanish only. Phase 2 flips Japanese/German on once their specs
   * land in lib/conjugation.
   */
  table: boolean;
  /** Prompt phrasing for the inline `conjugation` summary string on verb cards. */
  summaryNote: string;
}

export interface LanguageProfile {
  /** ISO 639-1 code, lower-case. */
  code: string;
  /** Human name used in prompts, e.g. "Spanish". */
  name: string;
  /** Azure Translator direction (always → English). */
  azure: { from: string; to: string };
  /** DeepL fallback direction, when configured. */
  deepl?: { source: string; target: string };
  gender: GenderRule;
  reading: ReadingRule;
  conjugation: ConjugationCapability;
  /** Example for the usagePattern field, woven into the prompt. "" to omit. */
  usagePatternNote: string;
  /** Worked example for the synonyms field, woven into the prompt. */
  synonymExample: string;
}

const ES: LanguageProfile = {
  code: "es",
  name: "Spanish",
  azure: { from: "es", to: "en" },
  deepl: { source: "ES", target: "EN-US" },
  gender: {
    enabled: true,
    values: ["MASCULINE", "FEMININE", "NEUTER", "EITHER"],
    promptNote: "one of MASCULINE, FEMININE, NEUTER, EITHER",
  },
  reading: { enabled: false, promptNote: "" },
  conjugation: {
    table: true,
    summaryNote:
      "a compact present-tense summary with yo/tú/él/nosotros/ellos forms on separate lines, noting any key irregular forms",
  },
  usagePatternNote: '"gozar de + noun" or "soñar con algo"',
  synonymExample:
    'e.g. for "gozar": [{"es":"disfrutar","en":"to enjoy"},{"es":"deleitarse","en":"to delight in"}]',
};

const JA: LanguageProfile = {
  code: "ja",
  name: "Japanese",
  azure: { from: "ja", to: "en" },
  deepl: { source: "JA", target: "EN-US" },
  gender: { enabled: false, values: [], promptNote: "" },
  reading: {
    enabled: true,
    promptNote:
      'the kana reading of the term followed by romaji in parentheses, e.g. "いぬ (inu)" or "食べる → たべる (taberu)"',
  },
  conjugation: {
    table: true,
    summaryNote:
      "a compact summary of the key forms: dictionary/plain, polite (-masu), past, te-form, and negative",
  },
  usagePatternNote: 'particle frames the term takes, e.g. "～を待つ" or "～に行く"',
  synonymExample: 'each as {"es":"<the Japanese synonym>","en":"<its English gloss>"}',
};

const DE: LanguageProfile = {
  code: "de",
  name: "German",
  azure: { from: "de", to: "en" },
  deepl: { source: "DE", target: "EN-US" },
  gender: {
    enabled: true,
    values: ["MASCULINE", "FEMININE", "NEUTER"],
    promptNote: "one of MASCULINE (der), FEMININE (die), NEUTER (das)",
  },
  reading: { enabled: false, promptNote: "" },
  conjugation: {
    table: true,
    summaryNote:
      "a compact present-tense summary with ich/du/er/wir/ihr/sie forms, noting any separable prefix and key irregulars",
  },
  usagePatternNote: '"warten auf + accusative" or "denken an + accusative"',
  synonymExample: 'each as {"es":"<the German synonym>","en":"<its English gloss>"}',
};

const PROFILES: Record<string, LanguageProfile> = { es: ES, ja: JA, de: DE };

/** Tuned language codes that support enrichment. */
export const ENRICHABLE_LANGUAGES: readonly string[] = Object.keys(PROFILES);

/** The default profile used when a caller doesn't pass one (keeps Spanish behavior). */
export const DEFAULT_PROFILE = ES;

function key(code: string | null | undefined): string {
  return (code ?? "").trim().toLowerCase();
}

/** The profile for a language code, or null if it isn't an enrichable language. */
export function getLanguageProfile(code: string | null | undefined): LanguageProfile | null {
  return PROFILES[key(code)] ?? null;
}

/** True when a language has a tuned profile (and so can be enriched). */
export function isEnrichable(code: string | null | undefined): boolean {
  return key(code) in PROFILES;
}
