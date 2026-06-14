"use client";

import { useCoarsePointer } from "./useDeckSelection";

/** Tells the user how to multi-select, adapted to the device's input. */
export function SelectHint() {
  const coarse = useCoarsePointer();
  return (
    <span className={`label-caps text-muted/60 ${coarse ? "inline" : "hidden lg:inline"}`}>
      {coarse ? "Long-press to select" : "⇧-click to select"}
    </span>
  );
}
