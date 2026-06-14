"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type EnrichmentItem,
  geminiConjugate,
  geminiEnrich,
  normalizeEnrichment,
  translateBatch,
} from "@/lib/ai/enrichment";
import { getLanguageProfile, type LanguageProfile } from "@/lib/ai/languages";
import { requireUser } from "@/lib/auth";
import {
  detailsFromEnrichment,
  type EnrichmentPreview,
  getCardDetails,
  withoutCorrection,
} from "@/lib/cardDetails";
import { buildConjugationTable, type ConjTable, normalizeSimpleConjugation } from "@/lib/conjugation";
import { prisma } from "@/lib/db";
import { sanitizeEmoji } from "@/lib/emoji";
import { type EnrichTargetBucket, isQuotaError } from "@/lib/enrichBatch";
import { Prisma } from "@/lib/generated/prisma/client";
import { emptySchedulerFields } from "@/lib/srs";
import { CardType, Gender, WordType } from "@/lib/types";
import type { ActionState } from "./decks";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || null);

const cardSchema = z.object({
  term: z.string().trim().min(1, "Term is required").max(200),
  translation: optional(500),
  cardType: z.enum(Object.values(CardType) as [string, ...string[]]),
  wordType: z.enum(Object.values(WordType) as [string, ...string[]]),
  gender: z
    .string()
    .transform((s) => s || null)
    .pipe(
      z
        .enum(Object.values(Gender) as [string, ...string[]])
        .nullable(),
    ),
  notes: optional(5000),
  conjugation: optional(2000),
  example: optional(500),
  exampleEn: optional(500),
  emoji: optional(16).refine(
    (v) => v === null || sanitizeEmoji(v) !== null,
    "Emoji field accepts 1–3 emoji only",
  ),
});

function cardDataFromForm(formData: FormData) {
  const parsed = cardSchema.safeParse({
    term: formData.get("term"),
    translation: formData.get("translation") ?? "",
    cardType: formData.get("cardType") ?? "VOCAB",
    wordType: formData.get("wordType") ?? "OTHER",
    gender: formData.get("gender") ?? "",
    notes: formData.get("notes") ?? "",
    conjugation: formData.get("conjugation") ?? "",
    example: formData.get("example") ?? "",
    exampleEn: formData.get("exampleEn") ?? "",
    emoji: formData.get("emoji") ?? "",
  });
  if (!parsed.success) return parsed;
  // gender only applies to nouns
  if (parsed.data.wordType !== "NOUN") parsed.data.gender = null;
  return parsed;
}

/**
 * The new-card form's "Auto-fill" carries the AI detail layer in a hidden
 * `details` field (the scalar fields prefill visible inputs). Parse it back
 * defensively — a present, valid value means the card was AI-enriched at birth.
 */
function parseEnrichmentField(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return getCardDetails(JSON.parse(raw));
  } catch {
    return null;
  }
}

function revalidateCardPaths(deckId: string) {
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/library");
  revalidatePath("/");
}

/** Throws unless the card exists and belongs to the signed-in user. */
async function requireOwnedCard(cardId: string): Promise<void> {
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    select: { id: true },
  });
  if (!card) throw new Error("Card not found");
}

export async function createCard(
  deckId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = cardDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId: user.id } });
  if (!deck) return { error: "Deck not found" };

  const dupe = await prisma.card.findFirst({
    where: { deckId, term: { equals: parsed.data.term, mode: "insensitive" } },
    select: { term: true },
  });
  if (dupe) return { error: `“${dupe.term}” is already in this deck` };

  const enrichment = parseEnrichmentField(formData.get("details"));

  await prisma.card.create({
    data: {
      deckId,
      language: deck.language,
      ...parsed.data,
      ...emptySchedulerFields(),
      ...(enrichment ? { details: enrichment, enrichedAt: new Date() } : {}),
    },
  });
  revalidateCardPaths(deckId);

  if (formData.get("addAnother") === "true") {
    return {}; // stay on the form
  }
  redirect(`/decks/${deckId}?view=list&sort=createdAt&dir=desc`);
}

export async function updateCard(
  cardId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    select: { term: true, translation: true, details: true },
  });
  if (!existing) throw new Error("Card not found");

  const parsed = cardDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // a stale "did you mean…?" no longer applies once term/translation changes
  const edited =
    parsed.data.term !== existing.term ||
    (parsed.data.translation ?? null) !== (existing.translation ?? null);
  const data =
    edited && getCardDetails(existing.details).correction
      ? { ...parsed.data, details: withoutCorrection(existing.details) }
      : parsed.data;

  const card = await prisma.card.update({ where: { id: cardId }, data });
  revalidateCardPaths(card.deckId);
  redirect(`/decks/${card.deckId}/cards/${cardId}`);
}

