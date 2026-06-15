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

/* ------------------------------------------------------------------ */
/* Generic per-language conjugation. Spanish keeps the SIMPLE-forms +   */
/* HABER-derived table above; Japanese/German declare their own layout. */
/* The UI renders ConjugationData directly, with no per-language branch. */
/* ------------------------------------------------------------------ */

/** One labeled tense: `persons` are the row labels, `forms` the values (equal length). */
export type ConjTense = { label: string; persons: string[]; forms: string[] };
export type ConjGroup = { mood: string; tenses: ConjTense[] };
/** Self-describing, language-agnostic conjugation table — rendered as-is by the UI. */
export type ConjugationData = {
  /** Non-finite forms shown at the top (infinitive, participle, …). */
  headers: { label: string; value: string }[];
  groups: ConjGroup[];
};

/** True when at least one tense has a filled-in form. */
export function hasConjugationData(d: ConjugationData | undefined | null): d is ConjugationData {
  return !!d && d.groups.some((g) => g.tenses.some((t) => t.forms.some((f) => f.trim())));
}

export interface ConjugationSpec {
  code: string;
  /** Gemini responseSchema for this language's raw conjugation JSON. */
  schema: unknown;
  /** Prompt for one verb (infinitive / dictionary form). */
  prompt: (verb: string) => string;
  /** Coerce raw AI JSON into the display structure. */
  build: (verb: string, raw: Record<string, unknown>) => ConjugationData;
}

const STRING_FIELD = { type: "STRING" } as const;
const STRING_ARRAY_FIELD = { type: "ARRAY", items: { type: "STRING" } } as const;

/** Build a Gemini OBJECT schema: header keys → STRING, tense keys → STRING[]. */
function objectSchema(headerKeys: string[], tenseKeys: string[]) {
  const properties: Record<string, unknown> = {};
  for (const k of headerKeys) properties[k] = STRING_FIELD;
  for (const k of tenseKeys) properties[k] = STRING_ARRAY_FIELD;
  return { type: "OBJECT", properties, required: [...headerKeys, ...tenseKeys] };
}

/* ---- Spanish: SIMPLE forms from the model, compounds derived in code ---- */

const ES_CONJ_SCHEMA = objectSchema(
  ["gerund", "participle"],
  [
    "indicativePresent", "indicativePreterite", "indicativeImperfect", "indicativeFuture",
    "conditional", "subjunctivePresent", "subjunctiveImperfectRa", "subjunctiveImperfectSe",
    "imperativeAffirmative", "imperativeNegative",
  ],
);

const ES_CONJ_PROMPT = (verb: string) =>
  `Conjugate the Spanish verb "${verb}" (infinitive). Return JSON with the SIMPLE forms only — do NOT include compound/perfect tenses (they are derived separately).
Each finite tense is an array of EXACTLY 6 forms in this person order: [yo, tú, él/ella/usted, nosotros, vosotros, ellos/ellas/ustedes].
- "gerund": the gerundio (e.g. "hablando").
- "participle": the past participle, using the irregular form when applicable (e.g. escribir → "escrito").
- "indicativePresent", "indicativePreterite", "indicativeImperfect", "indicativeFuture": indicative simple tenses (6 each).
- "conditional": simple conditional (6).
- "subjunctivePresent": present subjunctive (6).
- "subjunctiveImperfectRa": imperfect subjunctive, -ra forms (6).
- "subjunctiveImperfectSe": imperfect subjunctive, -se forms (6).
- "imperativeAffirmative": affirmative imperative, EXACTLY 5 forms in order [tú, usted, nosotros, vosotros, ustedes].
- "imperativeNegative": negative imperative, EXACTLY 5 forms in the same order, each starting with "no ".
Use standard Castilian Spanish (include vosotros). Apply every stem change and irregularity correctly (e.g. pedir → "pido", volver → "vuelvo" in the present but "volvería" in the conditional).`;

/** Spanish: derive the full table (incl. compounds) and project it onto CONJ_GROUPS. */
function spanishConjugationData(verb: string, raw: Record<string, unknown>): ConjugationData {
  const t = buildConjugationTable(verb, normalizeSimpleConjugation(raw));
  return {
    headers: [
      { label: "Infinitive", value: t.infinitive },
      { label: "Gerund", value: t.gerund },
      { label: "Participle", value: t.participle },
    ],
    groups: CONJ_GROUPS.map((g) => ({
      mood: g.mood,
      tenses: g.tenses.map((te) => ({
        label: te.label,
        persons: te.persons,
        forms: (t[te.key] as string[]) ?? [],
      })),
    })),
  };
}

const ES_SPEC: ConjugationSpec = {
  code: "es",
  schema: ES_CONJ_SCHEMA,
  prompt: ES_CONJ_PROMPT,
  build: spanishConjugationData,
};

/* ---- Generic declarative specs (Japanese, German) ---- */

type GenericLayout = {
  /** When set, the verb itself is shown as the first header (e.g. "Infinitive"). */
  infinitiveLabel?: string;
  /** Extra non-finite forms the model returns (STRING fields). */
  headers: { key: string; label: string }[];
  /** Display groups; each tense key is a STRING[] of length persons.length. */
  groups: { mood: string; tenses: { key: string; label: string; persons: string[] }[] }[];
};

