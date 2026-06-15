import { describe, expect, it } from "vitest";
import {
  ENRICHABLE_LANGUAGES,
  getLanguageProfile,
  isEnrichable,
} from "./languages";

describe("getLanguageProfile", () => {
  it("returns the Spanish, Japanese, and German profiles", () => {
    expect(getLanguageProfile("es")?.name).toBe("Spanish");
    expect(getLanguageProfile("ja")?.name).toBe("Japanese");
    expect(getLanguageProfile("de")?.name).toBe("German");
  });

  it("is case-insensitive and tolerates whitespace", () => {
    expect(getLanguageProfile("ES")?.code).toBe("es");
    expect(getLanguageProfile(" ja ")?.code).toBe("ja");
  });

  it("returns null for an untuned or empty language", () => {
    expect(getLanguageProfile("fr")).toBeNull();
    expect(getLanguageProfile("")).toBeNull();
  });
});

describe("isEnrichable", () => {
  it("is true only for languages with a profile", () => {
    expect(isEnrichable("es")).toBe(true);
    expect(isEnrichable("ja")).toBe(true);
    expect(isEnrichable("de")).toBe(true);
    expect(isEnrichable("fr")).toBe(false);
    expect(isEnrichable("")).toBe(false);
    expect(isEnrichable(null)).toBe(false);
    expect(isEnrichable(undefined)).toBe(false);
  });

  it("ENRICHABLE_LANGUAGES lists exactly the tuned codes", () => {
    expect([...ENRICHABLE_LANGUAGES].sort()).toEqual(["de", "es", "ja"]);
  });
});

describe("translation direction", () => {
  it("translates each language into English", () => {
    expect(getLanguageProfile("es")?.azure).toEqual({ from: "es", to: "en" });
    expect(getLanguageProfile("ja")?.azure).toEqual({ from: "ja", to: "en" });
    expect(getLanguageProfile("de")?.azure).toEqual({ from: "de", to: "en" });
  });
});

describe("gender rules", () => {
  it("Spanish has the four-value gender system", () => {
    const es = getLanguageProfile("es")!;
    expect(es.gender.enabled).toBe(true);
    expect(es.gender.values).toContain("EITHER");
    expect(es.gender.values).toContain("MASCULINE");
  });

  it("German has three genders (der/die/das), no EITHER", () => {
    const de = getLanguageProfile("de")!;
    expect(de.gender.enabled).toBe(true);
    expect([...de.gender.values].sort()).toEqual(["FEMININE", "MASCULINE", "NEUTER"]);
  });

  it("Japanese has no grammatical gender", () => {
    const ja = getLanguageProfile("ja")!;
    expect(ja.gender.enabled).toBe(false);
    expect(ja.gender.values).toEqual([]);
  });
});

describe("reading rules", () => {
  it("only Japanese requests a pronunciation reading", () => {
    expect(getLanguageProfile("es")!.reading.enabled).toBe(false);
    expect(getLanguageProfile("de")!.reading.enabled).toBe(false);
    expect(getLanguageProfile("ja")!.reading.enabled).toBe(true);
    expect(getLanguageProfile("ja")!.reading.promptNote.length).toBeGreaterThan(0);
  });
});

describe("conjugation capability", () => {
  it("es/ja/de all have structured conjugation tables", () => {
    expect(getLanguageProfile("es")!.conjugation.table).toBe(true);
    expect(getLanguageProfile("ja")!.conjugation.table).toBe(true);
    expect(getLanguageProfile("de")!.conjugation.table).toBe(true);
  });

  it("every language has a verb-summary prompt note", () => {
    for (const code of ENRICHABLE_LANGUAGES) {
      expect(getLanguageProfile(code)!.conjugation.summaryNote.length).toBeGreaterThan(0);
    }
  });
});