/** Kanban drag-and-drop reclassification. */
export async function setCardWordType(
  cardId: string,
  wordType: WordType,
): Promise<void> {
  await requireOwnedCard(cardId);
  const data: { wordType: WordType; gender?: null } = { wordType };
  if (wordType !== "NOUN") data.gender = null;
  const card = await prisma.card.update({ where: { id: cardId }, data });
  revalidateCardPaths(card.deckId);
}

/** Kanban multi-card drag: reclassify a whole selection at once (ownership-scoped). */
export async function setCardsWordType(
  cardIds: string[],
  wordType: WordType,
): Promise<void> {
  if (cardIds.length === 0) return;
  const user = await requireUser();
  const owned = { deck: { userId: user.id } };
  const data: { wordType: WordType; gender?: null } = { wordType };
  if (wordType !== "NOUN") data.gender = null;
  const first = await prisma.card.findFirst({
    where: { id: cardIds[0], ...owned },
    select: { deckId: true },
  });
  await prisma.card.updateMany({ where: { id: { in: cardIds }, ...owned }, data });
  if (first) revalidateCardPaths(first.deckId);
}

/**
 * Build the `Card.update` data for an enrichment result, mirroring the safe
 * re-enrich rules: regenerate the detail layer but preserve any on-demand
 * conjugation table, keep existing example/emoji/conjugation when the AI returns
 * nothing, and never touch classification (wordType/gender). Shared by the
 * single-card and deck-batch enrich paths.
 */
function enrichmentUpdateData(
  card: {
    example: string | null;
    exampleEn: string | null;
    emoji: string | null;
    conjugation: string | null;
    details: unknown;
  },
  item: EnrichmentItem,
  translation: string | null,
) {
  const details = detailsFromEnrichment(item);
  const priorTable = getCardDetails(card.details).conjugationTable;
  if (priorTable) details.conjugationTable = priorTable;
  return {
    translation,
    example: item.example || card.example,
    exampleEn: item.exampleEn || card.exampleEn,
    // item.emoji is pre-sanitized ("" when not a real emoji) — keep existing if empty
    emoji: item.emoji || card.emoji,
    conjugation: item.conjugation || card.conjugation,
    details,
    enrichedAt: new Date(),
  };
}

/**
 * In-app AI enrichment for a single card: fills a missing translation
 * (Azure Translator) and generates example/exampleEn/emoji + the detail layer
 * (Gemini). Classification (wordType/gender) is left to the user.
 */
export async function enrichCard(cardId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    include: { deck: { select: { language: true } } },
  });
  if (!card) return { error: "Card not found" };
  if (card.wordType === "GRAMMAR") {
    return { error: "Grammar cards aren't auto-enriched" };
  }
  const profile = getLanguageProfile(card.deck.language);
  if (!profile) {
    return { error: "AI enrichment isn't available for this deck's language yet" };
  }

  try {
    let translation = card.translation;
    if (!translation) {
      const { out } = await translateBatch([card.term], profile);
      translation = out[0]?.trim() || null;
    }

    const [raw] = await geminiEnrich(
      [
        {
          id: card.id,
          term: card.term,
          translation,
          wordType: card.wordType,
          gender: card.gender,
          notes: card.notes,
        },
      ],
      profile,
    );
    if (!raw) return { error: "The AI returned no enrichment for this card" };

    await prisma.card.update({
      where: { id: cardId },
      data: enrichmentUpdateData(card, normalizeEnrichment(raw, profile), translation),
    });
    revalidateCardPaths(card.deckId);
    revalidatePath(`/decks/${card.deckId}/cards/${cardId}`);
    return {};
  } catch (err) {
    return { error: (err as Error).message.slice(0, 200) };
  }
}

/**
 * Auto-fill for the new-card form: enriches a typed term that has no card yet
 * and returns translation + classification + the detail layer for review.
 * Persists nothing — the form prefills and the user saves explicitly.
 * Spanish decks only (the Gemini prompt is Spanish-tuned).
 */
