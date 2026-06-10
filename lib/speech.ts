/** The slice of SpeechSynthesisVoice the picker needs (pure → unit-testable). */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

const norm = (lang: string) => lang.toLowerCase().replace("_", "-");

/**
 * Concrete tag for a bare language code. Used as the utterance lang when no
 * matching voice was found — a bare "en" lets some engines fall back to the
 * system default voice (board bug: English read with a Spanish accent).
 */
const DEFAULT_REGION: Record<string, string> = { en: "en-US", es: "es-ES" };

export function defaultLangTag(lang: string): string {
  return DEFAULT_REGION[lang.toLowerCase()] ?? lang;
}

const ES_STOPWORDS = new Set(
  "el la los las un una unos unas de del al que es son en con por para se su sus lo como pero este esta estos estas hay muy y o".split(" "),
);
const EN_STOPWORDS = new Set(
  "the of to and is are was were be been it its this that these those with for from when which how what you your they them he she we who will would can not on in at an or".split(" "),
);
// orthography essentially absent from native Spanish words
const EN_PATTERNS = /th|ou|ee|oo|ss|ck|gh|ph|[wk]/;

/**
 * Decide whether text is Spanish or English so the right voice speaks it.
 * The caller's lang is per-card, but card content can be the other language
 * (board bug: grammar-card terms are English titles, read with a Spanish
 * voice). Spanish diacritics decide outright; otherwise stopwords and
 * English-only orthography vote, and a tie keeps the caller's fallback.
 */
export function detectLanguage(text: string, fallback: string): string {
  if (/[¿¡ñáéíóúü]/i.test(text)) return "es";

  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  let es = 0;
  let en = 0;
  for (const word of words) {
    if (ES_STOPWORDS.has(word)) es++;
    if (EN_STOPWORDS.has(word)) en++;
    else if (EN_PATTERNS.test(word)) en++;
  }
  if (en > es) return "en";
  if (es > en) return "es";
  return fallback;
}

/**
 * Choose the best available voice for a language.
 *
 * Spanish keeps its tuned behavior: major variants in preference order with
 * local voices first — they pronounce Spanish correctly and work offline.
 *
 * English anchors on the major variants (American, then British) and ranks
 * by naturalness within them: the legacy local SAPI voices (Microsoft
 * David/Zira) sound mechanical, so prefer "Natural"/"Neural" voices, then
 * Google's remote voices, before falling back to a local one.
 */
export function pickVoice<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
): V | undefined {
  const prefix = lang.toLowerCase();
  const matches = voices.filter((v) => norm(v.lang).startsWith(prefix));
  if (matches.length === 0) return undefined;

  if (prefix.startsWith("es")) {
    for (const target of ["es-es", "es-mx", "es-us"]) {
      const subset = matches.filter((v) => norm(v.lang) === target);
      if (subset.length) return subset.find((v) => v.localService) ?? subset[0];
    }
    return matches.find((v) => v.localService) ?? matches[0];
  }

  const score = (v: V) =>
    (/natural|neural|premium|enhanced/i.test(v.name) ? 8 : 0) +
    (/google/i.test(v.name) ? 4 : 0) +
    (v.localService ? 1 : 0);
  // stable sort: equal scores keep the platform's original voice order
  const best = (subset: readonly V[]) => [...subset].sort((a, b) => score(b) - score(a))[0];

  if (prefix.startsWith("en")) {
    for (const target of ["en-us", "en-gb"]) {
      const subset = matches.filter((v) => norm(v.lang) === target);
      if (subset.length) return best(subset);
    }
  }
  return best(matches);
}
