import { describe, expect, it } from "vitest";
import { pickVoice, type VoiceLike } from "./speech";

const voice = (name: string, lang: string, localService: boolean): VoiceLike => ({
  name,
  lang,
  localService,
});

// the typical Windows/Chrome lineup: legacy local SAPI voices + Google remotes
const DAVID = voice("Microsoft David - English (United States)", "en-US", true);
const GOOGLE_EN = voice("Google US English", "en-US", false);
const ARIA_NATURAL = voice("Microsoft Aria Online (Natural) - English (United States)", "en-US", false);
const HELENA = voice("Microsoft Helena - Spanish (Spain)", "es-ES", true);
const GOOGLE_ES = voice("Google español", "es-ES", false);
const SABINA = voice("Microsoft Sabina - Spanish (Mexico)", "es-MX", true);

describe("pickVoice — English (mechanical-voice board fix)", () => {
  it("prefers Google's voice over a mechanical local SAPI voice", () => {
    expect(pickVoice([DAVID, GOOGLE_EN], "en")).toBe(GOOGLE_EN);
  });

  it("prefers a Natural/Neural voice over everything else", () => {
    expect(pickVoice([DAVID, GOOGLE_EN, ARIA_NATURAL], "en")).toBe(ARIA_NATURAL);
  });

  it("falls back to the local voice when nothing better exists", () => {
    expect(pickVoice([DAVID], "en")).toBe(DAVID);
  });
});

describe("pickVoice — Spanish (existing behavior preserved)", () => {
  it("prefers a local es-ES voice over remote and other variants", () => {
    expect(pickVoice([SABINA, GOOGLE_ES, HELENA], "es")).toBe(HELENA);
  });

  it("falls through es-ES → es-MX when es-ES is missing", () => {
    expect(pickVoice([SABINA], "es")).toBe(SABINA);
  });

  it("normalizes underscore locales", () => {
    const underscore = voice("Sabina", "es_MX", true);
    expect(pickVoice([underscore], "es")).toBe(underscore);
  });
});

describe("pickVoice — no match", () => {
  it("returns undefined when no voice matches the language", () => {
    expect(pickVoice([DAVID, GOOGLE_EN], "fr")).toBeUndefined();
  });
});
