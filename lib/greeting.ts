/**
 * Dashboard greeting in the language of the deck the user actually works in
 * (board feedback: Ari's Japanese profile was greeted in Spanish).
 */

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

export interface GreetingDeck {
  id: string;
  language: string;
  lastStudied: Date | null;
}

/**
 * The "current" language: last-opened deck (ld-last-deck cookie) →
 * most recently studied deck → first deck → app default (es).
 */
export function resolveGreetingLanguage(
  decks: readonly GreetingDeck[],
  lastDeckId: string | undefined,
): string {
  const lastOpened = lastDeckId && decks.find((d) => d.id === lastDeckId);
  if (lastOpened) return lastOpened.language;

  const lastStudied = decks
    .filter((d) => d.lastStudied != null)
    .sort((a, b) => b.lastStudied!.getTime() - a.lastStudied!.getTime())[0];
  if (lastStudied) return lastStudied.language;

  return decks[0]?.language ?? "es";
}
