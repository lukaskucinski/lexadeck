/**
 * Spanish verb conjugation tables. The AI (Gemini) supplies only the SIMPLE
 * forms + participle/gerund — the part where irregular/stem-changing verbs are
 * hard. Every COMPOUND tense is then derived deterministically here from the
 * fixed `haber` paradigm + the past participle, so compounds are always correct
 * regardless of the verb. buildConjugationTable is the pure, unit-tested core.
 */

/** Person columns for finite tenses (yo … ellos), 6 entries. */
export const CONJ_PERSONS = ["yo", "tú", "él/ella/ud.", "nosotros", "vosotros", "ellos/uds."];
/** The imperative has no "yo" form, 5 entries. */
export const CONJ_IMPERATIVE_PERSONS = ["tú", "usted", "nosotros", "vosotros", "ustedes"];

// `type` (not `interface`) so these get implicit index signatures and stay
// assignable to Prisma's Json input type when stored in Card.details.

/** Simple forms the model is asked to produce (arrays are person-indexed). */
export type SimpleConjugation = {
  gerund: string;
  participle: string;
  indicativePresent: string[]; // 6
  indicativePreterite: string[];
  indicativeImperfect: string[];
  indicativeFuture: string[];
  conditional: string[];
  subjunctivePresent: string[];
  subjunctiveImperfectRa: string[];
  subjunctiveImperfectSe: string[];
  imperativeAffirmative: string[]; // 5
  imperativeNegative: string[]; // 5
};

/** Full table = infinitive + simple forms + derived compound tenses (flat literal). */
export type ConjTable = {
  infinitive: string;
  gerund: string;
  participle: string;
  indicativePresent: string[];
  indicativePreterite: string[];
  indicativeImperfect: string[];
  indicativeFuture: string[];
  conditional: string[];
  subjunctivePresent: string[];
  subjunctiveImperfectRa: string[];
  subjunctiveImperfectSe: string[];
  imperativeAffirmative: string[];
  imperativeNegative: string[];
  presentPerfect: string[]; // he/has/… + participle
  pastPerfect: string[]; // había/… (pluscuamperfecto)
  futurePerfect: string[]; // habré/…
  conditionalPerfect: string[]; // habría/…
  subjunctivePresentPerfect: string[]; // haya/…
  subjunctivePastPerfect: string[]; // hubiera/… (pluscuamperfecto de subjuntivo)
};

/** Fixed `haber` paradigms — the only auxiliary used for Spanish compound tenses. */
const HABER = {
  present: ["he", "has", "ha", "hemos", "habéis", "han"],
  imperfect: ["había", "habías", "había", "habíamos", "habíais", "habían"],
  future: ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"],
  conditional: ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"],
  subjPresent: ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"],
  subjImperfect: ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubierais", "hubieran"],
};

const compound = (aux: string[], participle: string): string[] =>
  aux.map((h) => `${h} ${participle}`);

/** Derive the full table (with compound tenses) from infinitive + simple forms. */
export function buildConjugationTable(infinitive: string, s: SimpleConjugation): ConjTable {
  const p = s.participle;
  return {
    infinitive,
    ...s,
    presentPerfect: compound(HABER.present, p),
    pastPerfect: compound(HABER.imperfect, p),
    futurePerfect: compound(HABER.future, p),
    conditionalPerfect: compound(HABER.conditional, p),
    subjunctivePresentPerfect: compound(HABER.subjPresent, p),
    subjunctivePastPerfect: compound(HABER.subjImperfect, p),
  };
}

/** Coerce one raw array to a fixed-length, trimmed string[] (pad with "", truncate). */
function fixed(v: unknown, n: number): string[] {
  const src = Array.isArray(v) ? v : [];
  return Array.from({ length: n }, (_, i) =>
    typeof src[i] === "string" ? (src[i] as string).trim() : "",
  );
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Defensively coerce a raw Gemini object into SimpleConjugation. */
export function normalizeSimpleConjugation(raw: Record<string, unknown>): SimpleConjugation {
  return {
    gerund: str(raw.gerund),
    participle: str(raw.participle),
    indicativePresent: fixed(raw.indicativePresent, 6),
    indicativePreterite: fixed(raw.indicativePreterite, 6),
    indicativeImperfect: fixed(raw.indicativeImperfect, 6),
    indicativeFuture: fixed(raw.indicativeFuture, 6),
    conditional: fixed(raw.conditional, 6),
    subjunctivePresent: fixed(raw.subjunctivePresent, 6),
    subjunctiveImperfectRa: fixed(raw.subjunctiveImperfectRa, 6),
    subjunctiveImperfectSe: fixed(raw.subjunctiveImperfectSe, 6),
    imperativeAffirmative: fixed(raw.imperativeAffirmative, 5),
    imperativeNegative: fixed(raw.imperativeNegative, 5),
  };
}

/** True when the table has at least the present indicative filled in. */
export function hasConjugation(t: ConjTable | undefined | null): t is ConjTable {
  return !!t && Array.isArray(t.indicativePresent) && t.indicativePresent.some((f) => f.trim());
}

/** Display layout: moods → tenses, each pointing at a ConjTable field + its person row. */
export const CONJ_GROUPS: {
  mood: string;
  tenses: { key: keyof ConjTable; label: string; persons: string[] }[];
}[] = [
  {
    mood: "Indicative",
    tenses: [
      { key: "indicativePresent", label: "Present", persons: CONJ_PERSONS },
      { key: "indicativePreterite", label: "Preterite", persons: CONJ_PERSONS },
      { key: "indicativeImperfect", label: "Imperfect", persons: CONJ_PERSONS },
      { key: "indicativeFuture", label: "Future", persons: CONJ_PERSONS },
      { key: "conditional", label: "Conditional", persons: CONJ_PERSONS },
      { key: "presentPerfect", label: "Present perfect", persons: CONJ_PERSONS },
      { key: "pastPerfect", label: "Pluperfect", persons: CONJ_PERSONS },
      { key: "futurePerfect", label: "Future perfect", persons: CONJ_PERSONS },
      { key: "conditionalPerfect", label: "Conditional perfect", persons: CONJ_PERSONS },
    ],
  },
  {
    mood: "Subjunctive",
    tenses: [
      { key: "subjunctivePresent", label: "Present", persons: CONJ_PERSONS },
      { key: "subjunctiveImperfectRa", label: "Imperfect (-ra)", persons: CONJ_PERSONS },
      { key: "subjunctiveImperfectSe", label: "Imperfect (-se)", persons: CONJ_PERSONS },
      { key: "subjunctivePresentPerfect", label: "Present perfect", persons: CONJ_PERSONS },
      { key: "subjunctivePastPerfect", label: "Pluperfect", persons: CONJ_PERSONS },
    ],
  },
  {
    mood: "Imperative",
    tenses: [
      { key: "imperativeAffirmative", label: "Affirmative", persons: CONJ_IMPERATIVE_PERSONS },
      { key: "imperativeNegative", label: "Negative", persons: CONJ_IMPERATIVE_PERSONS },
    ],
  },
];
