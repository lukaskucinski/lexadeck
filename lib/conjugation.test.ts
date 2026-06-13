import { describe, expect, it } from "vitest";
import {
  buildConjugationTable,
  hasConjugation,
  normalizeSimpleConjugation,
  type SimpleConjugation,
} from "./conjugation";

const hablar: SimpleConjugation = {
  gerund: "hablando",
  participle: "hablado",
  indicativePresent: ["hablo", "hablas", "habla", "hablamos", "habláis", "hablan"],
  indicativePreterite: ["hablé", "hablaste", "habló", "hablamos", "hablasteis", "hablaron"],
  indicativeImperfect: ["hablaba", "hablabas", "hablaba", "hablábamos", "hablabais", "hablaban"],
  indicativeFuture: ["hablaré", "hablarás", "hablará", "hablaremos", "hablaréis", "hablarán"],
  conditional: ["hablaría", "hablarías", "hablaría", "hablaríamos", "hablaríais", "hablarían"],
  subjunctivePresent: ["hable", "hables", "hable", "hablemos", "habléis", "hablen"],
  subjunctiveImperfectRa: ["hablara", "hablaras", "hablara", "habláramos", "hablarais", "hablaran"],
  subjunctiveImperfectSe: ["hablase", "hablases", "hablase", "hablásemos", "hablaseis", "hablasen"],
  imperativeAffirmative: ["habla", "hable", "hablemos", "hablad", "hablen"],
  imperativeNegative: ["no hables", "no hable", "no hablemos", "no habléis", "no hablen"],
};

describe("buildConjugationTable", () => {
  it("keeps the simple forms and infinitive", () => {
    const t = buildConjugationTable("hablar", hablar);
    expect(t.infinitive).toBe("hablar");
    expect(t.indicativePresent[0]).toBe("hablo");
    expect(t.imperativeAffirmative).toHaveLength(5);
  });

  it("derives compound tenses from the fixed haber paradigm + participle", () => {
    const t = buildConjugationTable("hablar", hablar);
    expect(t.presentPerfect).toEqual([
      "he hablado",
      "has hablado",
      "ha hablado",
      "hemos hablado",
      "habéis hablado",
      "han hablado",
    ]);
    expect(t.pastPerfect[3]).toBe("habíamos hablado");
    expect(t.futurePerfect[0]).toBe("habré hablado");
    expect(t.conditionalPerfect[5]).toBe("habrían hablado");
    expect(t.subjunctivePresentPerfect[0]).toBe("haya hablado");
    expect(t.subjunctivePastPerfect[0]).toBe("hubiera hablado");
  });

  it("uses an irregular participle correctly in compounds", () => {
    // escribir → participle "escrito"
    const t = buildConjugationTable("escribir", { ...hablar, participle: "escrito" });
    expect(t.presentPerfect[2]).toBe("ha escrito");
    expect(t.subjunctivePastPerfect[2]).toBe("hubiera escrito");
  });
});

describe("normalizeSimpleConjugation", () => {
  it("coerces arrays to fixed length, trimming and padding", () => {
    const s = normalizeSimpleConjugation({
      gerund: "  hablando ",
      participle: "hablado",
      indicativePresent: ["hablo", "hablas"], // short → padded to 6
      imperativeAffirmative: ["habla", "hable", "hablemos", "hablad", "hablen", "extra"], // long → 5
    });
    expect(s.gerund).toBe("hablando");
    expect(s.indicativePresent).toHaveLength(6);
    expect(s.indicativePresent[1]).toBe("hablas");
    expect(s.indicativePresent[5]).toBe("");
    expect(s.imperativeAffirmative).toHaveLength(5);
    expect(s.subjunctivePresent).toEqual(["", "", "", "", "", ""]);
  });
});

describe("hasConjugation", () => {
  it("is true only when the present indicative has content", () => {
    expect(hasConjugation(null)).toBe(false);
    expect(hasConjugation(undefined)).toBe(false);
    expect(hasConjugation(buildConjugationTable("hablar", hablar))).toBe(true);
    const empty = buildConjugationTable("x", { ...hablar, indicativePresent: ["", "", "", "", "", ""] });
    expect(hasConjugation(empty)).toBe(false);
  });
});
