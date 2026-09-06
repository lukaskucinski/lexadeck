/**
 * Module-level store for the first-run tour's nav spotlight, mirroring
 * lib/selectionStore.ts. Holds which nav href is currently highlighted and
 * whether a tour is active (the nav layer lifts above the dim while active).
 * Read in React via useSyncExternalStore (components/walkthrough/useTourHighlight.ts).
 * Values are primitives, so no cached-snapshot identity dance is needed.
 */
type Listener = () => void;

let activeHref: string | null = null;
let tourActive = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeHighlight(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The nav href currently spotlighted, or null. */
export function getActiveHref(): string | null {
  return activeHref;
}

/** Whether a tour is running (nav lifts above the backdrop while true). */
export function getTourActive(): boolean {
  return tourActive;
}

export function setHighlight(href: string | null): void {
  if (href === activeHref) return;
  activeHref = href;
  emit();
}

export function setTourActive(active: boolean): void {
  if (active === tourActive) return;
  tourActive = active;
  emit();
}

/** Reset to defaults (tour ended / test teardown). */
export function resetTourHighlight(): void {
  activeHref = null;
  tourActive = false;
  emit();
}
