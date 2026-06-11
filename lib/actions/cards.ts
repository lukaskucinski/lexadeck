"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { geminiEnrich, translateBatch } from "@/lib/ai/enrichment";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  emoji: optional(16),
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

  await prisma.card.create({
    data: {
      deckId,
      language: deck.language,
      ...parsed.data,
      ...emptySchedulerFields(),
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
  await requireOwnedCard(cardId);
  const parsed = cardDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const card = await prisma.card.update({
    where: { id: cardId },
    data: parsed.data,
  });
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

  await requireOwnedCard(cardId);
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { [field]: field === "translation" && !trimmed ? null : trimmed },
  });
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

    const [item] = await geminiEnrich([
      {
        id: card.id,
        term: card.term,
        translation,
        wordType: card.wordType,
        gender: card.gender,
        notes: card.notes,
      },
    ]);
    if (!item) return { error: "The AI returned no enrichment for this card" };

    await prisma.card.update({
      where: { id: cardId },
      data: {
        translation,
        example: item.example.trim() || card.example,
        exampleEn: item.exampleEn.trim() || card.exampleEn,
        emoji: item.emoji.trim() || card.emoji,
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
