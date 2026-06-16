import type { CardType, Gender, SRSState, WordType } from "./types";

/**
 * Pure deck/library view-param model — no DB imports, so it is safe to pull into
 * client components (the instant card workspace). lib/queries.ts re-exports these
 * for server callers; the Prisma `buildCardWhere`/`cardOrderBy` live there.
 *
 * For the array facets: a value subset constrains with `in`; undefined (facet
 * untouched) and an empty array ("none" in the URL — every box unchecked) both
 * add no constraint. The empty facet is a blank slate the user builds a
 * selection from after "Uncheck all"; if it filtered, any facet they hadn't
 * rebuilt yet would blank the whole view. hasTranslation mirrors this: "none"
 * is neutral.
 */
export interface CardFilters {
  q?: string;
  wordTypes?: WordType[];
  genders?: Gender[];
  srs?: SRSState[];
  cardTypes?: CardType[];
  hasTranslation?: boolean | "none";
  deckIds?: string[];
}

export type CardSort = "term" | "createdAt" | "due" | "wordType";

export interface CardViewParams {
  view: "kanban" | "grid" | "list";
  filters: CardFilters;
  sort: CardSort;
  dir: "asc" | "desc";
  page: number;
}

// "none" = the user unchecked every option in that facet → empty array
const csv = (v: string | undefined) =>
  v == null ? undefined : v === "none" ? [] : (v.split(",").filter(Boolean) as string[]);

export function parseCardViewParams(sp: Record<string, string | string[] | undefined>): CardViewParams {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const view = (["kanban", "grid", "list"] as const).find((v) => v === get("view")) ?? "kanban";
  const sort = (["term", "createdAt", "due", "wordType"] as const).find((s) => s === get("sort")) ?? "createdAt";
  // default ordering is "Recently added" (createdAt desc); the Sort control and
  // list-view headers always set dir explicitly
  const dir = get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(get("page")) || 1);

  const ht = get("ht");
  return {
    view,
    sort,
    dir,
    page,
    filters: {
      q: get("q") || undefined,
      wordTypes: csv(get("types")) as CardFilters["wordTypes"],
      genders: csv(get("genders")) as CardFilters["genders"],
      srs: csv(get("srs")) as CardFilters["srs"],
      cardTypes: csv(get("ct")) as CardFilters["cardTypes"],
      hasTranslation:
        ht === "yes" ? true : ht === "no" ? false : ht === "none" ? "none" : undefined,
      deckIds: csv(get("decks")),
    },
  };
}
