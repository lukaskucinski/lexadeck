/**
 * Use-case words for the "flashcards for <word>" tagline. The public landing
 * page cycles through all of them; the signed-in dashboard shows one static
 * subject word resolved from the user's decks.
 */

export const SPINNER_WORDS = [
  "languages",
  "medicine",
  "exams",
  "science",
  "law",
  "history",
  "coding",
  "geography",
  "music",
];

export interface SubjectDeck {
  language: string;
}

/**
 * Dashboard tagline word ("flashcard <word> learning") for the most recently
 * opened deck. Every deck today is a language deck, so this is constant — it
 * becomes a real dispatch the day decks grow a subject/domain field (see the
 * "Domain-aware decks" Aspirational board card).
 */
export function resolveSubjectWord(decks: readonly SubjectDeck[]): string {
  void decks;
  return "language";
}
