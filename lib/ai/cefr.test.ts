import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, cefrPromptLevel, DEFAULT_CEFR_PROMPT, isCefrLevel } from "./cefr";

describe("CEFR_LEVELS", () => {
  it("lists the six CEFR bands in ascending order", () => {
    expect([...CEFR_LEVELS]).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  });
});

describe("isCefrLevel", () => {
  it("accepts the canonical bands", () => {
    expect(isCefrLevel("A1")).toBe(true);
    expect(isCefrLevel("C2")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isCefrLevel("b1")).toBe(false); // case-sensitive canonical form
    expect(isCefrLevel("D1")).toBe(false);
    expect(isCefrLevel("")).toBe(false);
    expect(isCefrLevel(null)).toBe(false);
    expect(isCefrLevel(undefined)).toBe(false);
  });
});

describe("cefrPromptLevel", () => {
  it("uses the learner's level when known", () => {
    expect(cefrPromptLevel("B2")).toBe("B2");
    expect(cefrPromptLevel("A1")).toBe("A1");
  });
  it("falls back to the legacy default when unset or invalid (byte-identical prompt)", () => {
    expect(cefrPromptLevel(null)).toBe(DEFAULT_CEFR_PROMPT);
    expect(cefrPromptLevel(undefined)).toBe(DEFAULT_CEFR_PROMPT);
    expect(cefrPromptLevel("")).toBe(DEFAULT_CEFR_PROMPT);
    expect(DEFAULT_CEFR_PROMPT).toBe("A2/B1");
  });
});
