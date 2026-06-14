import { describe, expect, it } from "vitest";
import {
  type ConjugationData,
  getConjugationSpec,
  hasConjugationData,
} from "./conjugation";

const JA_PLAIN_LEN = 12;

describe("getConjugationSpec", () => {
  it("returns specs for es/ja/de, null otherwise, case-insensitive", () => {
    expect(getConjugationSpec("es")?.code).toBe("es");
    expect(getConjugationSpec("JA")?.code).toBe("ja");
    expect(getConjugationSpec(" de ")?.code).toBe("de");
    expect(getConjugationSpec("fr")).toBeNull();
    expect(getConjugationSpec("")).toBeNull();
  });
});

describe("schema generation", () => {
  function required(schema: unknown): string[] {
    return ((schema as { required: string[] }).required ?? []).slice().sort();
  }
  it("Spanish schema requests the simple-form tenses", () => {
    const r = required(getConjugationSpec("es")!.schema);
    expect(r).toContain("indicativePresent");
    expect(r).toContain("imperativeAffirmative");
    expect(r).toContain("participle");
  });
  it("Japanese schema requests plain + polite arrays", () => {
    expect(required(getConjugationSpec("ja")!.schema)).toEqual(["plain", "polite"]);
  });
  it("German schema requests its tenses + Partizip II", () => {
    const r = required(getConjugationSpec("de")!.schema);
    expect(r).toContain("praesens");
    expect(r).toContain("perfekt");
    expect(r).toContain("imperativ");
    expect(r).toContain("partizip2");
  });
});

describe("Spanish build (compounds derived)", () => {
  const raw = {
    gerund: "hablando",
    participle: "hablado",
    indicativePresent: ["hablo", "hablas", "habla", "hablamos", "habláis", "hablan"],
    imperativeAffirmative: ["habla", "hable", "hablemos", "hablad", "hablen"],
  };
  const data = getConjugationSpec("es")!.build("hablar", raw);

  it("shows the non-finite headers", () => {
    expect(data.headers).toEqual([
      { label: "Infinitive", value: "hablar" },
      { label: "Gerund", value: "hablando" },
      { label: "Participle", value: "hablado" },
    ]);
  });
  it("keeps the present indicative and derives the present perfect", () => {
    const indicative = data.groups.find((g) => g.mood === "Indicative")!;
    const present = indicative.tenses.find((t) => t.label === "Present")!;
    expect(present.forms[0]).toBe("hablo");
    const perfect = indicative.tenses.find((t) => t.label === "Present perfect")!;
    expect(perfect.forms[0]).toBe("he hablado");
  });
});

describe("Japanese build", () => {
  const raw = {
    plain: ["寝る", "寝た", "寝ない", "寝なかった", "寝て", "寝よう", "寝られる", "寝られる", "寝させる", "寝れば", "寝たら", "寝ろ"],
    polite: ["寝ます", "寝ました", "寝ません", "寝ませんでした", "寝ましょう"],
  };
  const data = getConjugationSpec("ja")!.build("寝る", raw);

  it("has no gendered/person headers and two labeled form columns", () => {
    expect(data.headers).toEqual([]);
    const tenses = data.groups[0].tenses;
    expect(tenses.map((t) => t.label)).toEqual(["Plain (普通形)", "Polite (丁寧形)"]);
  });
  it("aligns forms to their row labels", () => {
    const plain = data.groups[0].tenses[0];
    expect(plain.persons.length).toBe(plain.forms.length);
    expect(plain.forms[4]).toBe("寝て"); // Te-form
    const polite = data.groups[0].tenses[1];
    expect(polite.forms[0]).toBe("寝ます");
  });
  it("pads short arrays to the expected length", () => {
    const partial = getConjugationSpec("ja")!.build("X", { plain: ["a", "b"], polite: [] });
    expect(partial.groups[0].tenses[0].forms).toHaveLength(JA_PLAIN_LEN);
    expect(partial.groups[0].tenses[0].forms[2]).toBe("");
  });
});

describe("German build", () => {
  const raw = {
    partizip2: "geschlafen",
    praesens: ["schlafe", "schläfst", "schläft", "schlafen", "schlaft", "schlafen"],
    perfekt: ["habe geschlafen", "hast geschlafen", "hat geschlafen", "haben geschlafen", "habt geschlafen", "haben geschlafen"],
    imperativ: ["schlaf", "schlaft", "schlafen Sie"],
  };
  const data = getConjugationSpec("de")!.build("schlafen", raw);

  it("shows infinitive + Partizip II headers", () => {
    expect(data.headers).toEqual([
      { label: "Infinitive", value: "schlafen" },
      { label: "Partizip II", value: "geschlafen" },
    ]);
  });
  it("groups Indikativ/Konjunktiv/Imperativ with the right cell counts", () => {
    expect(data.groups.map((g) => g.mood)).toEqual(["Indikativ", "Konjunktiv", "Imperativ"]);
    const perfekt = data.groups[0].tenses.find((t) => t.label === "Perfekt")!;
    expect(perfekt.forms[0]).toBe("habe geschlafen");
    const imperativ = data.groups[2].tenses[0];
    expect(imperativ.persons).toEqual(["du", "ihr", "Sie"]);
    expect(imperativ.forms).toHaveLength(3);
  });
});

describe("hasConjugationData", () => {
  it("is false for empty / nullish, true once a form is present", () => {
    expect(hasConjugationData(null)).toBe(false);
    const empty: ConjugationData = { headers: [], groups: [{ mood: "", tenses: [{ label: "x", persons: ["a"], forms: [""] }] }] };
    expect(hasConjugationData(empty)).toBe(false);
    expect(hasConjugationData(getConjugationSpec("ja")!.build("寝る", { plain: ["寝る"], polite: [] }))).toBe(true);
  });
});
