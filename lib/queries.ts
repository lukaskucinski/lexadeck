import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "./db";
import { MASTERED_STABILITY_DAYS } from "./srs";
import { sessionCounts, type SessionCounts } from "./study";
import type { CardType, Gender, SRSState, WordType } from "./types";

/* ------------------------------------------------------------------ */
/* SRS display-state → SQL conditions (mirrors getSRSState)            */
/* ------------------------------------------------------------------ */

export function srsStateWhere(state: SRSState, now: Date = new Date()): Prisma.CardWhereInput {
  switch (state) {
    case "new":
      return { masteredAt: null, state: 0 };
    case "learning":
      return { masteredAt: null, state: { in: [1, 3] } };
    case "due":
      return { masteredAt: null, state: 2, due: { lte: now } };
    case "scheduled":
      return {
        masteredAt: null,
        state: 2,
        due: { gt: now },
        stability: { lt: MASTERED_STABILITY_DAYS },
      };
    case "mastered":
      // manual flag OR earned via FSRS stability
      return {
        OR: [
          { masteredAt: { not: null } },
          { state: 2, due: { gt: now }, stability: { gte: MASTERED_STABILITY_DAYS } },
        ],
      };
  }
}

/* ------------------------------------------------------------------ */
/* Card filtering shared by deck views + library                       */
/* ------------------------------------------------------------------ */

/**
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

export function buildCardWhere(filters: CardFilters, now: Date = new Date()): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = {};

  if (filters.deckIds?.length) where.deckId = { in: filters.deckIds };
  if (filters.wordTypes?.length) where.wordType = { in: filters.wordTypes };
  if (filters.genders?.length) where.gender = { in: filters.genders };
  if (filters.cardTypes?.length) where.cardType = { in: filters.cardTypes };
  if (filters.hasTranslation === true) where.translation = { not: null };
  if (filters.hasTranslation === false) where.translation = null;

  if (filters.q) {
    where.OR = [
      { term: { contains: filters.q, mode: "insensitive" } },
      { translation: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.srs?.length) {
    where.AND = [{ OR: filters.srs.map((s) => srsStateWhere(s, now)) }];
  }

  return where;
}

export function cardOrderBy(
  sort: CardSort,
  dir: "asc" | "desc",
): Prisma.CardOrderByWithRelationInput[] {
  switch (sort) {
    case "term":
      return [{ term: dir }];
    case "due":
      return [{ due: dir }];
    case "wordType":
      return [{ wordType: dir }, { term: "asc" }];
    default:
      return [{ createdAt: dir }];
  }
}

/* ------------------------------------------------------------------ */
/* Study session sizing                                                */
/* ------------------------------------------------------------------ */

/** Honest "Study (N)" badge: what a session started now would contain. */
export async function getStudySessionCounts(
  deckId: string,
  now: Date = new Date(),
  excludeWordTypes: WordType[] = [],
): Promise<SessionCounts> {
  const exclude = excludeWordTypes.length
    ? { wordType: { notIn: excludeWordTypes } }
    : {};
  const [due, fresh] = await Promise.all([
    prisma.card.count({
      where: { deckId, due: { lte: now }, state: { not: 0 }, masteredAt: null, ...exclude },
    }),
    prisma.card.count({ where: { deckId, state: 0, masteredAt: null, ...exclude } }),
  ]);
  return sessionCounts(due, fresh);
}

/* ------------------------------------------------------------------ */
/* Deck summaries (deck list + dashboard tiles)                        */
/* ------------------------------------------------------------------ */

export interface DeckSummary {
  id: string;
  name: string;
  language: string;
  subject: string;
  description: string | null;
  accentColor: string | null;
  cardCount: number;
  readyCount: number; // due <= now, any state — "reviewable right now"
  masteredCount: number;
  lastStudied: Date | null;
}

/** Per-deck card counts from the single aggregate query below. */
interface DeckCardCounts {
  deckId: string;
  cardCount: number;
  readyCount: number;
  masteredCount: number;
}

/** Deck metadata the dashboard/deck-list needs (subset of the Deck row). */
interface DeckMeta {
  id: string;
  name: string;
  language: string;
  subject: string;
  description: string | null;
  accentColor: string | null;
}

/**
 * Join deck rows with their per-deck card counts and last-session times into
 * DeckSummary[]. Pure (no DB) so it's unit-testable; decks with no cards / no
 * session default to zero counts / null. Order follows `decks`.
 */
export function assembleDeckSummaries(
  decks: DeckMeta[],
  cardCounts: DeckCardCounts[],
  lastStudied: Map<string, Date | null>,
): DeckSummary[] {
  const byDeck = new Map(cardCounts.map((c) => [c.deckId, c]));
  return decks.map((deck) => {
    const c = byDeck.get(deck.id);
    return {
      id: deck.id,
      name: deck.name,
      language: deck.language,
      subject: deck.subject,
      description: deck.description,
      accentColor: deck.accentColor,
      cardCount: c?.cardCount ?? 0,
      readyCount: c?.readyCount ?? 0,
      masteredCount: c?.masteredCount ?? 0,
      lastStudied: lastStudied.get(deck.id) ?? null,
    };
  });
}

export async function getDeckSummaries(
  userId: string,
  now: Date = new Date(),
): Promise<DeckSummary[]> {
  const [decks, cardCounts, lastSessions] = await Promise.all([
    prisma.deck.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    // One pass over Card computes total / ready / mastered per deck via FILTER
    // aggregates — replaces three separate groupBy round-trips. The WHERE clauses
    // mirror the old Prisma queries exactly (ready: due≤now & not mastered;
    // mastered: manual flag OR FSRS stability — see srsStateWhere("mastered")).
    prisma.$queryRaw<DeckCardCounts[]>`
      SELECT c."deckId" AS "deckId",
             count(*)::int AS "cardCount",
             count(*) FILTER (
               WHERE c.due <= ${now} AND c."masteredAt" IS NULL
             )::int AS "readyCount",
             count(*) FILTER (
               WHERE c."masteredAt" IS NOT NULL
                  OR (c.state = 2 AND c.due > ${now} AND c.stability >= ${MASTERED_STABILITY_DAYS})
             )::int AS "masteredCount"
      FROM "Card" c
      JOIN "Deck" d ON d.id = c."deckId"
      WHERE d."userId" = ${userId}
      GROUP BY c."deckId"
    `,
    prisma.session.groupBy({
      by: ["deckId"],
      where: { deckId: { not: null }, deck: { userId } },
      _max: { startedAt: true },
    }),
  ]);

  const studiedMap = new Map<string, Date | null>();
  for (const s of lastSessions) {
    if (s.deckId) studiedMap.set(s.deckId, s._max.startedAt);
  }
  return assembleDeckSummaries(decks, cardCounts, studiedMap);
}

/* ------------------------------------------------------------------ */
/* Search params parsing (deck detail + library share the URL schema)  */
/* ------------------------------------------------------------------ */

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
