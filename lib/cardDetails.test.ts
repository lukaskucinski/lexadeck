import { describe, expect, it } from "vitest";
import type { EnrichmentItem } from "./ai/enrichment";
import { detailsFromEnrichment, getCardDetails, withoutCorrection } from "./cardDetails";

const base: EnrichmentItem = {
  id: "c1",
  wordType: "VERB",
  gender: null,
  example: "",
  exampleEn: "",
  emoji: "",
  reading: "",
  usagePattern: "",
  collocations: [],
  conjugation: "",
  etymology: "",
  wordFamily: [],
  synonyms: [],
  correction: "",
};

describe("detailsFromEnrichment", () => {
  it("keeps only non-empty detail fields", () => {
    expect(
      detailsFromEnrichment({
        ...base,
        usagePattern: "gozar de + noun",
        collocations: ["gozar de buena salud"],
        etymology: "",
        wordFamily: [],
        correction: "did you mean recibir?",
      }),
    ).toEqual({
      usagePattern: "gozar de + noun",
      collocations: ["gozar de buena salud"],
      correction: "did you mean recibir?",
    });
  });

  it("returns {} when there is nothing to keep", () => {
    expect(detailsFromEnrichment(base)).toEqual({});
  });

  it("keeps a pronunciation reading", () => {
    expect(detailsFromEnrichment({ ...base, reading: "いぬ (inu)" })).toEqual({
      reading: "いぬ (inu)",
    });
  });
});

describe("getCardDetails", () => {
  it("maps null / non-object legacy values to {}", () => {
    expect(getCardDetails(null)).toEqual({});
    expect(getCardDetails("nope")).toEqual({});
    expect(getCardDetails(undefined)).toEqual({});
  });

  it("cleans strings and drops blank array entries", () => {
    expect(
      getCardDetails({
        usagePattern: "  gozar de + noun ",
        collocations: ["a", "", "  ", "b"],
        wordFamily: [],
        correction: "  ",
      }),
    ).toEqual({ usagePattern: "gozar de + noun", collocations: ["a", "b"] });
  });

  it("reads back a stored reading", () => {
    expect(getCardDetails({ reading: " たべる (taberu) " })).toEqual({
      reading: "たべる (taberu)",
    });
  });

  // guards the new-card flow: a conjugation table generated at creation is
  // carried in the hidden details field and must survive the round-trip
  it("preserves a self-describing conjugation table (groups present)", () => {
    const conjugationTable = {
      headers: [{ label: "Infinitive", value: "hablar" }],
      groups: [
        { mood: "Indicative", tenses: [{ label: "Present", persons: ["yo"], forms: ["hablo"] }] },
      ],
    };
    expect(getCardDetails({ conjugationTable }).conjugationTable).toEqual(conjugationTable);
  });

  it("drops a legacy conjugation table that lacks groups", () => {
    // old flat ConjTable shape → treated as absent so the panel regenerates it
    expect(
      getCardDetails({ conjugationTable: { infinitive: "hablar", indicativePresent: [] } }),
    ).toEqual({});
  });
});

describe("withoutCorrection", () => {
  it("drops the correction flag, keeps the rest", () => {
    expect(
      withoutCorrection({ usagePattern: "x", correction: "did you mean…?" }),
    ).toEqual({ usagePattern: "x" });
  });
});
