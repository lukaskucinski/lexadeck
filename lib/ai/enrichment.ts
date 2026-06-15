/**
 * AI enrichment providers, shared by the in-app server action
 * (lib/actions/cards.ts enrichCard) and the batch CLI (scripts/enrich.ts).
 *
 * Env: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_ENDPOINT, AZURE_TRANSLATOR_REGION,
 *      GEMINI_API_KEY, GEMINI_MODEL,
 *      DEEPL_API_KEY + ENABLE_DEEPL_FALLBACK (optional)
 */
import { sanitizeEmoji } from "../emoji";
import { WordType } from "../types";
import type { Gender } from "../types";
import type { ConjugationSpec } from "../conjugation";
import { buildEnrichmentPrompt } from "./enrichmentPrompt";
import { DEFAULT_PROFILE, type LanguageProfile } from "./languages";

/**
 * Values pasted into dashboards (e.g. Vercel env vars) can carry a BOM
 * (U+FEFF) or stray whitespace; a BOM-prefixed key corrupts HTTP headers
 * ("Cannot convert argument to a ByteString… 65279") and query strings
 * ("API key not valid"). Returns undefined only when the var is unset.
 */
function env(name: string): string | undefined {
  const raw = process.env[name];
  return raw == null ? undefined : raw.replace(/\uFEFF/g, "").trim();
}

/* ------------------------------------------------------------------ */
/* Translation: Azure AI Translator primary, DeepL optional fallback   */
/* ------------------------------------------------------------------ */

export async function azureTranslate(
  texts: string[],
  profile: LanguageProfile = DEFAULT_PROFILE,
): Promise<string[]> {
  const key = env("AZURE_TRANSLATOR_KEY");
  const endpoint =
    env("AZURE_TRANSLATOR_ENDPOINT") || "https://api.cognitive.microsofttranslator.com";
  const region = env("AZURE_TRANSLATOR_REGION");
  if (!key) throw new Error("AZURE_TRANSLATOR_KEY is not set");
  if (!region) throw new Error("AZURE_TRANSLATOR_REGION is not set");

  const res = await fetch(
    `${endpoint}/translate?api-version=3.0&from=${profile.azure.from}&to=${profile.azure.to}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map((Text) => ({ Text }))),
    },
  );
  if (!res.ok) {
    throw new Error(`Azure Translator ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { translations: { text: string }[] }[];
  return data.map((item) => item.translations[0].text);
}

export async function deeplTranslate(
  texts: string[],
  profile: LanguageProfile = DEFAULT_PROFILE,
): Promise<string[]> {
  const key = env("DEEPL_API_KEY");
  const base = env("DEEPL_API_BASE_URL") || "https://api-free.deepl.com/v2";
  if (!key) throw new Error("DEEPL_API_KEY is not set");

  const res = await fetch(`${base}/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: profile.deepl?.source ?? "ES",
      target_lang: profile.deepl?.target ?? "EN-US",
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepL ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { translations: { text: string }[] };
  return data.translations.map((t) => t.text);
}

export async function translateBatch(
  texts: string[],
  profile: LanguageProfile = DEFAULT_PROFILE,
): Promise<{ provider: string; out: string[] }> {
  try {
    return { provider: "azure", out: await azureTranslate(texts, profile) };
  } catch (err) {
    if (env("ENABLE_DEEPL_FALLBACK") === "true") {
      console.warn(`Azure failed (${(err as Error).message}); falling back to DeepL`);
      return { provider: "deepl_fallback", out: await deeplTranslate(texts, profile) };
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Gemini: example sentence + gloss + emoji                            */
/* ------------------------------------------------------------------ */

/**
 * A target-language synonym paired with its direct English gloss (shown on
 * hover). The `es` key is historical — it now holds the synonym in whatever the
 * deck's language is (Spanish, Japanese, German), not necessarily Spanish.
 */
// `type` (not `interface`) for an implicit index signature → Prisma Json-assignable.
export type Synonym = {
  es: string;
  en: string;
};

/** Normalized enrichment for one card. Detail-layer fields are "" / [] when n/a. */
export interface EnrichmentItem {
  id: string;
  // classification — consumed only by the create-time auto-fill path
  wordType: string;
  gender: string | null;
  // core
  example: string;
  exampleEn: string;
  emoji: string;
  /** Pronunciation reading (e.g. Japanese kana/romaji); "" when not applicable. */
  reading: string;
  // detail layer
  usagePattern: string;
  collocations: string[];
  conjugation: string;
  etymology: string;
  wordFamily: string[];
  synonyms: Synonym[];
  correction: string;
}

/** Raw, unvalidated object as Gemini returns it — always run through normalizeEnrichment. */
export type RawEnrichment = { id: string } & Record<string, unknown>;

export interface EnrichableCard {
  id: string;
  term: string;
  translation: string | null;
  /** null = unknown (create-time path): the model infers it. */
  wordType: string | null;
  gender: string | null;
  notes: string | null;
}

const STRING_FIELDS = ["id", "wordType", "gender", "example", "exampleEn", "emoji",
  "reading", "usagePattern", "conjugation", "etymology", "correction"] as const;

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      wordType: { type: "STRING", enum: Object.values(WordType) },
      gender: { type: "STRING" },
      example: { type: "STRING" },
      exampleEn: { type: "STRING" },
      emoji: { type: "STRING" },
      reading: { type: "STRING" },
      usagePattern: { type: "STRING" },
      collocations: { type: "ARRAY", items: { type: "STRING" } },
      conjugation: { type: "STRING" },
      etymology: { type: "STRING" },
      wordFamily: { type: "ARRAY", items: { type: "STRING" } },
      synonyms: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { es: { type: "STRING" }, en: { type: "STRING" } },
          required: ["es", "en"],
        },
      },
      correction: { type: "STRING" },
    },
    required: [...STRING_FIELDS, "collocations", "wordFamily", "synonyms"],
  },
} as const;

const MAX_COLLOCATIONS = 5;
const MAX_WORD_FAMILY = 4;
const MAX_SYNONYMS = 6;
const WORD_TYPES = new Set<string>(Object.values(WordType));

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function trimList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .slice(0, max);
}

function trimSynonyms(v: unknown, max: number): Synonym[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { es: trimStr(o.es), en: trimStr(o.en) };
    })
    .filter((s) => s.es.length > 0 && s.en.length > 0)
    .slice(0, max);
}

/**
 * Defensively coerce a raw Gemini object into a typed EnrichmentItem: trims
 * strings, caps + de-blanks list fields, validates the part-of-speech against
 * WordType (fallback OTHER), keeps gender only on nouns of gendered languages,
 * and drops non-emoji symbols (sanitizeEmoji). The single trusted gate for every
 * enrichment caller. `profile` defaults to Spanish so legacy callers are unchanged.
 */
export function normalizeEnrichment(
  raw: Record<string, unknown>,
  profile: LanguageProfile = DEFAULT_PROFILE,
): EnrichmentItem {
  const wordTypeRaw = trimStr(raw.wordType).toUpperCase();
  const wordType = WORD_TYPES.has(wordTypeRaw) ? wordTypeRaw : "OTHER";

  const genderRaw = trimStr(raw.gender).toUpperCase() as Gender;
  const gender =
    profile.gender.enabled && wordType === "NOUN" && profile.gender.values.includes(genderRaw)
      ? genderRaw
      : null;

  return {
    id: trimStr(raw.id),
    wordType,
    gender,
    example: trimStr(raw.example),
    exampleEn: trimStr(raw.exampleEn),
    emoji: sanitizeEmoji(trimStr(raw.emoji)) ?? "",
    reading: trimStr(raw.reading),
    usagePattern: trimStr(raw.usagePattern),
    collocations: trimList(raw.collocations, MAX_COLLOCATIONS),
    conjugation: trimStr(raw.conjugation),
    etymology: trimStr(raw.etymology),
    wordFamily: trimList(raw.wordFamily, MAX_WORD_FAMILY),
    synonyms: trimSynonyms(raw.synonyms, MAX_SYNONYMS),
    correction: trimStr(raw.correction),
  };
}

class GeminiHttpError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Gemini ${status}: ${body}`);
  }
}

