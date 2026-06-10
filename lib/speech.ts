/** The slice of SpeechSynthesisVoice the picker needs (pure → unit-testable). */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

const norm = (lang: string) => lang.toLowerCase().replace("_", "-");

/**
 * Choose the best available voice for a language.
 *
 * Spanish keeps its tuned behavior: major variants in preference order with
 * local voices first — they pronounce Spanish correctly and work offline.
 *
 * Everything else (notably English) ranks by naturalness instead: the legacy
 * local SAPI voices (Microsoft David/Zira) sound mechanical, so prefer
 * "Natural"/"Neural" voices, then Google's remote voices, before falling back
 * to a local one.
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
  return [...matches].sort((a, b) => score(b) - score(a))[0];
}
