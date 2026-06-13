"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  geminiConjugate,
  geminiEnrich,
  normalizeEnrichment,
  translateBatch,
} from "@/lib/ai/enrichment";
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

/** Inline edit from the list view — term/translation only. */
export async function updateCardInline(
  cardId: string,
  field: "term" | "translation",
  value: string,
): Promise<{ error?: string }> {
  const trimmed = value.trim();
  if (field === "term" && !trimmed) return { error: "Term cannot be empty" };

  const user = await requireUser();
  const existing = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    select: { details: true },
  });
  if (!existing) return { error: "Card not found" };

  const data: Record<string, unknown> = {
    [field]: field === "translation" && !trimmed ? null : trimmed,
  };
  // editing term/translation invalidates a spelling flag
  if (getCardDetails(existing.details).correction) {
    data.details = withoutCorrection(existing.details);
  }

  const card = await prisma.card.update({ where: { id: cardId }, data });
  revalidateCardPaths(card.deckId);
  return {};
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

/**
 * In-app AI enrichment for a single card: fills a missing translation
 * (Azure Translator) and generates example/exampleEn/emoji (Gemini).
 */
export async function enrichCard(cardId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
  });
  if (!card) return { error: "Card not found" };
  if (card.wordType === "GRAMMAR") {
    return { error: "Grammar cards aren't auto-enriched" };
  }

  try {
    let translation = card.translation;
    if (!translation) {
      const { out } = await translateBatch([card.term]);
      translation = out[0]?.trim() || null;
    }

    const [raw] = await geminiEnrich([
      {
        id: card.id,
        term: card.term,
        translation,
        wordType: card.wordType,
        gender: card.gender,
        notes: card.notes,
      },
    ]);
    if (!raw) return { error: "The AI returned no enrichment for this card" };
    const item = normalizeEnrichment(raw);

    // re-enriching regenerates the detail layer, but keep a previously-built
    // full conjugation table (it's generated separately, on demand)
    const details = detailsFromEnrichment(item);
    const priorTable = getCardDetails(card.details).conjugationTable;
    if (priorTable) details.conjugationTable = priorTable;

    await prisma.card.update({
      where: { id: cardId },
      data: {
        translation,
        example: item.example || card.example,
        exampleEn: item.exampleEn || card.exampleEn,
        // item.emoji is pre-sanitized ("" when not a real emoji) — keep existing if empty
        emoji: item.emoji || card.emoji,
        conjugation: item.conjugation || card.conjugation,
        details,
        // classification (wordType/gender) is left to the user — never overwritten here
        enrichedAt: new Date(),
      },
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
  const user = await requireUser();
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: user.id },
    select: { language: true },
  });
  if (!deck) return { error: "Deck not found" };
  if (deck.language !== "es") {
    return { error: "Auto-fill currently supports Spanish decks only" };
  }

  const cleaned = term.trim();
  if (!cleaned) return { error: "Enter a term first" };
  if (cleaned.length > 200) return { error: "Term is too long" };

  try {
    const { out } = await translateBatch([cleaned]);
    const translation = out[0]?.trim() || null;

    const [raw] = await geminiEnrich([
      { id: "preview", term: cleaned, translation, wordType: null, gender: null, notes: null },
    ]);
    if (!raw) return { error: "The AI returned no suggestion" };
    const item = normalizeEnrichment(raw);

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
 * Generate (and cache) the full conjugation table for a verb card, on demand.
 * Gemini returns only the simple forms; lib/conjugation.ts derives every
 * compound tense from the participle + the fixed `haber` paradigm. Spanish only.
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

  const existing = getCardDetails(card.details);
  if (existing.conjugationTable) return { table: existing.conjugationTable };

  try {
    const raw = await geminiConjugate(card.term);
    const table = buildConjugationTable(card.term, normalizeSimpleConjugation(raw));
    await prisma.card.update({
      where: { id: cardId },
      data: { details: { ...existing, conjugationTable: table } },
    });
    revalidatePath(`/decks/${card.deckId}/cards/${cardId}`);
    return { table };
  } catch (err) {
    return { error: (err as Error).message.slice(0, 200) };
  }
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
