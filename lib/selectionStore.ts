/**
 * Module-level multi-select store, keyed by deck id, shared across the three
 * deck card views (list / grid / kanban). Living at module scope means a
 * selection survives view-toggle and pagination (soft navigations don't reload
 * the module). Consumed in React via useSyncExternalStore (components/deck/
 * useDeckSelection.ts) — so `getSelectionSnapshot` MUST return a stable
 * reference between mutations (cached snapshot) and a fresh one on each change,
 * or the store would loop the renderer.
 */
type Listener = () => void;

const liveSets = new Map<string, Set<string>>(); // mutable working set per key
const snapshots = new Map<string, ReadonlySet<string>>(); // cached immutable view
const listeners = new Set<Listener>();
const EMPTY: ReadonlySet<string> = new Set<string>(); // shared stable empty identity

/** Current selection for a key — stable reference until the next mutation. */
export function getSelectionSnapshot(key: string): ReadonlySet<string> {
  return snapshots.get(key) ?? EMPTY;
}

export function subscribeSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(key: string): void {
  const live = liveSets.get(key);
  if (!live || live.size === 0) {
    liveSets.delete(key);
    snapshots.delete(key); // empty → back to the shared EMPTY identity
  } else {
    snapshots.set(key, new Set(live)); // fresh identity for this revision
  }
  for (const l of listeners) l();
}

function ensure(key: string): Set<string> {
  let s = liveSets.get(key);
  if (!s) {
    s = new Set<string>();
    liveSets.set(key, s);
  }
  return s;
}

export function toggleSelection(key: string, id: string): void {
  const s = ensure(key);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  commit(key);
}

/** Add (on=true) or remove (on=false) a batch of ids — used by select-all. */
export function setSelection(key: string, ids: string[], on: boolean): void {
  const s = ensure(key);
  for (const id of ids) {
    if (on) s.add(id);
    else s.delete(id);
  }
  commit(key);
}

export function clearSelection(key: string): void {
  liveSets.delete(key);
  commit(key);
}
