import { describe, expect, it } from "vitest";
import { buildEnrichmentPrompt } from "./enrichmentPrompt";
import { getLanguageProfile } from "./languages";

const card = {
  id: "c1",
  term: "perro",
  translation: "dog",
  wordType: "NOUN",
  gender: null,
  notes: null,
};

describe("buildEnrichmentPrompt", () => {
  it("embeds the card as a JSON line under Cards:", () => {
    const p = buildEnrichmentPrompt(getLanguageProfile("es")!, [card]);
    expect(p).toContain("Cards:");
    expect(p).toContain('"id":"c1"');
    expect(p).toContain('"term":"perro"');
  });

  describe("Spanish", () => {
    const p = buildEnrichmentPrompt(getLanguageProfile("es")!, [card]);
    it("targets Spanish→English with the four-value gender system", () => {
      expect(p).toContain("Spanish→English");
      expect(p).toContain("MASCULINE, FEMININE, NEUTER, EITHER");
    });
    it("asks for a Spanish present-tense person summary", () => {
      expect(p).toContain("yo/tú/él");
    });
    it("does not request a reading and keeps the synonym shape", () => {
      expect(p).not.toContain('"reading"');
      expect(p).toContain("disfrutar");
      expect(p.toLowerCase()).toContain("synonym");
    });
  });

  describe("Japanese", () => {
    const p = buildEnrichmentPrompt(getLanguageProfile("ja")!, [card]);
    it("targets Japanese→English and requests a kana/romaji reading", () => {
      expect(p).toContain("Japanese→English");
      expect(p).toContain('"reading"');
      expect(p.toLowerCase()).toContain("romaji");
    });
    it("declares no grammatical gender and summarizes Japanese verb forms", () => {
      expect(p).toContain("no grammatical gender");
      expect(p).not.toContain("MASCULINE, FEMININE, NEUTER, EITHER");
      expect(p).toContain("-masu");
      expect(p).toContain("te-form");
    });
  });

  describe("German", () => {
    const p = buildEnrichmentPrompt(getLanguageProfile("de")!, [card]);
    it("targets German→English with der/die/das gender", () => {
      expect(p).toContain("German→English");
      expect(p).toContain("der");
      expect(p).toContain("die");
      expect(p).toContain("das");
    });
    it("asks for German person forms and no reading", () => {
      expect(p).toContain("ich/du/er");
      expect(p).not.toContain('"reading"');
    });
  });
});
