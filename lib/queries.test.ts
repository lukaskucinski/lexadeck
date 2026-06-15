import { beforeEach, describe, expect, it, vi } from "vitest";

// buildCardWhere/parseCardViewParams are pure; stub the db so importing
// lib/queries.ts doesn't instantiate a Prisma client. getDeckSummaries now
// issues a single $queryRaw, so the stub exposes it as a mock.
vi.mock("./db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { prisma } from "./db";
import {
  buildCardWhere,
  getDeckSummaries,
  mapDeckSummaryRows,
  parseCardViewParams,
} from "./queries";

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

describe("mapDeckSummaryRows", () => {
  it("passes a fully-formed aggregate row through as a DeckSummary", () => {
    const out = mapDeckSummaryRows([
      {
        id: "d1", name: "Español", language: "es", subject: "languages",
        description: null, accentColor: null,
        cardCount: 1011, readyCount: 12, masteredCount: 40,
        lastStudied: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);
    expect(out[0]).toEqual({
      id: "d1", name: "Español", language: "es", subject: "languages",
      description: null, accentColor: null,
      cardCount: 1011, readyCount: 12, masteredCount: 40,
      lastStudied: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("coerces raw pg counts (bigint/string) to numbers and keeps null lastStudied", () => {
    const out = mapDeckSummaryRows([
      {
        id: "d2", name: "日本語", language: "ja", subject: "medicine",
        description: "test", accentColor: "#FF6B5C",
        // pg can hand back bigints/strings for aggregate columns
        cardCount: BigInt(9) as unknown as number,
        readyCount: "3" as unknown as number,
        masteredCount: 0,
        lastStudied: null,
      },
    ]);
    expect(out[0].cardCount).toBe(9);
    expect(out[0].readyCount).toBe(3);
    expect(typeof out[0].readyCount).toBe("number");
    expect(out[0].lastStudied).toBeNull();
  });
});

describe("getDeckSummaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("issues exactly one aggregate query and maps the rows", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        id: "d1", name: "Español", language: "es", subject: "languages",
        description: null, accentColor: null,
        cardCount: 5, readyCount: 2, masteredCount: 1,
        lastStudied: new Date("2026-06-10T00:00:00.000Z"),
      },
    ] as never);

    const out = await getDeckSummaries("u1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "d1", cardCount: 5, readyCount: 2, masteredCount: 1 });
  });

  it("returns [] for a user with no decks", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never);
    expect(await getDeckSummaries("u1")).toEqual([]);
  });
});
