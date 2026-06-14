"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  clearSelection,
  getSelectionSnapshot,
  subscribeSelection,
  toggleSelection,
} from "@/lib/selectionStore";

const EMPTY: ReadonlyMap<string, string> = new Map<string, string>();

export interface DeckSelection {
  /** cardId → wordType for every selected card */
  selected: ReadonlyMap<string, string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string, wordType: string) => void;
  clear: () => void;
}

/**
 * Subscribe to the shared per-deck selection store. `key` is the deck id (or ""
 * for views that don't participate, e.g. the multi-deck library list). The
 * store lives at module scope so the selection survives view-toggle/pagination.
 */
export function useDeckSelection(key: string): DeckSelection {
  const selected = useSyncExternalStore(
    subscribeSelection,
    () => getSelectionSnapshot(key),
    () => EMPTY, // server snapshot — selection is client-only, starts empty
  );
  return useMemo<DeckSelection>(
    () => ({
      selected,
      isSelected: (id) => selected.has(id),
      toggle: (id, wordType) => toggleSelection(key, id, wordType),
      clear: () => clearSelection(key),
    }),
    [selected, key],
  );
}

/**
 * Subscribe to ONLY one card's selected state (a boolean) so toggling a card
 * doesn't re-render every other card. For the per-card highlight in grid/kanban.
 */
export function useIsSelected(key: string, id: string): boolean {
  return useSyncExternalStore(
    subscribeSelection,
    () => getSelectionSnapshot(key).has(id),
    () => false,
  );
}

/** True when the deck has any cards selected — drives touch's tap-to-toggle mode. */
export function useHasSelection(key: string): boolean {
  return useSyncExternalStore(
    subscribeSelection,
    () => getSelectionSnapshot(key).size > 0,
    () => false,
  );
}

/** True on touch-first ("coarse pointer") devices — gates the mobile gestures. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false, // SSR: assume fine pointer
  );
}