export async function previewEnrichment(
  deckId: string,
  term: string,
): Promise<{ preview?: EnrichmentPreview; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { error: gate.error };

  const cleaned = term.trim();
  if (!cleaned) return { error: "Enter a term first" };
  if (cleaned.length > 200) return { error: "Term is too long" };

  try {
    const { out } = await translateBatch([cleaned], gate.profile);
    const translation = out[0]?.trim() || null;

    const [raw] = await geminiEnrich(
      [{ id: "preview", term: cleaned, translation, wordType: null, gender: null, notes: null }],
      gate.profile,
    );
    if (!raw) return { error: "The AI returned no suggestion" };
    const item = normalizeEnrichment(raw, gate.profile);

    return {
      preview: {
        translation,
        wordType: item.wordType,
        gender: item.gender,
        example: item.example,
        exampleEn: item.exampleEn,
        emoji: item.emoji,
        conjugation: item.conjugation,
        details: detailsFromEnrichment(item),
        correction: item.correction,
      },
    };
  } catch (err) {
    return { error: (err as Error).message.slice(0, 200) };
  }
}

/**
 * Generate + cache the full conjugation table for one verb card record. Gemini
 * returns only the SIMPLE forms; lib/conjugation.ts derives every compound tense
 * from the participle + the fixed `haber` paradigm. A cached table is returned
 * untouched. The caller owns auth + the VERB/es gate.
 */
async function buildAndCacheConjugation(card: {
  id: string;
  term: string;
  details: unknown;
}): Promise<ConjTable> {
  const existing = getCardDetails(card.details);
  if (existing.conjugationTable) return existing.conjugationTable;
  const raw = await geminiConjugate(card.term);
  const table = buildConjugationTable(card.term, normalizeSimpleConjugation(raw));
  await prisma.card.update({
    where: { id: card.id },
    data: { details: { ...existing, conjugationTable: table } },
  });
  return table;
}

/**
 * Generate (and cache) the full conjugation table for a verb card, on demand.
 * Spanish verbs only.
 */
export async function conjugateVerb(
  cardId: string,
): Promise<{ table?: ConjTable; error?: string }> {
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    include: { deck: { select: { language: true } } },
  });
  if (!card) return { error: "Card not found" };
  if (card.wordType !== "VERB") return { error: "Only verbs can be conjugated" };
  if (card.deck.language !== "es") {
    return { error: "Conjugation currently supports Spanish verbs only" };
  }

  try {
    const table = await buildAndCacheConjugation(card);
    revalidatePath(`/decks/${card.deckId}/cards/${cardId}`);
    return { table };
  } catch (err) {
    return { error: (err as Error).message.slice(0, 200) };
  }
}

/* ------------------------------------------------------------------ */
/* Deck-level batch enrichment ("Enrich all")                          */
/* ------------------------------------------------------------------ */

const NON_GRAMMAR = { not: "GRAMMAR" } as const;

/**
 * Resolve a user-owned deck and its enrichment LanguageProfile. Only languages
 * with a tuned profile (es/ja/de) are enrichable; everything else is rejected.
 */
async function requireEnrichableDeck(
  deckId: string,
): Promise<{ userId: string; profile: LanguageProfile } | { error: string }> {
  const user = await requireUser();
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: user.id },
    select: { language: true },
  });
  if (!deck) return { error: "Deck not found" };
  const profile = getLanguageProfile(deck.language);
  if (!profile) {
    return { error: "AI enrichment isn't available for this deck's language yet" };
  }
  return { userId: user.id, profile };
}

/** Prisma where-fragment for a deck's non-grammar cards in one enrich bucket. */
function bucketWhere(deckId: string, bucket: EnrichTargetBucket): Prisma.CardWhereInput {
  const base: Prisma.CardWhereInput = { deckId, wordType: NON_GRAMMAR };
  switch (bucket) {
    case "neverEnriched":
      return { ...base, enrichedAt: null };
    case "stale": // enriched before the detail layer existed (details IS NULL)
      return { ...base, enrichedAt: { not: null }, details: { equals: Prisma.DbNull } };
    case "enriched": // fully enriched — already has a detail layer
      return {
        ...base,
        enrichedAt: { not: null },
        NOT: { details: { equals: Prisma.DbNull } },
      };
  }
}

export interface EnrichTargetCounts {
  neverEnriched: number;
  stale: number;
  enriched: number;
  /** verbs with no cached conjugation table — drives the optional second pass */
  verbsWithoutTable: number;
}

