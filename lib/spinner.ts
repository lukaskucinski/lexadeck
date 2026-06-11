/**
 * Word spinner for the "flashcards for <word>" tagline: the subtitle cycles
 * through the domains LexaDeck aspires to and lands on the one matching the
 * user's decks. Pure frame logic lives here; components only play frames.
 */

export const SPINNER_WORDS = ["language", "law", "medicine", "geography", "test prep"];

export interface SpinnerDeck {
  language: string;
}

/**
 * The word the dashboard spinner should land on. Every deck today is a
 * language deck, so this is constant — it becomes a real dispatch the day
 * decks grow a subject/domain field (see the Aspirational board card).
 */
export function resolveSpinnerWord(decks: readonly SpinnerDeck[]): string {
  void decks;
  return "language";
}

/**
 * Deterministic frame sequence: `cycles` passes through `words`, ending on
 * `landOn`. The frame before the landing is never `landOn` itself, so the
 * final settle always reads as a change.
 */
export function spinFrames(words: readonly string[], landOn: string, cycles = 2): string[] {
  const frames: string[] = [];
  for (let i = 0; i < cycles; i++) frames.push(...words);
  while (frames.length > 0 && frames[frames.length - 1] === landOn) frames.pop();
  frames.push(landOn);
  return frames;
}
