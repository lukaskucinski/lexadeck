/**
 * A tiny hand-curated Spanish starter deck offered at the end of onboarding for
 * learners who pick Languages → Spanish. Mirrors the seed-script pattern
 * (prisma create + createMany + emptySchedulerFields); cards can be AI-enriched
 * later like any other.
 */
import { prisma } from "@/lib/db";
import { emptySchedulerFields } from "@/lib/srs";
import type { CardType, Gender, WordType } from "@/lib/types";

export const ES_STARTER_DECK_NAME = "Spanish Starter";

export interface StarterCard {
  term: string;
  translation: string;
  wordType: WordType;
  cardType?: CardType;
  gender?: Gender;
  emoji?: string;
  notes?: string;
}

export const ES_STARTER_CARDS: StarterCard[] = [
  { term: "hola", translation: "hello", wordType: "OTHER", cardType: "EXPRESSION", emoji: "👋" },
  { term: "gracias", translation: "thank you", wordType: "OTHER", cardType: "EXPRESSION", emoji: "🙏" },
  { term: "por favor", translation: "please", wordType: "OTHER", cardType: "EXPRESSION", emoji: "🤲" },
  { term: "la casa", translation: "house; home", wordType: "NOUN", gender: "FEMININE", emoji: "🏠" },
  { term: "el perro", translation: "dog", wordType: "NOUN", gender: "MASCULINE", emoji: "🐕" },
  {
    term: "el agua",
    translation: "water",
    wordType: "NOUN",
    gender: "FEMININE",
    emoji: "💧",
    notes: "Feminine — takes el because of the stressed initial a (el agua, las aguas).",
  },
  { term: "comer", translation: "to eat", wordType: "VERB", emoji: "🍽️" },
  { term: "beber", translation: "to drink", wordType: "VERB", emoji: "🥤" },
  { term: "grande", translation: "big; large", wordType: "ADJECTIVE", emoji: "📏" },
  { term: "bueno", translation: "good", wordType: "ADJECTIVE", emoji: "👍" },
];

/**
 * Create the Spanish starter deck for a user. Idempotent: returns the existing
 * deck's id if they already have one by this name (so re-running onboarding
 * never duplicates it).
 */
export async function createSpanishStarterDeck(userId: string): Promise<string> {
  const existing = await prisma.deck.findFirst({
    where: { userId, name: ES_STARTER_DECK_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const deck = await prisma.deck.create({
    data: {
      userId,
      name: ES_STARTER_DECK_NAME,
      language: "es",
      subject: "languages",
      description: "A few everyday Spanish words to get you started.",
      accentColor: "coral",
    },
  });

  await prisma.card.createMany({
    data: ES_STARTER_CARDS.map((c) => ({
      deckId: deck.id,
      language: "es",
      term: c.term,
      translation: c.translation,
      wordType: c.wordType,
      cardType: c.cardType ?? "VOCAB",
      gender: c.gender ?? null,
      emoji: c.emoji ?? null,
      notes: c.notes ?? null,
      ...emptySchedulerFields(),
    })),
  });

  return deck.id;
}