/** Per-bucket counts for the deck enrich panel. Spanish decks only. */
export async function getEnrichTargets(
  deckId: string,
): Promise<{ counts?: EnrichTargetCounts; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { error: gate.error };

  const [neverEnriched, stale, enriched, verbs] = await Promise.all([
    prisma.card.count({ where: bucketWhere(deckId, "neverEnriched") }),
    prisma.card.count({ where: bucketWhere(deckId, "stale") }),
    prisma.card.count({ where: bucketWhere(deckId, "enriched") }),
    // conjugation tables are language-specific; only count when this language has them
    gate.profile.conjugation.table
      ? prisma.card.findMany({ where: { deckId, wordType: "VERB" }, select: { details: true } })
      : Promise.resolve([]),
  ]);
  const verbsWithoutTable = verbs.filter(
    (v) => !getCardDetails(v.details).conjugationTable,
  ).length;

  return { counts: { neverEnriched, stale, enriched, verbsWithoutTable } };
}

const ENRICH_BUCKETS: readonly EnrichTargetBucket[] = ["neverEnriched", "stale", "enriched"];

/** Card ids to enrich for the selected buckets (creation order). */
export async function getEnrichCardIds(
  deckId: string,
  buckets: EnrichTargetBucket[],
): Promise<{ ids?: string[]; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { error: gate.error };

  const valid = buckets.filter((b) => ENRICH_BUCKETS.includes(b));
  if (valid.length === 0) return { ids: [] };

  const cards = await prisma.card.findMany({
    where: { OR: valid.map((b) => bucketWhere(deckId, b)) },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return { ids: cards.map((c) => c.id) };
}

export interface CardEnrichResult {
  id: string;
  ok: boolean;
  error?: string;
}

/**
 * Enrich one slice of cards in a single Gemini request (+ one Azure batch for
 * any missing translations). The client orchestrates the slices so each call
 * stays short. Returns a per-card outcome and a `quotaExhausted` flag so the run
 * can stop gracefully when the daily AI limit is hit — it resumes on a later
 * click because finished cards drop out of the target buckets.
 */
export async function enrichCards(
  deckId: string,
  cardIds: string[],
): Promise<{ results: CardEnrichResult[]; quotaExhausted: boolean; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { results: [], quotaExhausted: false, error: gate.error };
  if (cardIds.length === 0) return { results: [], quotaExhausted: false };

  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds }, deckId, deck: { userId: gate.userId }, wordType: NON_GRAMMAR },
  });
  if (cards.length === 0) return { results: [], quotaExhausted: false };

  try {
    // fill missing translations in one Azure batch; keep the rest as-is
    const needTranslation = cards.filter((c) => !c.translation);
    const translated = new Map<string, string | null>();
    if (needTranslation.length) {
      const { out } = await translateBatch(needTranslation.map((c) => c.term), gate.profile);
      needTranslation.forEach((c, i) => translated.set(c.id, out[i]?.trim() || null));
    }
    const translationFor = (c: (typeof cards)[number]) =>
      translated.has(c.id) ? (translated.get(c.id) ?? null) : c.translation;

    // one enrichment request for the whole slice (the quota-efficient part)
    const raws = await geminiEnrich(
      cards.map((c) => ({
        id: c.id,
        term: c.term,
        translation: translationFor(c),
        wordType: c.wordType,
        gender: c.gender,
        notes: c.notes,
      })),
      gate.profile,
    );
    const byId = new Map(raws.map((r) => [String(r.id), r]));

    const results: CardEnrichResult[] = [];
    for (const card of cards) {
      const raw = byId.get(card.id);
      if (!raw) {
        results.push({ id: card.id, ok: false, error: "no enrichment returned" });
        continue;
      }
      await prisma.card.update({
        where: { id: card.id },
        data: enrichmentUpdateData(card, normalizeEnrichment(raw, gate.profile), translationFor(card)),
      });
      results.push({ id: card.id, ok: true });
    }
    revalidateCardPaths(deckId);
    return { results, quotaExhausted: false };
  } catch (err) {
    const message = (err as Error).message ?? "enrichment failed";
    return {
      results: cards.map((c) => ({ id: c.id, ok: false, error: message.slice(0, 160) })),
      quotaExhausted: isQuotaError(message),
      error: message.slice(0, 200),
    };
  }
}

/** Verb card ids in the deck with no cached conjugation table yet. */
export async function getConjugationTargetIds(
  deckId: string,
): Promise<{ ids?: string[]; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { error: gate.error };
  if (!gate.profile.conjugation.table) return { ids: [] };

  const verbs = await prisma.card.findMany({
    where: { deckId, wordType: "VERB" },
    select: { id: true, details: true },
    orderBy: { createdAt: "asc" },
  });
  return {
    ids: verbs.filter((v) => !getCardDetails(v.details).conjugationTable).map((v) => v.id),
  };
}

/**
 * Optional second pass: build + cache the full conjugation table for a slice of
 * verb cards (one Gemini request EACH — quota-heavy, hence opt-in). Stops the
 * slice on a quota error so the client can halt the whole run.
 */
