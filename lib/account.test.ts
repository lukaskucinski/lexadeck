import { describe, expect, it } from "vitest";
import { confirmationMatches } from "./account";

describe("confirmationMatches", () => {
  it("matches the account email, case-insensitively and ignoring surrounding whitespace", () => {
    expect(confirmationMatches("kucinski.gis@gmail.com", "kucinski.gis@gmail.com")).toBe(true);
    expect(confirmationMatches("  KUCINSKI.GIS@Gmail.com ", "kucinski.gis@gmail.com")).toBe(true);
  });

  it("rejects a non-matching, empty, or whitespace-only input", () => {
    expect(confirmationMatches("", "a@b.com")).toBe(false);
    expect(confirmationMatches("   ", "a@b.com")).toBe(false);
    expect(confirmationMatches("a@b.com", "c@d.com")).toBe(false);
  });

  it("rejects when the account email is missing (never matches a blank target)", () => {
    expect(confirmationMatches("a@b.com", "")).toBe(false);
    expect(confirmationMatches("", "")).toBe(false);
    expect(confirmationMatches(null, null)).toBe(false);
  });
});
