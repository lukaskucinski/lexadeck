"use client";

import { useSyncExternalStore } from "react";
import {
  getSelectionSnapshot,
  subscribeSelection,
  toggleSelection,
} from "@/lib/selectionStore";

/**
 * Per-card selection checkbox for the grid + kanban views, wired to the shared
 * per-deck selection store. Subscribes to ONLY this card's membership (boolean)
 * so toggling one card doesn't re-render every other card. Stops propagation so
 * it never navigates (grid Link) nor starts a drag / opens the card (kanban).
 */
export function CardSelectCheckbox({
  selectionKey,
  cardId,
  className = "",
}: {
  selectionKey: string;
  cardId: string;
  className?: string;
}) {
  const checked = useSyncExternalStore(
    subscribeSelection,
    () => getSelectionSnapshot(selectionKey).has(cardId),
    () => false,
  );
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => toggleSelection(selectionKey, cardId)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={checked ? "Deselect card" : "Select card"}
      title="Select"
      className={`h-4 w-4 cursor-pointer accent-[var(--c-ink)] ${className}`}
    />
  );
}
