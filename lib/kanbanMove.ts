/**
 * Decide which cards a kanban drag should reclassify. Dragging a card that is
 * part of the current selection moves the WHOLE selection to the target column;
 * dragging an unselected card moves just that card and clears any selection.
 * Cards already in the target column are skipped. Pure so it's unit-testable
 * without the dnd machinery.
 */
export interface CardMovePlan {
  moveIds: string[];
  clearSelection: boolean;
}

export function planCardMove(
  draggedId: string,
  targetWordType: string,
  selectedIds: ReadonlySet<string>,
  cards: ReadonlyArray<{ id: string; wordType: string }>,
): CardMovePlan {
  const draggingSelected = selectedIds.has(draggedId);
  const ids = draggingSelected ? new Set(selectedIds) : new Set([draggedId]);
  const moveIds = cards
    .filter((c) => ids.has(c.id) && c.wordType !== targetWordType)
    .map((c) => c.id);
  return { moveIds, clearSelection: !draggingSelected && selectedIds.size > 0 };
}
