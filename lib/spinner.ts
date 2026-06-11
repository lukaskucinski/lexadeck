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
const SPIN_MIN_MS = 120;
const SPIN_MAX_MS = 850;

/**
 * Slot-machine pass: linger on the opener, then spin through the rest with a
 * continuously decelerating quadratic ramp (quick out of the gate, easing
 * into the landing), settling on `settleOn` forever (terminal entry, holdMs
 * Infinity). ~4.2s total for the 9-word list — the rotation shows the
 * examples; the settle states the thesis. `settleOn` is never played twice
 * if it already ends the list.
 */
export function spinTimeline(words: readonly string[], settleOn: string): SpinEntry[] {
  const pass = words[words.length - 1] === settleOn ? words.slice(0, -1) : [...words];
  const last = pass.length - 1;
  const entries: SpinEntry[] = pass.map((word, i) => {
    if (i === 0) return { word, holdMs: FIRST_HOLD_MS };
    const t = last > 1 ? (i - 1) / (last - 1) : 1;
    return { word, holdMs: Math.round(SPIN_MIN_MS + (SPIN_MAX_MS - SPIN_MIN_MS) * t * t) };
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
