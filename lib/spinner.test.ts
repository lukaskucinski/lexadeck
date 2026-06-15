import { describe, expect, it } from "vitest";
import {
  REEL_DELAY_MS,
  REEL_SPIN_MS,
  reelStrip,
  resolveSubjectWord,
  SPINNER_WORDS,
} from "./spinner";

describe("SPINNER_WORDS", () => {
  it("opens with languages, then ascends popularity so the decelerating reel dwells on bigger use cases", () => {
    expect(SPINNER_WORDS).toEqual([
      "languages",
      "art",
      "geography",
      "coding",
      "history",
      "science",
      "exams",
      "law",
      "medicine",
    ]);
  });
});

describe("reelStrip", () => {
  const words = ["languages", "medicine", "law", "music"];

  it("plays the words in order and ends on the settle word", () => {
    expect(reelStrip(words, "anything")).toEqual([...words, "anything"]);
  });

  it("does not repeat the settle word when it already ends the list", () => {
    expect(reelStrip(words, "music")).toEqual(words);
  });

  it("returns only the settle word for an empty list", () => {
    expect(reelStrip([], "anything")).toEqual(["anything"]);
  });
});

describe("reel timing", () => {
  it("keeps the full rotation between 3 and 5 seconds", () => {
    const total = REEL_DELAY_MS + REEL_SPIN_MS;
    expect(total).toBeGreaterThanOrEqual(3000);
    expect(total).toBeLessThanOrEqual(5000);
  });
});

describe("resolveSubjectWord", () => {
  const day = (n: number) => new Date(2026, 0, n);
  const decks = [
    { id: "a", subject: "languages", lastStudied: day(1) },
    { id: "b", subject: "medicine", lastStudied: day(3) },
    { id: "c", subject: "coding", lastStudied: null },
  ];

  it("uses the tagline word of the last-opened deck's subject", () => {
    expect(resolveSubjectWord(decks, "c")).toBe("coding");
  });

  it("falls back to the most recently studied deck's subject word", () => {
    expect(resolveSubjectWord(decks, undefined)).toBe("medicine");
  });

  it("keeps the language word for an all-languages deck list", () => {
    expect(
      resolveSubjectWord([{ id: "a", subject: "languages", lastStudied: day(1) }], "a"),
    ).toBe("language");
  });

  it("defaults to language with no decks", () => {
    expect(resolveSubjectWord([])).toBe("language");
  });
});