function genericSpec(
  code: string,
  layout: GenericLayout,
  prompt: (verb: string) => string,
): ConjugationSpec {
  const headerKeys = layout.headers.map((h) => h.key);
  const tenseKeys = layout.groups.flatMap((g) => g.tenses.map((t) => t.key));
  return {
    code,
    schema: objectSchema(headerKeys, tenseKeys),
    prompt,
    build: (verb, raw) => ({
      headers: [
        ...(layout.infinitiveLabel ? [{ label: layout.infinitiveLabel, value: verb }] : []),
        ...layout.headers.map((h) => ({ label: h.label, value: str(raw[h.key]) })),
      ],
      groups: layout.groups.map((g) => ({
        mood: g.mood,
        tenses: g.tenses.map((t) => ({
          label: t.label,
          persons: t.persons,
          forms: fixed(raw[t.key], t.persons.length),
        })),
      })),
    }),
  };
}

const JA_PLAIN = [
  "Present", "Past", "Negative", "Past negative", "Te-form", "Volitional",
  "Potential", "Passive", "Causative", "Conditional (ば)", "Conditional (たら)", "Imperative",
];
const JA_POLITE = ["Present", "Past", "Negative", "Past negative", "Volitional"];

const JA_SPEC = genericSpec(
  "ja",
  {
    headers: [],
    groups: [
      {
        mood: "",
        tenses: [
          { key: "plain", label: "Plain (普通形)", persons: JA_PLAIN },
          { key: "polite", label: "Polite (丁寧形)", persons: JA_POLITE },
        ],
      },
    ],
  },
  (verb) =>
    `Conjugate the Japanese verb "${verb}" (dictionary / plain form). Return JSON with two arrays of forms written in normal Japanese (kanji + kana).
"plain": EXACTLY ${JA_PLAIN.length} 普通形 (plain) forms, in this order: ${JA_PLAIN.join(", ")}.
"polite": EXACTLY ${JA_POLITE.length} 丁寧形 (polite, -masu) forms, in this order: ${JA_POLITE.join(", ")}.
Handle the verb's group correctly (ichidan / godan / irregular する・来る). "Conditional (ば)" is the provisional -ば form; "Conditional (たら)" is the past-conditional -たら form.`,
);

const DE_PERSONS = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
const DE_IMPERATIVE = ["du", "ihr", "Sie"];

const DE_SPEC = genericSpec(
  "de",
  {
    // English tense labels (German term in parens) — clearer for the English
    // learner and consistent with the Spanish table's English labels.
    infinitiveLabel: "Infinitive",
    headers: [{ key: "partizip2", label: "Past participle" }],
    groups: [
      {
        mood: "Indicative",
        tenses: [
          { key: "praesens", label: "Present (Präsens)", persons: DE_PERSONS },
          { key: "praeteritum", label: "Simple past (Präteritum)", persons: DE_PERSONS },
          { key: "perfekt", label: "Present perfect (Perfekt)", persons: DE_PERSONS },
          { key: "futur1", label: "Future (Futur I)", persons: DE_PERSONS },
        ],
      },
      {
        mood: "Subjunctive",
        tenses: [{ key: "konjunktiv2", label: "Subjunctive II (Konjunktiv II)", persons: DE_PERSONS }],
      },
      {
        mood: "Imperative",
        tenses: [{ key: "imperativ", label: "Imperative", persons: DE_IMPERATIVE }],
      },
    ],
  },
  (verb) =>
    `Conjugate the German verb "${verb}" (infinitive). Return JSON.
"partizip2": the past participle / Partizip II (e.g. "geschlafen", "gegangen").
Each finite tense is an array in this person order: [ich, du, er/sie/es, wir, ihr, sie/Sie].
Give ONLY the conjugated verb (with its auxiliary where applicable) WITHOUT the subject pronoun — e.g. "esse", "isst", "habe gegessen", "werde essen" (NOT "ich esse").
- "praesens", "praeteritum": simple tenses, 6 forms each.
- "perfekt": present perfect, EXACTLY 6 forms with the correct auxiliary (haben or sein), e.g. "habe geschlafen" / "bin gegangen".
- "futur1": future I, 6 forms, e.g. "werde schlafen".
- "konjunktiv2": Konjunktiv II, 6 forms (use the modern würde-form where that is the natural usage).
- "imperativ": EXACTLY 3 forms in order [du, ihr, Sie], e.g. ["schlaf", "schlaft", "schlafen Sie"].
Apply separable prefixes and stem changes correctly (e.g. essen → "isst", fahren → "fährt").`,
);

const CONJ_SPECS: Record<string, ConjugationSpec> = { es: ES_SPEC, ja: JA_SPEC, de: DE_SPEC };

/** The conjugation spec for a language, or null if it has no structured table. */
export function getConjugationSpec(code: string | null | undefined): ConjugationSpec | null {
  return CONJ_SPECS[(code ?? "").trim().toLowerCase()] ?? null;
}
