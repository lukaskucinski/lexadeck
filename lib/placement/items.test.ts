import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "@/lib/ai/cefr";
import { ES_PLACEMENT_ITEMS, getPlacementItems, hasPlacementTest } from "./items";

describe("ES_PLACEMENT_ITEMS", () => {
  it("covers every CEFR band with at least two items", () => {
    for (const level of CEFR_LEVELS) {
      const count = ES_PLACEMENT_ITEMS.filter((i) => i.level === level).length;
      expect(count, `band ${level}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses only valid CEFR levels", () => {
    const valid = new Set<string>(CEFR_LEVELS);
    for (const item of ES_PLACEMENT_ITEMS) {
      expect(valid.has(item.level), item.id).toBe(true);
    }
  });

  it("has a correct-answer index that points at a real choice", () => {
    for (const item of ES_PLACEMENT_ITEMS) {
      expect(item.choices.length, item.id).toBeGreaterThanOrEqual(3);
      expect(item.choices.length, item.id).toBeLessThanOrEqual(4);
      expect(Number.isInteger(item.answer), item.id).toBe(true);
      expect(item.answer, item.id).toBeGreaterThanOrEqual(0);
      expect(item.answer, item.id).toBeLessThan(item.choices.length);
    }
  });

  it("has non-empty prompts and distinct choices on every item", () => {
    for (const item of ES_PLACEMENT_ITEMS) {
      expect(item.prompt.trim().length, item.id).toBeGreaterThan(0);
      expect(item.promptEn.trim().length, item.id).toBeGreaterThan(0);
      expect(new Set(item.choices).size, item.id).toBe(item.choices.length);
    }
  });

  it("has unique ids", () => {
    const ids = ES_PLACEMENT_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("placement registry", () => {
  it("offers a test for Spanish only (for now)", () => {
    expect(hasPlacementTest("es")).toBe(true);
    expect(hasPlacementTest("ja")).toBe(false);
    expect(hasPlacementTest("de")).toBe(false);
    expect(hasPlacementTest("en")).toBe(false);
    expect(hasPlacementTest(null)).toBe(false);
    expect(hasPlacementTest(undefined)).toBe(false);
  });

  it("returns the Spanish bank and null for everything else", () => {
    expect(getPlacementItems("es")).toBe(ES_PLACEMENT_ITEMS);
    expect(getPlacementItems("ja")).toBeNull();
    expect(getPlacementItems("")).toBeNull();
  });
});
