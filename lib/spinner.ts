/**
 * Use-case words for the "flashcards for <word>" tagline. The public landing
 * page cycles through all of them; the signed-in dashboard shows one
 * subject word resolved from the user's active deck.
 */
import { pickActiveDeck } from "./decks";
import { subjectTaglineWord } from "./ai/subjects";

// After the opener, ascending popularity: the reel decelerates, so words
// later in the pass get a little more show time.
export const SPINNER_WORDS = [
  "languages",
  "art",
  "geography",
  "coding",
  "history",
  "science",
  "exams",
  "law",
  "medicine",
];

/** Beat before the lever-pull anticipation kicks the reel off. */
export const REEL_DELAY_MS = 400;
/** Up-bump + fall + creep-to-landing, one keyframed motion. */
export const REEL_SPIN_MS = 3300;

/**
 * Reel order: one pass through `words`, landing on `settleOn` — the rotation
 * shows the examples; the settle states the thesis. `settleOn` is never
 * played twice if it already ends the list.
 */
export function reelStrip(words: readonly string[], settleOn: string): string[] {
  return words[words.length - 1] === settleOn ? [...words] : [...words, settleOn];
}

export interface SubjectDeck {
  id: string;
  subject: string;
  lastStudied: Date | null;
}

/**
 * Dashboard tagline word ("flashcard <word> learning") for the active deck
 * (last-opened → most recently studied → first). Resolves the deck's subject to
 * its tagline word; falls back to "language" when the user has no decks.
 */
export function resolveSubjectWord(
  decks: readonly SubjectDeck[],
  lastDeckId?: string,
): string {
  const deck = pickActiveDeck(decks, lastDeckId);
  return deck ? subjectTaglineWord(deck.subject) : "language";
}
