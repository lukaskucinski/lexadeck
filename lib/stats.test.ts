import { beforeEach, describe, expect, it, vi } from "vitest";

// getSRSDistribution issues a single $queryRaw; stub the db so importing
// lib/stats.ts doesn't instantiate a Prisma client. (Prisma.sql/Prisma.empty
// used for the optional deckId filter come from the real generated client,
// which is pure and touches no DB.)
vi.mock("./db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { prisma } from "./db";
import { getProgressTotals, getSRSDistribution } from "./stats";

describe("getSRSDistribution", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps the single aggregate row to the 5 states in canonical order", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { new: 3, learning: 1, due: 7, scheduled: 12, mastered: 40 },
    ] as never);

    const out = await getSRSDistribution("u1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { state: "new", count: 3 },
      { state: "learning", count: 1 },
      { state: "due", count: 7 },
      { state: "scheduled", count: 12 },
      { state: "mastered", count: 40 },
    ]);
  });

  it("coerces raw pg counts to numbers and accepts an optional deckId", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        new: "3" as unknown as number,
        learning: BigInt(0) as unknown as number,
        due: 0,
        scheduled: 0,
        mastered: 0,
      },
    ] as never);

    const out = await getSRSDistribution("u1", "deck-1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(out[0]).toEqual({ state: "new", count: 3 });
    expect(out[1]).toEqual({ state: "learning", count: 0 });
    expect(typeof out[0].count).toBe("number");
  });
});

describe("getProgressTotals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps the single totals row in one query", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { totalReviews: 1234, totalSessions: 56 },
    ] as never);

    const out = await getProgressTotals("u1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ totalReviews: 1234, totalSessions: 56 });
  });

  it("coerces raw pg counts to numbers", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        totalReviews: "5" as unknown as number,
        totalSessions: BigInt(0) as unknown as number,
      },
    ] as never);

    expect(await getProgressTotals("u1")).toEqual({ totalReviews: 5, totalSessions: 0 });
  });
});
