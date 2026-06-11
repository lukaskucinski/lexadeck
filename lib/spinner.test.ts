import { describe, expect, it } from "vitest";
import { resolveSubjectWord, SPINNER_WORDS, spinTimeline } from "./spinner";

describe("SPINNER_WORDS", () => {
  it("rotates through the use-case domains in order", () => {
    expect(SPINNER_WORDS).toEqual([
      "languages",
      "medicine",
      "exams",
      "science",
      "law",
      "history",
      "coding",
      "geography",
      "music",
    ]);
  });
});

describe("spinTimeline", () => {
  const words = ["languages", "medicine", "law", "geography", "music"];

  it("plays each word exactly once, in order, then settles", () => {
    const timeline = spinTimeline(words, "anything");
    expect(timeline.map((e) => e.word)).toEqual([...words, "anything"]);
  });

  it("ends on the settle word with a terminal hold", () => {
    const timeline = spinTimeline(words, "anything");
    expect(timeline[timeline.length - 1]).toEqual({ word: "anything", holdMs: Infinity });
  });

  it("does not repeat the settle word when it is already in the list", () => {
    const timeline = spinTimeline(words, "music");
    expect(timeline.map((e) => e.word)).toEqual(words);
    expect(timeline[timeline.length - 1].holdMs).toBe(Infinity);
  });

  it("holds the first word longer than the quick middle words", () => {
    const timeline = spinTimeline(words, "anything");
    expect(timeline[0].holdMs).toBeGreaterThan(timeline[1].holdMs);
  });

  it("decelerates continuously: every spin step holds at least as long as the previous", () => {
    const timeline = spinTimeline(words, "anything");
    const spinHolds = timeline.slice(1, -1).map((e) => e.holdMs);
    for (let i = 1; i < spinHolds.length; i++) {
      expect(spinHolds[i]).toBeGreaterThanOrEqual(spinHolds[i - 1]);
    }
  });

  it("keeps the full rotation between 3 and 5 seconds for the real word list", () => {
    const timeline = spinTimeline(SPINNER_WORDS, "anything");
    const total = timeline
      .filter((e) => Number.isFinite(e.holdMs))
      .reduce((sum, e) => sum + e.holdMs, 0);
    expect(total).toBeGreaterThanOrEqual(3000);
    expect(total).toBeLessThanOrEqual(5000);
  });

  it("returns only the settle entry for an empty word list", () => {
    expect(spinTimeline([], "anything")).toEqual([{ word: "anything", holdMs: Infinity }]);
  });
});

describe("resolveSubjectWord", () => {
  it("returns language for language decks", () => {
    expect(resolveSubjectWord([{ language: "es" }, { language: "ja" }])).toBe("language");
  });

  it("defaults to language with no decks", () => {
    expect(resolveSubjectWord([])).toBe("language");
  });
});
