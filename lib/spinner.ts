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

export interface SpinEntry {
  word: string;
  holdMs: number;
}

const FIRST_HOLD_MS = 1200;
const STEP_MS = 650;
const SLOW_MS = 900;
const SLOWER_MS = 1200;

/**
 * One pass through `words` — hold the opener, move quickly through the middle,
 * decelerate at the end — then settle on `settleOn` forever (terminal entry,
 * holdMs Infinity). The rotation shows the examples; the settle states the
 * thesis. `settleOn` is never played twice if it already ends the list.
 */
export function spinTimeline(words: readonly string[], settleOn: string): SpinEntry[] {
  const pass = words[words.length - 1] === settleOn ? words.slice(0, -1) : [...words];
  const entries: SpinEntry[] = pass.map((word, i) => {
    let holdMs = STEP_MS;
    if (i === 0) holdMs = FIRST_HOLD_MS;
    else if (i === pass.length - 1) holdMs = SLOWER_MS;
    else if (i === pass.length - 2) holdMs = SLOW_MS;
    return { word, holdMs };
  });
  entries.push({ word: settleOn, holdMs: Infinity });
  return entries;
}

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
