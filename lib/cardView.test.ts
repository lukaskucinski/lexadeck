import { describe, expect, it } from "vitest";
import type { CardRow } from "@/components/card/cardRow";
import { compareCardRows, matchesCardRow, paginateRows } from "./cardView";

/** Build a CardRow with sane defaults; spread so explicit null overrides stick. */
function row(over: Partial<CardRow> = {}): CardRow {
  return {
    id: "c1",
    deckId: "d1",
    term: "casa",
    translation: "house",
    wordType: "NOUN",
    gender: "FEMININE",
    cardType: "VOCAB",
    emoji: null,
    srs: "new",
    due: new Date("2026-06-15T00:00:00Z"),
    createdAt: new Date("2026-06-01T00:00:00Z"),
    ...over,
  };
}

describe("matchesCardRow — mirrors buildCardWhere over a CardRow", () => {
  it("no filters → matches everything", () => {
    expect(matchesCardRow(row(), {})).toBe(true);
  });

  it("q matches term OR translation, case-insensitive", () => {
    expect(matchesCardRow(row({ term: "Gato", translation: "cat" }), { q: "gat" })).toBe(true);
    expect(matchesCardRow(row({ term: "Gato", translation: "Cat" }), { q: "CAT" })).toBe(true);
    expect(matchesCardRow(row({ term: "Gato", translation: "cat" }), { q: "perro" })).toBe(false);
    // null translation is fine — just no match on that side
    expect(matchesCardRow(row({ term: "Gato", translation: null }), { q: "gat" })).toBe(true);
  });

  it("array facets constrain by membership; [] and undefined are neutral", () => {
    expect(matchesCardRow(row({ wordType: "VERB" }), { wordTypes: ["NOUN"] })).toBe(false);
    expect(matchesCardRow(row({ wordType: "VERB" }), { wordTypes: ["NOUN", "VERB"] })).toBe(true);
    expect(matchesCardRow(row({ wordType: "VERB" }), { wordTypes: [] })).toBe(true); // none = neutral
    expect(matchesCardRow(row({ srs: "due" }), { srs: ["new", "due"] })).toBe(true);
    expect(matchesCardRow(row({ srs: "mastered" }), { srs: ["new", "due"] })).toBe(false);
    expect(matchesCardRow(row({ cardType: "GRAMMAR" }), { cardTypes: ["VOCAB"] })).toBe(false);
  });

  it("a gender filter excludes a null-gender row (matches Prisma `in`)", () => {
    expect(matchesCardRow(row({ gender: null }), { genders: ["MASCULINE"] })).toBe(false);
    expect(matchesCardRow(row({ gender: "MASCULINE" }), { genders: ["MASCULINE"] })).toBe(true);
  });

  it("hasTranslation true/false constrain; 'none' is neutral", () => {
    expect(matchesCardRow(row({ translation: "x" }), { hasTranslation: true })).toBe(true);
    expect(matchesCardRow(row({ translation: null }), { hasTranslation: true })).toBe(false);
    expect(matchesCardRow(row({ translation: null }), { hasTranslation: false })).toBe(true);
    expect(matchesCardRow(row({ translation: "x" }), { hasTranslation: false })).toBe(false);
    expect(matchesCardRow(row({ translation: null }), { hasTranslation: "none" })).toBe(true);
  });

  it("deckIds constrain (library cross-deck filter)", () => {
    expect(matchesCardRow(row({ deckId: "d2" }), { deckIds: ["d1"] })).toBe(false);
    expect(matchesCardRow(row({ deckId: "d1" }), { deckIds: ["d1", "d2"] })).toBe(true);
  });

  it("multiple facets AND together", () => {
    const r = row({ wordType: "NOUN", srs: "due", translation: "house" });
    expect(matchesCardRow(r, { wordTypes: ["NOUN"], srs: ["due"], hasTranslation: true })).toBe(true);
    expect(matchesCardRow(r, { wordTypes: ["NOUN"], srs: ["new"] })).toBe(false);
  });
});

describe("compareCardRows — mirrors cardOrderBy", () => {
  const a = row({ id: "a", term: "alpha", due: new Date("2026-06-10Z"), createdAt: new Date("2026-06-01Z"), wordType: "ADJECTIVE" });
  const b = row({ id: "b", term: "beta", due: new Date("2026-06-20Z"), createdAt: new Date("2026-06-05Z"), wordType: "NOUN" });

  it("term asc/desc", () => {
    expect([b, a].sort(compareCardRows("term", "asc")).map((r) => r.id)).toEqual(["a", "b"]);
    expect([a, b].sort(compareCardRows("term", "desc")).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("createdAt is the default ordering", () => {
    expect([b, a].sort(compareCardRows("createdAt", "asc")).map((r) => r.id)).toEqual(["a", "b"]);
    expect([a, b].sort(compareCardRows("createdAt", "desc")).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("due asc", () => {
    expect([b, a].sort(compareCardRows("due", "asc")).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("wordType sorts by type then term asc (the secondary key)", () => {
    const v1 = row({ id: "v1", wordType: "VERB", term: "zebra" });
    const v2 = row({ id: "v2", wordType: "VERB", term: "ant" });
    const n1 = row({ id: "n1", wordType: "NOUN", term: "moon" });
    const out = [v1, v2, n1].sort(compareCardRows("wordType", "asc")).map((r) => r.id);
    expect(out).toEqual(["n1", "v2", "v1"]); // NOUN < VERB; within VERB: ant < zebra
  });
});

describe("paginateRows", () => {
  const rows = Array.from({ length: 130 }, (_, i) => row({ id: `c${i}` }));
  it("slices to the page window", () => {
    expect(paginateRows(rows, 1, 60).map((r) => r.id)[0]).toBe("c0");
    expect(paginateRows(rows, 1, 60)).toHaveLength(60);
    expect(paginateRows(rows, 3, 60)).toHaveLength(10);
    expect(paginateRows(rows, 3, 60)[0].id).toBe("c120");
    expect(paginateRows(rows, 99, 60)).toHaveLength(0);
  });
});
