"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  clearSelection,
  getSelectionSnapshot,
  setSelection,
  subscribeSelection,
  toggleSelection,
} from "@/lib/selectionStore";

const EMPTY: ReadonlySet<string> = new Set<string>();

export interface DeckSelection {
  selected: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
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
      toggle: (id) => toggleSelection(key, id),
      setMany: (ids, on) => setSelection(key, ids, on),
      clear: () => clearSelection(key),
    }),
    [selected, key],
  );
}
