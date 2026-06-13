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
  usagePattern: "",
  collocations: [],
  conjugation: "",
  etymology: "",
  wordFamily: [],
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
});

describe("withoutCorrection", () => {
  it("drops the correction flag, keeps the rest", () => {
    expect(
      withoutCorrection({ usagePattern: "x", correction: "did you mean…?" }),
    ).toEqual({ usagePattern: "x" });
  });
});
