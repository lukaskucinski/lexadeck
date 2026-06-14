/**
 * Module-level multi-select store, keyed by deck id, shared across the three
 * deck card views (list / grid / kanban). Living at module scope means a
 * selection survives view-toggle and pagination (soft navigations don't reload
 * the module). Each entry maps a card id → its word type, so the action bar can
 * tell when a verb is selected (to show the conjugation option) without a server
 * round-trip. Consumed in React via useSyncExternalStore (components/deck/
 * useDeckSelection.ts) — so `getSelectionSnapshot` MUST return a stable
 * reference between mutations (cached snapshot) and a fresh one on each change,
 * or the store would loop the renderer.
 */
type Listener = () => void;

const liveMaps = new Map<string, Map<string, string>>(); // key → (cardId → wordType)
const snapshots = new Map<string, ReadonlyMap<string, string>>(); // cached immutable view
const listeners = new Set<Listener>();
const EMPTY: ReadonlyMap<string, string> = new Map(); // shared stable empty identity

/** Current selection for a key — stable reference until the next mutation. */
export function getSelectionSnapshot(key: string): ReadonlyMap<string, string> {
  return snapshots.get(key) ?? EMPTY;
}

export function subscribeSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(key: string): void {
  const live = liveMaps.get(key);
  if (!live || live.size === 0) {
    liveMaps.delete(key);
    snapshots.delete(key); // empty → back to the shared EMPTY identity
  } else {
    snapshots.set(key, new Map(live)); // fresh identity for this revision
  }
  for (const l of listeners) l();
}

function ensure(key: string): Map<string, string> {
  let m = liveMaps.get(key);
  if (!m) {
    m = new Map<string, string>();
    liveMaps.set(key, m);
  }
  return m;
}

export function toggleSelection(key: string, id: string, wordType: string): void {
  const m = ensure(key);
  if (m.has(id)) m.delete(id);
  else m.set(id, wordType);
  commit(key);
}

export function clearSelection(key: string): void {
  liveMaps.delete(key);
  commit(key);
}
