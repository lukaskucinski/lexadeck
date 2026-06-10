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
