/**
 * One-off enrichment script. Two passes, both resumable; grammar rules skipped.
 * Cards are grouped by their deck's language and enriched with that language's
 * profile (es/ja/de); cards in untuned languages are skipped.
 *
 *   Pass 1 — Azure AI Translator F0 (primary, <lang>→EN): fills `translation`
 *            where NULL. DeepL is an optional fallback (ENABLE_DEEPL_FALLBACK=true);
 *            its Developer-tier quota is LIFETIME, so it is off by default.
 *   Pass 2 — Gemini: fills `example`, `exampleEn`, `emoji`, `reading`, details;
 *            sets `enrichedAt`.
 *
 * Usage:
 *   npx tsx scripts/enrich.ts [--limit N] [--dry-run]
 *
 * Env: AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_ENDPOINT, AZURE_TRANSLATOR_REGION,
 *      GEMINI_API_KEY, GEMINI_MODEL,
 *      DEEPL_API_KEY + ENABLE_DEEPL_FALLBACK (optional)
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import {
  geminiEnrich,
  normalizeEnrichment,
  type RawEnrichment,
  translateBatch,
} from "../lib/ai/enrichment";
import { getLanguageProfile, type LanguageProfile } from "../lib/ai/languages";
import { detailsFromEnrichment } from "../lib/cardDetails";
import { prisma } from "../lib/db";

/**
 * Group cards into enrichable buckets, dropping untuned languages. Buckets are
 * keyed by language by default (translation); the Gemini pass keys by
 * language+subject so each bucket's prompt carries one subject context.
 */
function groupEnrichable<T extends { deck: { language: string } }>(
  cards: T[],
  keyOf: (c: T) => string = (c) => c.deck.language,
): { groups: Map<string, T[]>; skipped: number } {
  const groups = new Map<string, T[]>();
  let skipped = 0;
  for (const c of cards) {
    if (!getLanguageProfile(c.deck.language)) {
      skipped++;
      continue;
    }
    const k = keyOf(c);
    const list = groups.get(k);
    if (list) list.push(c);
    else groups.set(k, [c]);
  }
  return { groups, skipped };
}

const { values: args } = parseArgs({
  options: {
    limit: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DRY = args["dry-run"];

const GEMINI_BATCH = Number(process.env.GEMINI_BATCH ?? 20);
const GEMINI_PACE_MS = 10_000; // stay well under free-tier RPM
const GEMINI_RETRY_DELAY_MS = 30_000; // backoff before retrying a failed batch

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Pass 1 — translation (providers live in lib/ai/enrichment.ts)       */
/* ------------------------------------------------------------------ */

async function passTranslate(): Promise<void> {
  const cards = await prisma.card.findMany({
    where: { translation: null, wordType: { not: "GRAMMAR" } },
    select: { id: true, term: true, deck: { select: { language: true } } },
    orderBy: { createdAt: "asc" },
  });

  const { groups, skipped } = groupEnrichable(cards);
  const total = cards.length - skipped;
  console.log(
    `Pass 1 (Azure Translator): ${total} cards missing translations` +
      (skipped ? ` (${skipped} skipped — untuned language)` : ""),
  );
  if (total === 0 || DRY) {
    if (DRY && total > 0) {
      for (const [lang, group] of groups) {
        console.log(`  dry-run [${lang}], would translate:`, group.map((c) => c.term).join(", "));
      }
    }
    return;
  }

  for (const [lang, group] of groups) {
    const profile = getLanguageProfile(lang)!;
    for (let i = 0; i < group.length; i += 50) {
      const batch = group.slice(i, i + 50);
      const { provider, out } = await translateBatch(batch.map((c) => c.term), profile);
      for (let j = 0; j < batch.length; j++) {
        await prisma.card.update({
          where: { id: batch[j].id },
          data: { translation: out[j] },
        });
        console.log(`  [${provider}/${lang}] ${batch[j].term} → ${out[j]}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Pass 2 — Gemini enrichment (provider lives in lib/ai/enrichment.ts) */
/* ------------------------------------------------------------------ */

type GeminiCard = {
  id: string;
  term: string;
  translation: string | null;
  wordType: string;
  gender: string | null;
  notes: string | null;
  deck: { language: string; subject: string };
};

async function enrichGroup(
  group: GeminiCard[],
  profile: LanguageProfile,
  subject: string,
): Promise<void> {
  async function enrichWithRetry(batch: GeminiCard[]): Promise<RawEnrichment[]> {
    try {
      return await geminiEnrich(batch, profile, subject);
    } catch (err) {
      console.warn(`  transient failure (${(err as Error).message.slice(0, 80)}…) — retrying in 30s`);
      await sleep(GEMINI_RETRY_DELAY_MS);
      return geminiEnrich(batch, profile, subject);
    }
  }

  for (let i = 0; i < group.length; i += GEMINI_BATCH) {
    const batch = group.slice(i, i + GEMINI_BATCH);
    try {
      const raws = await enrichWithRetry(batch);
      const byId = new Map(raws.map((r) => [String(r.id), normalizeEnrichment(r, profile)]));
      for (const card of batch) {
        const item = byId.get(card.id);
        if (!item) {
          console.warn(`  ! no enrichment returned for "${card.term}" — will retry next run`);
          continue;
        }
        await prisma.card.update({
          where: { id: card.id },
          data: {
            example: item.example || null,
            exampleEn: item.exampleEn || null,
            emoji: item.emoji || null, // already sanitized by normalizeEnrichment
            conjugation: item.conjugation || undefined, // keep any existing if AI gave none
            details: detailsFromEnrichment(item),
            enrichedAt: new Date(),
          },
        });
      }
      console.log(`  [${profile.code}] enriched ${Math.min(i + GEMINI_BATCH, group.length)}/${group.length}`);
    } catch (err) {
      console.error(`  batch failed (cards ${i}–${i + batch.length}): ${(err as Error).message}`);
      console.error("  continuing; re-run the script to retry failed cards.");
    }
    if (i + GEMINI_BATCH < group.length) await sleep(GEMINI_PACE_MS);
  }
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
      deck: { select: { language: true, subject: true } },
    },
    orderBy: { createdAt: "asc" },
    take: Number.isFinite(LIMIT) ? Number(LIMIT) : undefined,
  });

  const { groups, skipped } = groupEnrichable(
    cards,
    (c) => `${c.deck.language} ${c.deck.subject}`,
  );
  const total = cards.length - skipped;
  console.log(
    `Pass 2 (Gemini): ${total} cards to enrich` +
      (skipped ? ` (${skipped} skipped — untuned language)` : ""),
  );
  if (total === 0 || DRY) {
    if (DRY && total > 0) {
      console.log(`  dry-run, would enrich in ${Math.ceil(total / GEMINI_BATCH)} batches`);
    }
    return;
  }

  for (const group of groups.values()) {
    const { language, subject } = group[0].deck;
    await enrichGroup(group, getLanguageProfile(language)!, subject);
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  await passTranslate();
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
