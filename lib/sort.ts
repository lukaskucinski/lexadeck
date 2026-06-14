import type { CardSort } from "./queries";

/**
 * The user-facing card sort options. Each bundles a Prisma sort field + a
 * direction so the dropdown reads as one clear choice (e.g. "Recently added")
 * rather than a separate field + direction toggle. The backend (`cardOrderBy`)
 * already supports every field referenced here.
 */
export interface SortOption {
  /** Stable id (handy for keys / analytics); identity is really (sort, dir). */
  value: string;
  label: string;
  sort: CardSort;
  dir: "asc" | "desc";
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { value: "recent", label: "Recently added", sort: "createdAt", dir: "desc" },
  { value: "oldest", label: "Oldest first", sort: "createdAt", dir: "asc" },
  { value: "az", label: "A → Z", sort: "term", dir: "asc" },
  { value: "za", label: "Z → A", sort: "term", dir: "desc" },
  { value: "due", label: "Due soonest", sort: "due", dir: "asc" },
  { value: "type", label: "Word type", sort: "wordType", dir: "asc" },
];

/** App-wide default ordering when no sort is chosen. */
export const DEFAULT_SORT_OPTION = SORT_OPTIONS[0];

/**
 * The dropdown entry matching the current (sort, dir), or undefined when the
 * combination isn't offered here (list-view column headers can set pairs the
 * dropdown doesn't list, e.g. "due desc").
 */
export function activeSortOption(sort: CardSort, dir: "asc" | "desc"): SortOption | undefined {
  return SORT_OPTIONS.find((o) => o.sort === sort && o.dir === dir);
}
