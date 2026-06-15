/**
 * Dashboard greeting in the language of the deck the user actually works in
 * (board feedback: Ari's Japanese profile was greeted in Spanish).
 */
import { pickActiveDeck } from "./decks";

// Stored lowercase to match the others; the dashboard hero is text-transform:
// lowercase anyway, so German nouns (Morgen/Tag/Abend) render lowercase by design.
const GREETINGS: Record<string, [morning: string, day: string, evening: string]> = {
  es: ["buenos días", "buenas tardes", "buenas noches"],
  ja: ["おはよう", "こんにちは", "こんばんは"],
  de: ["guten morgen", "guten tag", "guten abend"],
  en: ["good morning", "good afternoon", "good evening"],
};

export function greetingFor(language: string, hour: number): string {
  const set = GREETINGS[language.toLowerCase()] ?? GREETINGS.en;
  if (hour < 12) return set[0];
  if (hour < 19) return set[1];
  return set[2];
}

/**
 * Greeting derived from the *local* hour of `now`. Used client-side so the
 * time of day reflects the user's own clock — not a fixed server timezone
 * (board bug: "buenos días" shown at 10:30 PM because the server keyed off
 * APP_TZ = America/Chicago).
 */
export function greetingForDate(language: string, now: Date = new Date()): string {
  return greetingFor(language, now.getHours());
}

export interface GreetingDeck {
  id: string;
  language: string;
  lastStudied: Date | null;
}

/**
 * The "current" language: the active deck (last-opened → most recently studied →
 * first) language, or the app default (es) when there are no decks.
 */
export function resolveGreetingLanguage(
  decks: readonly GreetingDeck[],
  lastDeckId: string | undefined,
): string {
  return pickActiveDeck(decks, lastDeckId)?.language ?? "es";
}
