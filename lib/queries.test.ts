import { describe, expect, it, vi } from "vitest";

// buildCardWhere/parseCardViewParams are pure; stub the db so importing
// lib/queries.ts doesn't instantiate a Prisma client
vi.mock("./db", () => ({ prisma: {} }));

import { buildCardWhere, parseCardViewParams } from "./queries";

describe("parseCardViewParams facet parsing", () => {
  it("absent params mean no constraint (undefined)", () => {
    const { filters } = parseCardViewParams({});
    expect(filters.wordTypes).toBeUndefined();
    expect(filters.srs).toBeUndefined();
    expect(filters.hasTranslation).toBeUndefined();
  });

  it("CSV params parse to value arrays", () => {
    const { filters } = parseCardViewParams({ types: "NOUN,VERB", ht: "yes" });
    expect(filters.wordTypes).toEqual(["NOUN", "VERB"]);
    expect(filters.hasTranslation).toBe(true);
  });

  it('"none" parses to an empty array / "none" sentinel', () => {
    const { filters } = parseCardViewParams({ types: "none", srs: "none", ht: "none" });
    expect(filters.wordTypes).toEqual([]);
    expect(filters.srs).toEqual([]);
    expect(filters.hasTranslation).toBe("none");
  });
});

describe("parseCardViewParams sort/dir", () => {
  it("defaults to recently-added (createdAt desc) with no params", () => {
    const vp = parseCardViewParams({});
    expect(vp.sort).toBe("createdAt");
    expect(vp.dir).toBe("desc");
  });

  it("honors an explicit sort + direction", () => {
    const vp = parseCardViewParams({ sort: "term", dir: "asc" });
    expect(vp.sort).toBe("term");
    expect(vp.dir).toBe("asc");
  });

  it("falls back to createdAt for an unknown sort key", () => {
    expect(parseCardViewParams({ sort: "bogus" }).sort).toBe("createdAt");
  });
});

describe("buildCardWhere", () => {
  it("no filters → empty where (everything matches)", () => {
    expect(buildCardWhere({})).toEqual({});
  });

  it("a value subset constrains with `in`", () => {
    const where = buildCardWhere({ wordTypes: ["NOUN"] });
    expect(where.wordType).toEqual({ in: ["NOUN"] });
  });

  // "Uncheck all" leaves every facet at "none"; a facet the user hasn't
  // rebuilt yet must not blank the whole view (board bug: Noun + Masculine
  // showed nothing because SRS state was still all-unchecked)
  it("an all-unchecked facet adds no constraint", () => {
    expect(buildCardWhere({ wordTypes: [] })).toEqual({});
    expect(buildCardWhere({ srs: [] })).toEqual({});
    expect(buildCardWhere({ hasTranslation: "none" })).toEqual({});
  });

  it("subsets still apply when other facets are all-unchecked", () => {
    const where = buildCardWhere({ wordTypes: ["NOUN"], genders: ["MASCULINE"], srs: [] });
    expect(where.wordType).toEqual({ in: ["NOUN"] });
    expect(where.gender).toEqual({ in: ["MASCULINE"] });
    expect(where.AND).toBeUndefined();
  });

  it("SRS states combine as an OR of state conditions", () => {
    const where = buildCardWhere({ srs: ["new", "mastered"] });
    const and = where.AND as { OR: unknown[] }[];
    expect(and).toHaveLength(1);
    expect(and[0].OR).toHaveLength(2);
  });

  it("hasTranslation true/false map to null checks", () => {
    expect(buildCardWhere({ hasTranslation: true }).translation).toEqual({ not: null });
    expect(buildCardWhere({ hasTranslation: false }).translation).toBeNull();
  });
});
