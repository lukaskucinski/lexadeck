import { describe, expect, it } from "vitest";
import { resolveSubjectWord, SPINNER_WORDS } from "./spinner";

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

describe("resolveSubjectWord", () => {
  it("returns language for language decks", () => {
    expect(resolveSubjectWord([{ language: "es" }, { language: "ja" }])).toBe("language");
  });

  it("defaults to language with no decks", () => {
    expect(resolveSubjectWord([])).toBe("language");
  });
});
