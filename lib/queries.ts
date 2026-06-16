import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "./db";
import { MASTERED_STABILITY_DAYS } from "./srs";
import { sessionCounts, type SessionCounts } from "./study";
import type { CardType, Gender, SRSState, WordType } from "./types";
import type { CardFilters, CardSort, CardViewParams } from "./cardViewParams";

// The pure view-param model (client-safe — no DB import) lives in ./cardViewParams;
// re-export it so existing server importers of "@/lib/queries" keep working.
export type { CardFilters, CardSort, CardViewParams };
export { parseCardViewParams } from "./cardViewParams";

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

/** Raw row shape returned by the single deck-summary aggregate query. */
interface DeckSummaryRow {
  id: string;
  name: string;
  language: string;
  subject: string;
  description: string | null;
  accentColor: string | null;
  cardCount: number;
  readyCount: number;
  masteredCount: number;
  lastStudied: Date | null;
}

/**
 * Coerce aggregate rows to DeckSummary[]. Pure (no DB) so it's unit-testable.
 * The `::int` casts already yield JS numbers, but pg can hand back bigints/strings
 * for aggregate columns — Number() is a defensive normalisation.
 */
export function mapDeckSummaryRows(rows: DeckSummaryRow[]): DeckSummary[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    language: r.language,
    subject: r.subject,
    description: r.description,
    accentColor: r.accentColor,
    cardCount: Number(r.cardCount),
    readyCount: Number(r.readyCount),
    masteredCount: Number(r.masteredCount),
    lastStudied: r.lastStudied,
  }));
}

/**
 * One round-trip: deck metadata LEFT-JOINed to per-deck card-count FILTER
 * aggregates and the max session start. Replaces the old 3-query Promise.all
 * (findMany + count aggregate + session.groupBy) so the dashboard/deck-list/
 * progress pages open one connection here instead of three on a cold start.
 *
 * FILTER predicates are preserved verbatim from the prior aggregate:
 *   readyCount    = due ≤ now AND not mastered (any state — "reviewable now")
 *   masteredCount = manual flag OR FSRS stability (see srsStateWhere("mastered"))
 * COALESCE defaults decks with no cards to 0; the LEFT JOIN leaves never-studied
 * decks with a null lastStudied. Order matches the old `orderBy: createdAt asc`.
 */
export async function getDeckSummaries(
  userId: string,
  now: Date = new Date(),
): Promise<DeckSummary[]> {
  const rows = await prisma.$queryRaw<DeckSummaryRow[]>`
    SELECT d.id, d.name, d.language, d.subject, d.description, d."accentColor",
           COALESCE(cc."cardCount", 0)::int     AS "cardCount",
           COALESCE(cc."readyCount", 0)::int    AS "readyCount",
           COALESCE(cc."masteredCount", 0)::int AS "masteredCount",
           ls."lastStudied"                     AS "lastStudied"
    FROM "Deck" d
    LEFT JOIN (
      SELECT c."deckId",
             count(*) AS "cardCount",
             count(*) FILTER (
               WHERE c.due <= ${now} AND c."masteredAt" IS NULL
             ) AS "readyCount",
             count(*) FILTER (
               WHERE c."masteredAt" IS NOT NULL
                  OR (c.state = 2 AND c.due > ${now} AND c.stability >= ${MASTERED_STABILITY_DAYS})
             ) AS "masteredCount"
      FROM "Card" c
      GROUP BY c."deckId"
    ) cc ON cc."deckId" = d.id
    LEFT JOIN (
      SELECT s."deckId", max(s."startedAt") AS "lastStudied"
      FROM "Session" s
      WHERE s."deckId" IS NOT NULL
      GROUP BY s."deckId"
    ) ls ON ls."deckId" = d.id
    WHERE d."userId" = ${userId}
    ORDER BY d."createdAt" ASC
  `;
  return mapDeckSummaryRows(rows);
}

// CardViewParams + parseCardViewParams now live in ./cardViewParams (re-exported above).
