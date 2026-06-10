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

export interface CardFilters {
  q?: string;
  wordTypes?: WordType[];
  genders?: Gender[];
  srs?: SRSState[];
  cardTypes?: CardType[];
  hasTranslation?: boolean;
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
    const srsConditions = filters.srs.map((s) => srsStateWhere(s, now));
    where.AND = [{ OR: srsConditions }];
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
): Promise<SessionCounts> {
  const [due, fresh] = await Promise.all([
    prisma.card.count({
      where: { deckId, due: { lte: now }, state: { not: 0 }, masteredAt: null },
    }),
    prisma.card.count({ where: { deckId, state: 0, masteredAt: null } }),
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
  description: string | null;
  accentColor: string | null;
  cardCount: number;
  readyCount: number; // due <= now, any state — "reviewable right now"
  masteredCount: number;
  lastStudied: Date | null;
}

export async function getDeckSummaries(now: Date = new Date()): Promise<DeckSummary[]> {
  const [decks, counts, ready, mastered, lastSessions] = await Promise.all([
    prisma.deck.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.card.groupBy({ by: ["deckId"], _count: { _all: true } }),
    prisma.card.groupBy({
      by: ["deckId"],
      where: { due: { lte: now }, masteredAt: null },
      _count: { _all: true },
    }),
    prisma.card.groupBy({
      by: ["deckId"],
      where: srsStateWhere("mastered", now),
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ["deckId"],
      where: { deckId: { not: null } },
      _max: { startedAt: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.deckId, c._count._all]));
  const readyMap = new Map(ready.map((c) => [c.deckId, c._count._all]));
  const masteredMap = new Map(mastered.map((c) => [c.deckId, c._count._all]));
  const studiedMap = new Map(lastSessions.map((s) => [s.deckId, s._max.startedAt]));

  return decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    language: deck.language,
    description: deck.description,
    accentColor: deck.accentColor,
    cardCount: countMap.get(deck.id) ?? 0,
    readyCount: readyMap.get(deck.id) ?? 0,
    masteredCount: masteredMap.get(deck.id) ?? 0,
    lastStudied: studiedMap.get(deck.id) ?? null,
  }));
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

const csv = (v: string | undefined) =>
  v ? (v.split(",").filter(Boolean) as string[]) : undefined;

export function parseCardViewParams(sp: Record<string, string | string[] | undefined>): CardViewParams {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const view = (["kanban", "grid", "list"] as const).find((v) => v === get("view")) ?? "kanban";
  const sort = (["term", "createdAt", "due", "wordType"] as const).find((s) => s === get("sort")) ?? "createdAt";
  const dir = get("dir") === "desc" ? "desc" : "asc";
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
      hasTranslation: ht === "yes" ? true : ht === "no" ? false : undefined,
      deckIds: csv(get("decks")),
    },
  };
}
