/**
 * Filter facet semantics shared by the filter UI and anything composing
 * filter URLs. For each facet param:
 *   - null/absent  = every option checked (everything shows by default)
 *   - "a,b" (CSV)  = only those options checked
 *   - "none"       = all unchecked — a blank slate to build a selection from;
 *     it constrains nothing (an all-unchecked facet the user hasn't rebuilt
 *     yet must not blank the view)
 * The param disappears again when every box is re-checked.
 */
export function selectedSet(current: string | null, all: readonly string[]): Set<string> {
  if (current == null) return new Set(all);
  if (current === "none") return new Set();
  return new Set(current.split(",").filter(Boolean));
}

export function toggleValue(
  current: string | null,
  value: string,
  all: readonly string[],
): string | null {
  const selected = selectedSet(current, all);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  if (selected.size === 0) return "none";
  if (all.every((v) => selected.has(v))) return null;
  return all.filter((v) => selected.has(v)).join(",");
}

/** Group-title click: a fully-checked facet unchecks entirely, anything else checks all. */
export function toggleAll(current: string | null, all: readonly string[]): string | null {
  return selectedSet(current, all).size === all.length ? "none" : null;
}

/**
 * The facet's contribution to the filter badge: how many boxes are checked in
 * a facet the user has touched. Untouched (default) facets contribute 0, so
 * the badge counts the toggles actively narrowing the view.
 */
export function checkedCount(current: string | null, all: readonly string[]): number {
  if (current == null) return 0;
  return selectedSet(current, all).size;
}
