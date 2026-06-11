import { describe, expect, it } from "vitest";
import { resolveSpinnerWord, SPINNER_WORDS, spinFrames } from "./spinner";

describe("SPINNER_WORDS", () => {
  it("leads with language and includes the aspirational domains", () => {
    expect(SPINNER_WORDS[0]).toBe("language");
    expect(SPINNER_WORDS).toContain("law");
    expect(SPINNER_WORDS).toContain("medicine");
    expect(SPINNER_WORDS).toContain("geography");
    expect(SPINNER_WORDS).toContain("test prep");
  });
});

describe("resolveSpinnerWord", () => {
  it("returns language for language decks", () => {
    expect(resolveSpinnerWord([{ language: "es" }, { language: "ja" }])).toBe("language");
  });

  it("defaults to language with no decks", () => {
    expect(resolveSpinnerWord([])).toBe("language");
  });
});

describe("spinFrames", () => {
  const words = ["language", "law", "medicine"];

  it("ends on the landing word", () => {
    const frames = spinFrames(words, "medicine", 2);
    expect(frames[frames.length - 1]).toBe("medicine");
  });

  it("cycles every word the requested number of times before landing", () => {
    const frames = spinFrames(words, "language", 2);
    for (const word of words) {
      expect(frames.filter((f) => f === word).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("never shows the landing word twice in a row at the end", () => {
    const frames = spinFrames(words, "medicine", 1);
    expect(frames[frames.length - 2]).not.toBe("medicine");
  });

  it("handles a landing word that is not in the cycle list", () => {
    const frames = spinFrames(words, "history", 1);
    expect(frames[frames.length - 1]).toBe("history");
    expect(frames.slice(0, -1)).toEqual(expect.arrayContaining(words));
  });

  it("returns just the landing word for an empty word list", () => {
    expect(spinFrames([], "language", 2)).toEqual(["language"]);
  });
});