export async function conjugateVerbs(
  deckId: string,
  cardIds: string[],
): Promise<{ results: CardEnrichResult[]; quotaExhausted: boolean; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { results: [], quotaExhausted: false, error: gate.error };
  if (!gate.profile.conjugation.table) {
    return {
      results: [],
      quotaExhausted: false,
      error: "Conjugation tables aren't available for this language yet",
    };
  }
  if (cardIds.length === 0) return { results: [], quotaExhausted: false };

  const verbs = await prisma.card.findMany({
    where: { id: { in: cardIds }, deckId, deck: { userId: gate.userId }, wordType: "VERB" },
    select: { id: true, term: true, details: true },
  });

  const results: CardEnrichResult[] = [];
  let quotaExhausted = false;
  for (const verb of verbs) {
    try {
      await buildAndCacheConjugation(verb);
      results.push({ id: verb.id, ok: true });
    } catch (err) {
      const message = (err as Error).message ?? "conjugation failed";
      results.push({ id: verb.id, ok: false, error: message.slice(0, 160) });
      if (isQuotaError(message)) {
        quotaExhausted = true;
        break; // don't keep hammering an exhausted quota
      }
    }
  }
  if (results.some((r) => r.ok)) revalidateCardPaths(deckId);
  return { results, quotaExhausted };
}

export interface ResolvedEnrichSelection {
  /** owned, non-grammar card ids from the selection — safe to enrich */
  enrichIds: string[];
  /** of those, verbs still lacking a cached conjugation table (opt-in pass) */
  verbIdsWithoutTable: string[];
  /** selected ids that won't be enriched (grammar / not owned / wrong deck) */
  skipped: number;
}

/**
 * Resolve a hand-picked selection of card ids (from the deck views) into what
 * the batch engine can act on: drops GRAMMAR / non-owned / wrong-deck ids and
 * lists verbs that still need a conjugation table. Keeps counts honest even when
 * the selection spans pages (off-page ids aren't known client-side). No AI;
 * Spanish decks only.
 */
export async function resolveEnrichSelection(
  deckId: string,
  cardIds: string[],
): Promise<{ resolved?: ResolvedEnrichSelection; error?: string }> {
  const gate = await requireEnrichableDeck(deckId);
  if ("error" in gate) return { error: gate.error };
  if (cardIds.length === 0) {
    return { resolved: { enrichIds: [], verbIdsWithoutTable: [], skipped: 0 } };
  }

  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds }, deckId, deck: { userId: gate.userId }, wordType: NON_GRAMMAR },
    select: { id: true, wordType: true, details: true },
    orderBy: { createdAt: "asc" },
  });
  const enrichIds = cards.map((c) => c.id);
  const verbIdsWithoutTable = gate.profile.conjugation.table
    ? cards
        .filter((c) => c.wordType === "VERB" && !getCardDetails(c.details).conjugationTable)
        .map((c) => c.id)
    : [];

  return {
    resolved: { enrichIds, verbIdsWithoutTable, skipped: cardIds.length - enrichIds.length },
  };
}

/** Manual mastery: a mastered card never enters study sessions. */
export async function setCardMastered(cardId: string, mastered: boolean): Promise<void> {
  await requireOwnedCard(cardId);
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { masteredAt: mastered ? new Date() : null },
  });
  revalidateCardPaths(card.deckId);
  revalidatePath(`/decks/${card.deckId}/cards/${cardId}`);
}

/**
 * Pull a card into the review rotation now. Also clears a manual mastered
 * flag — "unmaster" means the card should be studyable again.
 */
export async function queueCardForReview(cardId: string): Promise<void> {
  await requireOwnedCard(cardId);
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { due: new Date(), masteredAt: null },
  });
  revalidateCardPaths(card.deckId);
  revalidatePath(`/decks/${card.deckId}/cards/${cardId}`);
}

export async function deleteCard(cardId: string): Promise<void> {
  await requireOwnedCard(cardId);
  const card = await prisma.card.delete({ where: { id: cardId } });
  revalidateCardPaths(card.deckId);
  redirect(`/decks/${card.deckId}?view=list`);
}

export async function deleteCards(cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return;
  const user = await requireUser();
  const owned = { deck: { userId: user.id } };
  const first = await prisma.card.findFirst({ where: { id: cardIds[0], ...owned } });
  await prisma.card.deleteMany({ where: { id: { in: cardIds }, ...owned } });
  if (first) revalidateCardPaths(first.deckId);
}
