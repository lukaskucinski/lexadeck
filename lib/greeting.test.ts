import { describe, expect, it } from "vitest";
import { greetingFor, greetingForDate, resolveGreetingLanguage } from "./greeting";

describe("greetingFor", () => {
  it.each([
    ["es", 8, "buenos días"],
    ["es", 11, "buenos días"],
    ["es", 12, "buenas tardes"],
    ["es", 18, "buenas tardes"],
    ["es", 19, "buenas noches"],
    ["es", 23, "buenas noches"],
  ])("spanish: hour %i#%i → %s", (lang, hour, expected) => {
    expect(greetingFor(lang, hour)).toBe(expected);
  });

  it.each([
    ["ja", 8, "おはよう"],
    ["ja", 14, "こんにちは"],
    ["ja", 21, "こんばんは"],
  ])("japanese: hour %i#%i → %s", (lang, hour, expected) => {
    expect(greetingFor(lang, hour)).toBe(expected);
  });

  it("falls back to english for unsupported languages", () => {
    expect(greetingFor("fr", 8)).toBe("good morning");
    expect(greetingFor("de", 14)).toBe("good afternoon");
    expect(greetingFor("ko", 21)).toBe("good evening");
  });

  it("is case-insensitive about the language tag", () => {
    expect(greetingFor("JA", 8)).toBe("おはよう");
  });
});

describe("greetingForDate", () => {
  // new Date(y, mo, d, h, m) builds a Date at LOCAL wall-clock time, and
  // greetingForDate must read that local hour — never a fixed app timezone.
  it.each([
    [8, "buenos días"],
    [11, "buenos días"],
    [14, "buenas tardes"],
    [22, "buenas noches"],
  ])("derives the greeting from the local hour %i", (hour, expected) => {
    expect(greetingForDate("es", new Date(2026, 5, 14, hour, 30))).toBe(expected);
  });

  it("passes the language through to greetingFor", () => {
    expect(greetingForDate("ja", new Date(2026, 5, 14, 8, 0))).toBe("おはよう");
  });
});

describe("resolveGreetingLanguage", () => {
  const deck = (id: string, language: string, lastStudied: Date | null) => ({
    id,
    language,
    lastStudied,
  });

  it("uses the last-opened deck's language when the cookie matches", () => {
    const decks = [deck("a", "es", new Date("2026-06-01")), deck("b", "ja", null)];
    expect(resolveGreetingLanguage(decks, "b")).toBe("ja");
  });

  it("falls back to the most recently studied deck when the cookie is stale", () => {
    const decks = [
      deck("a", "es", new Date("2026-06-01")),
      deck("b", "ja", new Date("2026-06-09")),
    ];
    expect(resolveGreetingLanguage(decks, "gone")).toBe("ja");
  });

  it("falls back to the first deck when nothing was studied yet", () => {
    const decks = [deck("a", "ja", null), deck("b", "es", null)];
    expect(resolveGreetingLanguage(decks, undefined)).toBe("ja");
  });

  it("defaults to spanish with no decks at all", () => {
    expect(resolveGreetingLanguage([], undefined)).toBe("es");
  });
});
