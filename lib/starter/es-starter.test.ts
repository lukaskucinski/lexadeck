import { describe, expect, it, vi } from "vitest";

// es-starter.ts imports prisma at module load; stub it so the pure-data test
// doesn't instantiate a client.
vi.mock("@/lib/db", () => ({ prisma: {} }));

import { Gender, WordType } from "@/lib/types";
import { ES_STARTER_CARDS } from "./es-starter";

describe("ES_STARTER_CARDS", () => {
  it("is a small beginner set with a term + translation on every card", () => {
    expect(ES_STARTER_CARDS.length).toBeGreaterThanOrEqual(8);
    for (const c of ES_STARTER_CARDS) {
      expect(c.term.trim().length).toBeGreaterThan(0);
      expect(c.translation.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses only valid wordType and gender values", () => {
    const types = new Set<string>(Object.values(WordType));
    const genders = new Set<string>(Object.values(Gender));
    for (const c of ES_STARTER_CARDS) {
      expect(types.has(c.wordType)).toBe(true);
      if (c.gender) expect(genders.has(c.gender)).toBe(true);
    }
  });

  it("has no duplicate terms", () => {
    const terms = ES_STARTER_CARDS.map((c) => c.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
});
