/**
 * One-off enrichment script. Two passes, both resumable; grammar rules skipped.
 *
 *   Pass 1 — DeepL (authoritative ES→EN): fills `translation` where NULL.
 *   Pass 2 — Gemini: fills `example`, `exampleEn`, `emoji`; sets `enrichedAt`.
 *
 * Usage:
 *   npx tsx scripts/enrich.ts [--limit N] [--dry-run]
 *
 * Env: DEEPL_API_KEY, DEEPL_API_BASE_URL, GEMINI_API_KEY, GEMINI_MODEL
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "../lib/db";

const { values: args } = parseArgs({
  options: {
    limit: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DRY = args["dry-run"];

const GEMINI_BATCH = 20;
const GEMINI_PACE_MS = 7_000; // free tier: 10 requests/min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Pass 1 — DeepL translation                                          */
/* ------------------------------------------------------------------ */

async function deeplTranslate(texts: string[]): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY;
  const base = process.env.DEEPL_API_BASE_URL ?? "https://api-free.deepl.com/v2";
  if (!key) throw new Error("DEEPL_API_KEY is not set in .env");

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

async function passDeepl(): Promise<void> {
  const cards = await prisma.card.findMany({
    where: { translation: null, wordType: { not: "GRAMMAR" } },
    select: { id: true, term: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Pass 1 (DeepL): ${cards.length} cards missing translations`);
  if (cards.length === 0 || DRY) {
    if (DRY && cards.length > 0) {
      console.log("  dry-run, would translate:", cards.map((c) => c.term).join(", "));
    }
    return;
  }

  for (let i = 0; i < cards.length; i += 50) {
    const batch = cards.slice(i, i + 50);
    const translations = await deeplTranslate(batch.map((c) => c.term));
    for (let j = 0; j < batch.length; j++) {
      await prisma.card.update({
        where: { id: batch[j].id },
        data: { translation: translations[j] },
      });
      console.log(`  ${batch[j].term} → ${translations[j]}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pass 2 — Gemini enrichment                                          */
/* ------------------------------------------------------------------ */

interface EnrichmentItem {
  id: string;
  example: string;
  exampleEn: string;
  emoji: string;
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

async function geminiEnrich(
  cards: {
    id: string;
    term: string;
    translation: string | null;
    wordType: string;
    gender: string | null;
    notes: string | null;
  }[],
): Promise<EnrichmentItem[]> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env");

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
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
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

async function passGemini(): Promise<void> {
  const cards = await prisma.card.findMany({
    where: { enrichedAt: null, wordType: { not: "GRAMMAR" } },
    select: {
      id: true,
      term: true,
      translation: true,
      wordType: true,
      gender: true,
      notes: true,
    },
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(LIMIT) ? Number(LIMIT) : undefined,
  });

  console.log(`Pass 2 (Gemini): ${cards.length} cards to enrich`);
  if (cards.length === 0 || DRY) {
    if (DRY && cards.length > 0) {
      console.log(`  dry-run, would enrich in ${Math.ceil(cards.length / GEMINI_BATCH)} batches`);
    }
    return;
  }

  for (let i = 0; i < cards.length; i += GEMINI_BATCH) {
    const batch = cards.slice(i, i + GEMINI_BATCH);
    try {
      const items = await geminiEnrich(batch);
      const byId = new Map(items.map((item) => [item.id, item]));
      for (const card of batch) {
        const item = byId.get(card.id);
        if (!item) {
          console.warn(`  ! no enrichment returned for "${card.term}" — will retry next run`);
          continue;
        }
        await prisma.card.update({
          where: { id: card.id },
          data: {
            example: item.example.trim() || null,
            exampleEn: item.exampleEn.trim() || null,
            emoji: item.emoji.trim() || null,
            enrichedAt: new Date(),
          },
        });
      }
      console.log(`  enriched ${Math.min(i + GEMINI_BATCH, cards.length)}/${cards.length}`);
    } catch (err) {
      console.error(`  batch failed (cards ${i}–${i + batch.length}): ${(err as Error).message}`);
      console.error("  continuing; re-run the script to retry failed cards.");
    }
    if (i + GEMINI_BATCH < cards.length) await sleep(GEMINI_PACE_MS);
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  await passDeepl();
  await passGemini();

  const remaining = await prisma.card.count({
    where: { enrichedAt: null, wordType: { not: "GRAMMAR" } },
  });
  const untranslated = await prisma.card.count({
    where: { translation: null, wordType: { not: "GRAMMAR" } },
  });
  console.log(`\nDone. Unenriched vocab cards remaining: ${remaining}; untranslated: ${untranslated}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
