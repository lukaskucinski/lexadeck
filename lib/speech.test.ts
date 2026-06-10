import { describe, expect, it } from "vitest";
import { defaultLangTag, detectLanguage, pickVoice, type VoiceLike } from "./speech";

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

  // board fix: English came out Spanish-accented — anchor on the major
  // English variants (American, then British) before any other en-*
  it("prefers en-US over other variants regardless of list order", () => {
    const inGB = voice("Google UK English Female", "en-GB", false);
    const inIN = voice("English India", "en-IN", true);
    expect(pickVoice([inIN, inGB, GOOGLE_EN], "en")).toBe(GOOGLE_EN);
  });

  it("prefers en-GB when no en-US voice exists", () => {
    const inGB = voice("Google UK English Female", "en-GB", false);
    const inIN = voice("English India", "en-IN", true);
    expect(pickVoice([inIN, inGB], "en")).toBe(inGB);
  });

  it("still ranks quality within the preferred variant", () => {
    const inGB = voice("Google UK English Female", "en-GB", false);
    expect(pickVoice([DAVID, inGB, ARIA_NATURAL], "en")).toBe(ARIA_NATURAL);
  });
});

// board fix: English text spoken with a Spanish voice — the caller's lang is
// per-card, but card content can be the other language (e.g. grammar-card
// terms are English titles), so detect from the text itself
describe("detectLanguage", () => {
  it("Spanish diacritics and punctuation are decisive", () => {
    expect(detectLanguage("¿Cómo estás?", "en")).toBe("es");
    expect(detectLanguage("El niño pequeño", "en")).toBe("es");
  });

  it("recognizes Spanish stopwords without diacritics", () => {
    expect(detectLanguage("el perro grande de la casa", "en")).toBe("es");
  });

  it("recognizes English stopwords", () => {
    expect(detectLanguage("the house is big", "es")).toBe("en");
    expect(detectLanguage("to walk quickly", "es")).toBe("en");
  });

  it("recognizes English orthography in title-style text (grammar terms)", () => {
    expect(detectLanguage("Direct Object Pronouns", "es")).toBe("en");
    expect(detectLanguage("Present Progressive", "es")).toBe("en");
  });

  it("falls back when there is no signal", () => {
    expect(detectLanguage("perro", "es")).toBe("es");
    expect(detectLanguage("1234 ✦", "en")).toBe("en");
  });
});

describe("defaultLangTag (no-voice fallback)", () => {
  it("maps bare language codes to a concrete region", () => {
    expect(defaultLangTag("en")).toBe("en-US");
    expect(defaultLangTag("es")).toBe("es-ES");
  });

  it("passes already-regioned and unknown tags through", () => {
    expect(defaultLangTag("en-GB")).toBe("en-GB");
    expect(defaultLangTag("fr")).toBe("fr");
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
