/**
 * Tactile feedback. `shouldVibrate` is pure (unit-tested); `tap()` is the thin DOM
 * wrapper that reads the environment and fires the Vibration API. Gated to touch
 * devices that support it, and silenced under prefers-reduced-motion.
 */

export interface HapticEnv {
  hasVibrate: boolean;
  coarsePointer: boolean;
  reducedMotion: boolean;
}

export function shouldVibrate(env: HapticEnv): boolean {
  return env.hasVibrate && env.coarsePointer && !env.reducedMotion;
}

/** A short tactile tap for primary touch actions (e.g. study rating buttons). No-op on desktop/SSR. */
export function tap(pattern: number | number[] = 8): void {
  if (typeof navigator === "undefined" || typeof matchMedia === "undefined") return;
  const env: HapticEnv = {
    hasVibrate: typeof navigator.vibrate === "function",
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  if (shouldVibrate(env)) navigator.vibrate(pattern);
}
