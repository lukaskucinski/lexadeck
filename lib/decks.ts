/** Cookie remembering the deck the user opened last (set on the deck page). */
export const LAST_DECK_COOKIE = "ld-last-deck";

/**
 * Where /decks should land: a deck id to auto-open, or null for the index.
 * One deck always opens directly; several open the most recently visited.
 * `showAll` (the ?all=1 breadcrumb escape) forces the index — without it the
 * index (and "+ New deck") would be unreachable once redirects kick in.
 */
export function resolveDeckLanding(
  deckIds: readonly string[],
  lastVisited: string | undefined,
  showAll: boolean,
): string | null {
  if (showAll) return null;
  if (deckIds.length === 1) return deckIds[0];
  if (lastVisited && deckIds.includes(lastVisited)) return lastVisited;
  return null;
}

/**
 * The deck the user is currently working in: last-opened (ld-last-deck cookie) →
 * most recently studied → first deck → undefined (no decks). Shared by the
 * dashboard greeting (language) and the tagline (subject).
 */
export function pickActiveDeck<T extends { id: string; lastStudied: Date | null }>(
  decks: readonly T[],
  lastDeckId: string | undefined,
): T | undefined {
  const lastOpened = lastDeckId ? decks.find((d) => d.id === lastDeckId) : undefined;
  if (lastOpened) return lastOpened;

  const lastStudied = decks
    .filter((d) => d.lastStudied != null)
    .sort((a, b) => b.lastStudied!.getTime() - a.lastStudied!.getTime())[0];
  if (lastStudied) return lastStudied;

  return decks[0];
}
