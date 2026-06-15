"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DEFAULT_SUBJECT, SUBJECT_SLUGS } from "@/lib/ai/subjects";
import { prisma } from "@/lib/db";

export interface ActionState {
  error?: string;
}

const ACCENTS = [
  "blue",
  "coral",
  "green",
  "amber",
  "teal",
  "purple",
  "pink",
  "lavender",
] as const;

const deckSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  language: z.string().trim().min(2).max(8),
  subject: z.enum(SUBJECT_SLUGS as [string, ...string[]]).default(DEFAULT_SUBJECT),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null),
  accentColor: z.enum(ACCENTS),
});

function deckDataFromForm(formData: FormData) {
  return deckSchema.safeParse({
    name: formData.get("name"),
    language: formData.get("language") ?? "es",
    subject: formData.get("subject") ?? DEFAULT_SUBJECT,
    description: formData.get("description") ?? "",
    accentColor: formData.get("accentColor") ?? "coral",
  });
}

/** Throws unless the deck exists and belongs to the signed-in user. */
async function requireOwnedDeck(deckId: string): Promise<string> {
  const user = await requireUser();
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: user.id },
    select: { id: true },
  });
  if (!deck) throw new Error("Deck not found");
  return user.id;
}

export async function createDeck(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = deckDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const deck = await prisma.deck.create({ data: { ...parsed.data, userId: user.id } });
  revalidatePath("/decks");
  redirect(`/decks/${deck.id}`);
}

export async function updateDeck(
  deckId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwnedDeck(deckId);
  const parsed = deckDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.deck.update({ where: { id: deckId }, data: parsed.data });
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function deleteDeck(deckId: string): Promise<void> {
  await requireOwnedDeck(deckId);
  await prisma.deck.delete({ where: { id: deckId } });
  revalidatePath("/decks");
  redirect("/decks");
}
