import { describe, expect, it } from "vitest";
import { resolveCardTap } from "./cardTap";

describe("resolveCardTap", () => {
  it("opens on a plain desktop click", () => {
    expect(resolveCardTap({ shiftKey: false, coarse: false, hasSelection: false })).toBe("open");
    expect(resolveCardTap({ shiftKey: false, coarse: false, hasSelection: true })).toBe("open");
  });

  it("toggles on shift-click (desktop)", () => {
    expect(resolveCardTap({ shiftKey: true, coarse: false, hasSelection: false })).toBe("toggle");
  });

  it("on touch, opens when nothing is selected yet", () => {
    expect(resolveCardTap({ shiftKey: false, coarse: true, hasSelection: false })).toBe("open");
  });

  it("on touch, a plain tap toggles once a selection exists (Photos-style)", () => {
    expect(resolveCardTap({ shiftKey: false, coarse: true, hasSelection: true })).toBe("toggle");
  });
});
