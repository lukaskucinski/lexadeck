"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
    description: formData.get("description") ?? "",
    accentColor: formData.get("accentColor") ?? "coral",
  });
}

export async function createDeck(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deckDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const deck = await prisma.deck.create({ data: parsed.data });
  revalidatePath("/decks");
  redirect(`/decks/${deck.id}`);
}

export async function updateDeck(
  deckId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deckDataFromForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.deck.update({ where: { id: deckId }, data: parsed.data });
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function deleteDeck(deckId: string): Promise<void> {
  await prisma.deck.delete({ where: { id: deckId } });
  revalidatePath("/decks");
  redirect("/decks");
}
