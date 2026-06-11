/**
 * One-off: starter deck for Lorel — 50 common Spanish words.
 * Idempotent: skips if the deck already exists on her account.
 *
 *   npx tsx scripts/seed-lorel.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { emptySchedulerFields } from "../lib/srs";
import type { Gender, WordType } from "../lib/types";

const OWNER_EMAIL = "lorelschmitzberger@gmail.com";
const DECK_NAME = "Spanish Essentials";

interface SeedWord {
  term: string;
  translation: string;
  wordType: WordType;
  gender?: Gender;
  emoji?: string;
  conjugation?: string;
  notes?: string;
}

const W = (
  term: string,
  translation: string,
  wordType: WordType,
  extra: Partial<SeedWord> = {},
): SeedWord => ({ term, translation, wordType, ...extra });

const WORDS: SeedWord[] = [
  // ---- nouns (20) ----
  W("el agua", "water", "NOUN", { gender: "FEMININE", emoji: "💧", notes: "Feminine — takes el because of the stressed initial a: el agua, las aguas." }),
  W("la casa", "house; home", "NOUN", { gender: "FEMININE", emoji: "🏠" }),
  W("el perro", "dog", "NOUN", { gender: "MASCULINE", emoji: "🐶" }),
  W("el gato", "cat", "NOUN", { gender: "MASCULINE", emoji: "🐱" }),
  W("el tiempo", "time; weather", "NOUN", { gender: "MASCULINE", emoji: "⏰" }),
  W("el amigo / la amiga", "friend", "NOUN", { gender: "EITHER", emoji: "🤝" }),
  W("la comida", "food; meal", "NOUN", { gender: "FEMININE", emoji: "🍽️" }),
  W("el libro", "book", "NOUN", { gender: "MASCULINE", emoji: "📖" }),
  W("la escuela", "school", "NOUN", { gender: "FEMININE", emoji: "🏫" }),
  W("el coche", "car", "NOUN", { gender: "MASCULINE", emoji: "🚗" }),
  W("el dinero", "money", "NOUN", { gender: "MASCULINE", emoji: "💶" }),
  W("el trabajo", "work; job", "NOUN", { gender: "MASCULINE", emoji: "💼" }),
  W("el nombre", "name", "NOUN", { gender: "MASCULINE", emoji: "📛" }),
  W("el país", "country", "NOUN", { gender: "MASCULINE", emoji: "🗺️" }),
  W("la ciudad", "city", "NOUN", { gender: "FEMININE", emoji: "🏙️" }),
  W("la montaña", "mountain", "NOUN", { gender: "FEMININE", emoji: "⛰️" }),
  W("el mar", "sea", "NOUN", { gender: "MASCULINE", emoji: "🌊" }),
  W("la palabra", "word", "NOUN", { gender: "FEMININE", emoji: "💬" }),
  W("el día", "day", "NOUN", { gender: "MASCULINE", emoji: "☀️", notes: "Masculine despite ending in -a." }),
  W("la noche", "night", "NOUN", { gender: "FEMININE", emoji: "🌙" }),
  // ---- verbs (15) ----
  W("ser", "to be (identity, traits)", "VERB", { emoji: "⭐", conjugation: "soy, eres, es, somos, sois, son — irregular" }),
  W("estar", "to be (state, location)", "VERB", { emoji: "📍", conjugation: "estoy, estás, está, estamos, estáis, están — irregular" }),
  W("tener", "to have", "VERB", { emoji: "🤲", conjugation: "tengo, tienes, tiene, tenemos, tenéis, tienen — irregular" }),
  W("hacer", "to do; to make", "VERB", { emoji: "🛠️", conjugation: "hago, haces, hace, hacemos, hacéis, hacen — irregular yo" }),
  W("ir", "to go", "VERB", { emoji: "🚶", conjugation: "voy, vas, va, vamos, vais, van — irregular" }),
  W("comer", "to eat", "VERB", { emoji: "🍴", conjugation: "como, comes, come, comemos, coméis, comen" }),
  W("beber", "to drink", "VERB", { emoji: "🥤", conjugation: "bebo, bebes, bebe, bebemos, bebéis, beben" }),
  W("hablar", "to speak", "VERB", { emoji: "🗣️", conjugation: "hablo, hablas, habla, hablamos, habláis, hablan" }),
  W("ver", "to see; to watch", "VERB", { emoji: "👀", conjugation: "veo, ves, ve, vemos, veis, ven — irregular yo" }),
  W("escuchar", "to listen", "VERB", { emoji: "👂", conjugation: "escucho, escuchas, escucha, escuchamos, escucháis, escuchan" }),
  W("leer", "to read", "VERB", { emoji: "📚", conjugation: "leo, lees, lee, leemos, leéis, leen" }),
  W("escribir", "to write", "VERB", { emoji: "✍️", conjugation: "escribo, escribes, escribe, escribimos, escribís, escriben" }),
  W("querer", "to want; to love", "VERB", { emoji: "❤️", conjugation: "quiero, quieres, quiere, queremos, queréis, quieren — stem-changing e→ie" }),
  W("poder", "to be able to; can", "VERB", { emoji: "💪", conjugation: "puedo, puedes, puede, podemos, podéis, pueden — stem-changing o→ue" }),
  W("dormir", "to sleep", "VERB", { emoji: "😴", conjugation: "duermo, duermes, duerme, dormimos, dormís, duermen — stem-changing o→ue" }),
  // ---- adjectives (10) ----
  W("grande", "big", "ADJECTIVE", { emoji: "🐘" }),
  W("pequeño", "small", "ADJECTIVE", { emoji: "🐭" }),
  W("nuevo", "new", "ADJECTIVE", { emoji: "✨" }),
  W("viejo", "old", "ADJECTIVE", { emoji: "🏺" }),
  W("bueno", "good", "ADJECTIVE", { emoji: "👍" }),
  W("malo", "bad", "ADJECTIVE", { emoji: "👎" }),
  W("caro", "expensive", "ADJECTIVE", { emoji: "💸" }),
  W("barato", "cheap", "ADJECTIVE", { emoji: "🏷️" }),
  W("caliente", "hot", "ADJECTIVE", { emoji: "🥵" }),
  W("frío", "cold", "ADJECTIVE", { emoji: "🥶" }),
  // ---- pronouns (5) ----
  W("yo", "I", "PRONOUN", { emoji: "🙋" }),
  W("tú", "you (informal)", "PRONOUN", { emoji: "🫵" }),
  W("él / ella", "he / she", "PRONOUN", { emoji: "👥" }),
  W("nosotros", "we", "PRONOUN", { emoji: "👨‍👩‍👧" }),
  W("esto", "this (thing)", "PRONOUN", { emoji: "👇" }),
];

async function main() {
  const [owner] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${OWNER_EMAIL}
  `;
  if (!owner) throw new Error(`No auth user for ${OWNER_EMAIL} — run create-users.ts first`);

  const existing = await prisma.deck.findFirst({
    where: { userId: owner.id, name: DECK_NAME },
    include: { _count: { select: { cards: true } } },
  });
  if (existing) {
    console.log(`= "${DECK_NAME}" already exists (${existing._count.cards} cards) — nothing to do`);
    return;
  }

  const deck = await prisma.deck.create({
    data: {
      userId: owner.id,
      name: DECK_NAME,
      language: "es",
      description: "50 starter words — nouns, verbs, adjectives, pronouns",
      accentColor: "amber",
    },
  });

  await prisma.card.createMany({
    data: WORDS.map((w) => ({
      deckId: deck.id,
      language: "es",
      term: w.term,
      translation: w.translation,
      wordType: w.wordType,
      cardType: "VOCAB",
      gender: w.gender ?? null,
      notes: w.notes ?? null,
      conjugation: w.conjugation ?? null,
      emoji: w.emoji ?? null,
      ...emptySchedulerFields(),
    })),
  });

  console.log(`+ "${DECK_NAME}" created for ${OWNER_EMAIL} with ${WORDS.length} cards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
