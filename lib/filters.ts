/**
 * Filter facet semantics shared by the filter UI and anything composing
 * filter URLs. For each facet param:
 *   - null/absent  = every option checked (everything shows by default)
 *   - "a,b" (CSV)  = only those options checked
 *   - "none"       = all unchecked (the facet matches nothing)
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