/** Overloaded / rate-limited / transient — worth retrying on another model. */
function isRetryable(err: unknown): boolean {
  return (
    err instanceof GeminiHttpError &&
    (err.status === 429 || err.status >= 500)
  );
}

/** One structured-output request → parsed JSON (array or object per the schema). */
async function geminiRequest(
  model: string,
  key: string,
  prompt: string,
  schema: unknown,
): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.4,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new GeminiHttpError(res.status, await res.text());
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

async function geminiGenerate(
  model: string,
  key: string,
  prompt: string,
): Promise<RawEnrichment[]> {
  const parsed = await geminiRequest(model, key, prompt, RESPONSE_SCHEMA);
  if (!Array.isArray(parsed)) throw new Error("Gemini response is not an array");
  return parsed as RawEnrichment[];
}

export async function geminiEnrich(
  cards: EnrichableCard[],
  profile: LanguageProfile = DEFAULT_PROFILE,
  subject?: string,
): Promise<RawEnrichment[]> {
  const key = env("GEMINI_API_KEY");
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  // flash-lite has its own (higher) free-tier quota — used when the primary
  // model is overloaded or this key's daily limit is exhausted (503/429).
  // Set GEMINI_FALLBACK_MODEL="" to disable.
  const fallback = env("GEMINI_FALLBACK_MODEL") ?? "gemini-2.5-flash-lite";
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const prompt = buildEnrichmentPrompt(profile, cards, subject);

  try {
    return await geminiGenerate(model, key, prompt);
  } catch (err) {
    if (fallback && fallback !== model && isRetryable(err)) {
      console.warn(
        `Gemini ${model} unavailable (${(err as Error).message.slice(0, 120)}…) — retrying with ${fallback}`,
      );
      return geminiGenerate(fallback, key, prompt);
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Gemini: verb conjugation (per-language; the prompt + responseSchema  */
/* come from the language's ConjugationSpec in lib/conjugation.ts)      */
/* ------------------------------------------------------------------ */

/**
 * Run one verb's conjugation request for the given language spec → the raw JSON
 * object (defensively coerced). Each ConjugationSpec supplies the prompt +
 * responseSchema; lib/conjugation.ts (spec.build) turns the raw object into the
 * display ConjugationData (Spanish derives its compound tenses there).
 */
export async function geminiConjugate(
  verb: string,
  spec: ConjugationSpec,
): Promise<Record<string, unknown>> {
  const key = env("GEMINI_API_KEY");
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const fallback = env("GEMINI_FALLBACK_MODEL") ?? "gemini-2.5-flash-lite";
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const prompt = spec.prompt(verb);
  const run = (m: string) => geminiRequest(m, key, prompt, spec.schema);
  const toObj = (parsed: unknown): Record<string, unknown> =>
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  try {
    return toObj(await run(model));
  } catch (err) {
    if (fallback && fallback !== model && isRetryable(err)) {
      console.warn(
        `Gemini ${model} unavailable (${(err as Error).message.slice(0, 120)}…) — retrying with ${fallback}`,
      );
      return toObj(await run(fallback));
    }
    throw err;
  }
}
