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
