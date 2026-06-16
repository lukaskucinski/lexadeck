import type { CardRow } from "@/components/card/cardRow";
import type { CardFilters, CardSort } from "./cardViewParams";

/**
 * Client-side equivalents of the deck/library Prisma query, so the view can
 * filter / sort / paginate the already-loaded cards instantly (no server
 * round-trip). These mirror `buildCardWhere` and `cardOrderBy` in lib/queries.ts
 * exactly — keep them in sync; lib/cardView.test.ts guards the parity.
 */

function includesCI(haystack: string | null, needle: string): boolean {
  return haystack != null && haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Mirror of `buildCardWhere`. A facet with no value / empty array / "none" is neutral. */
export function matchesCardRow(row: CardRow, filters: CardFilters): boolean {
  if (filters.q && !(includesCI(row.term, filters.q) || includesCI(row.translation, filters.q))) {
    return false;
  }
  if (filters.deckIds?.length && !filters.deckIds.includes(row.deckId)) return false;
  if (filters.wordTypes?.length && !filters.wordTypes.includes(row.wordType)) return false;
  // a gender filter on a null-gender row never matches (Prisma `in` on a null column)
  if (filters.genders?.length && (row.gender == null || !filters.genders.includes(row.gender))) {
    return false;
  }
  if (filters.cardTypes?.length && !filters.cardTypes.includes(row.cardType)) return false;
  if (filters.hasTranslation === true && row.translation == null) return false;
  if (filters.hasTranslation === false && row.translation != null) return false;
  if (filters.srs?.length && !filters.srs.includes(row.srs)) return false;
  return true;
}

/** Mirror of `cardOrderBy`. wordType carries a secondary `term asc` like the query. */
export function compareCardRows(sort: CardSort, dir: "asc" | "desc"): (a: CardRow, b: CardRow) => number {
  const factor = dir === "asc" ? 1 : -1;
  switch (sort) {
    case "term":
      return (a, b) => factor * a.term.localeCompare(b.term);
    case "due":
      return (a, b) => factor * (a.due.getTime() - b.due.getTime());
    case "wordType":
      return (a, b) =>
        factor * a.wordType.localeCompare(b.wordType) || a.term.localeCompare(b.term);
    default: // createdAt
      return (a, b) => factor * (a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
