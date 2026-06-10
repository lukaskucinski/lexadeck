import { describe, expect, it } from "vitest";
import {
  emptySchedulerFields,
  formatDueIn,
  getSRSState,
  previewIntervals,
  Rating,
} from "./srs";
import {
  interleaveQueue,
  MAX_NEW_PER_SESSION,
  MAX_SESSION_SIZE,
  sessionCounts,
} from "./study";

describe("sessionCounts", () => {
  it("passes small counts through untouched", () => {
    expect(sessionCounts(5, 3)).toEqual({ due: 5, fresh: 3, total: 8 });
  });

  it("caps new cards at MAX_NEW_PER_SESSION (the '(50)' vs 10-card bug)", () => {
    // a fresh deck: hundreds of new cards, nothing learned yet
    expect(sessionCounts(0, 900)).toEqual({
      due: 0,
      fresh: MAX_NEW_PER_SESSION,
      total: MAX_NEW_PER_SESSION,
    });
  });

  it("caps due cards at MAX_SESSION_SIZE", () => {
    expect(sessionCounts(200, 0)).toEqual({
      due: MAX_SESSION_SIZE,
      fresh: 0,
      total: MAX_SESSION_SIZE,
    });
  });

  it("squeezes the new budget when due cards near the session cap", () => {
    expect(sessionCounts(45, 20)).toEqual({ due: 45, fresh: 5, total: 50 });
    expect(sessionCounts(50, 20)).toEqual({ due: 50, fresh: 0, total: 50 });
  });

  it("never returns negative numbers", () => {
    expect(sessionCounts(0, 0)).toEqual({ due: 0, fresh: 0, total: 0 });
  });
});

describe("previewIntervals", () => {
  it("orders intervals Again <= Hard <= Good <= Easy", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const ms = previewIntervals(emptySchedulerFields(now), now);
    expect(ms[Rating.Again]).toBeLessThanOrEqual(ms[Rating.Hard]);
    expect(ms[Rating.Hard]).toBeLessThanOrEqual(ms[Rating.Good]);
    expect(ms[Rating.Good]).toBeLessThanOrEqual(ms[Rating.Easy]);
  });

  it("keeps Again within the short-term learning window for a new card", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const ms = previewIntervals(emptySchedulerFields(now), now);
    expect(ms[Rating.Again]).toBeLessThan(60 * 60_000);
    // Easy graduates immediately to a multi-day interval
    expect(ms[Rating.Easy]).toBeGreaterThan(12 * 60 * 60_000);
  });
});

describe("formatDueIn", () => {
  it("formats each magnitude compactly", () => {
    expect(formatDueIn(10_000)).toBe("<1m");
    expect(formatDueIn(8 * 60_000)).toBe("8m");
    expect(formatDueIn(3 * 3_600_000)).toBe("3h");
    expect(formatDueIn(12 * 86_400_000)).toBe("12d");
    expect(formatDueIn(120 * 86_400_000)).toBe("4mo");
    expect(formatDueIn(548 * 86_400_000)).toBe("1.5y");
  });
});

describe("manual mastered override", () => {
  it("masteredAt wins over any FSRS-derived state", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const newCard = { state: 0, due: now, stability: 0 };
    expect(getSRSState(newCard, now)).toBe("new");
    expect(getSRSState({ ...newCard, masteredAt: now }, now)).toBe("mastered");
    // and a due review card
    expect(
      getSRSState({ state: 2, due: now, stability: 5, masteredAt: now }, now),
    ).toBe("mastered");
  });
});

describe("interleaveQueue", () => {
  it("spreads new cards among due cards instead of appending", () => {
    const due = ["d1", "d2", "d3", "d4"];
    const fresh = ["n1", "n2"];
    const queue = interleaveQueue(due, fresh);
    expect(queue).toHaveLength(6);
    expect(queue.filter((c) => c.startsWith("n"))).toEqual(["n1", "n2"]);
    // not a trailing block
    expect(queue.slice(-2)).not.toEqual(["n1", "n2"]);
  });
});
