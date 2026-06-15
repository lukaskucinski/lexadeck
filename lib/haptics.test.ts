import { describe, expect, it } from "vitest";
import { shouldVibrate } from "./haptics";

describe("shouldVibrate", () => {
  const base = { hasVibrate: true, coarsePointer: true, reducedMotion: false };

  it("vibrates only on a touch device that supports it, with motion not reduced", () => {
    expect(shouldVibrate(base)).toBe(true);
  });
  it("never without Vibration API support (most desktops, iOS Safari)", () => {
    expect(shouldVibrate({ ...base, hasVibrate: false })).toBe(false);
  });
  it("never on a fine pointer (desktop mouse) — avoids spurious buzzes", () => {
    expect(shouldVibrate({ ...base, coarsePointer: false })).toBe(false);
  });
  it("respects prefers-reduced-motion", () => {
    expect(shouldVibrate({ ...base, reducedMotion: true })).toBe(false);
  });
});
