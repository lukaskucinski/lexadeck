/**
 * AI enrichment providers, shared by the in-app server action
 * (lib/actions/cards.ts enrichCard) and the batch CLI (scripts/enrich.ts).
 *
 * Env: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_ENDPOINT, AZURE_TRANSLATOR_REGION,
 *      GEMINI_API_KEY, GEMINI_MODEL,
 *      DEEPL_API_KEY + ENABLE_DEEPL_FALLBACK (optional)
 */

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

export async function azureTranslate(texts: string[]): Promise<string[]> {
  const key = env("AZURE_TRANSLATOR_KEY");
  const endpoint =
    env("AZURE_TRANSLATOR_ENDPOINT") || "https://api.cognitive.microsofttranslator.com";
  const region = env("AZURE_TRANSLATOR_REGION");
  if (!key) throw new Error("AZURE_TRANSLATOR_KEY is not set");
  if (!region) throw new Error("AZURE_TRANSLATOR_REGION is not set");

  const res = await fetch(`${endpoint}/translate?api-version=3.0&from=es&to=en`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(texts.map((Text) => ({ Text }))),
  });
  if (!res.ok) {
    throw new Error(`Azure Translator ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { translations: { text: string }[] }[];
  return data.map((item) => item.translations[0].text);
}

export async function deeplTranslate(texts: string[]): Promise<string[]> {
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
      source_lang: "ES",
      target_lang: "EN-US",
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
): Promise<{ provider: string; out: string[] }> {
  try {
    return { provider: "azure", out: await azureTranslate(texts) };
  } catch (err) {
    if (env("ENABLE_DEEPL_FALLBACK") === "true") {
      console.warn(`Azure failed (${(err as Error).message}); falling back to DeepL`);
      return { provider: "deepl_fallback", out: await deeplTranslate(texts) };
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Gemini: example sentence + gloss + emoji                            */
/* ------------------------------------------------------------------ */

export interface EnrichmentItem {
  id: string;
  example: string;
  exampleEn: string;
  emoji: string;
}

export interface EnrichableCard {
  id: string;
  term: string;
  translation: string | null;
  wordType: string;
  gender: string | null;
  notes: string | null;
}

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      example: { type: "STRING" },
      exampleEn: { type: "STRING" },
      emoji: { type: "STRING" },
    },
    required: ["id", "example", "exampleEn", "emoji"],
  },
} as const;

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

async function geminiGenerate(
  model: string,
  key: string,
  prompt: string,
): Promise<EnrichmentItem[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
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

  const parsed = JSON.parse(text) as EnrichmentItem[];
  if (!Array.isArray(parsed)) throw new Error("Gemini response is not an array");
  return parsed;
}

export async function geminiEnrich(cards: EnrichableCard[]): Promise<EnrichmentItem[]> {
  const key = env("GEMINI_API_KEY");
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  // flash-lite has its own (higher) free-tier quota — used when the primary
  // model is overloaded or this key's daily limit is exhausted (503/429).
  // Set GEMINI_FALLBACK_MODEL="" to disable.
  const fallback = env("GEMINI_FALLBACK_MODEL") ?? "gemini-2.5-flash-lite";
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const cardLines = cards.map((c) =>
    JSON.stringify({
      id: c.id,
      term: c.term,
      translation: c.translation,
      wordType: c.wordType,
      gender: c.gender,
      notes: c.notes?.slice(0, 200) ?? null,
    }),
  );

  const prompt = `You are helping build Spanish→English flashcards for an adult learner (A2/B1 level).

For EACH card below, produce:
- "example": one natural, useful Spanish sentence (8-14 words) using the term in a common context. Match the term's register. For expressions, use the expression naturally.
- "exampleEn": a natural English translation of that sentence.
- "emoji": exactly one emoji that best evokes the term's meaning ("" if nothing fits).

Do not contradict the given translation. Return a JSON array with one object per card, carrying the same "id".

Cards:
${cardLines.join("\n")}`;

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
