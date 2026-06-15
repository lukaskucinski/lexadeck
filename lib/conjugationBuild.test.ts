import { describe, expect, it, vi } from "vitest";

// stub the AI call — buildConjugationFromTerm orchestrates geminiConjugate +
// spec.build; we verify the composition, not a live model request
vi.mock("./ai/enrichment", () => ({ geminiConjugate: vi.fn() }));

import { geminiConjugate } from "./ai/enrichment";
import { buildConjugationFromTerm, getConjugationSpec } from "./conjugation";

const SPANISH_RAW = {
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

describe("buildConjugationFromTerm", () => {
  it("composes geminiConjugate + spec.build into a ConjugationData", async () => {
    const spec = getConjugationSpec("es");
    if (!spec) throw new Error("expected a Spanish conjugation spec");
    vi.mocked(geminiConjugate).mockResolvedValue(SPANISH_RAW);

    const table = await buildConjugationFromTerm("hablar", spec);

    expect(geminiConjugate).toHaveBeenCalledWith("hablar", spec);
    expect(table.groups.length).toBeGreaterThan(0);
    // the infinitive surfaces in the headers …
    expect(table.headers.some((h) => h.value === "hablar")).toBe(true);
    // … and the model's present-tense forms make it into the table
    const allForms = table.groups.flatMap((g) => g.tenses.flatMap((t) => t.forms));
    expect(allForms).toContain("hablo");
    // compound tenses are derived in code (haber + participle)
    expect(allForms).toContain("he hablado");
  });
});
