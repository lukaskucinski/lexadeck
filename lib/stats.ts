import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "./db";
import { MASTERED_STABILITY_DAYS } from "./srs";
import type { SRSState } from "./types";
import type { DayCount } from "@/components/ui/Heatmap";

/** All review-day grouping uses this zone so streaks match the user's day. */
export const APP_TZ = "America/Chicago";

export async function getReviewActivity(
  userId: string,
  sinceDays: number,
): Promise<DayCount[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const rows = await prisma.$queryRaw<{ day: string; n: number }[]>`
    SELECT to_char((r."reviewedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${APP_TZ}, 'YYYY-MM-DD') AS day,
           count(*)::int AS n
    FROM "Review" r
    JOIN "Card" c ON c.id = r."cardId"
    JOIN "Deck" d ON d.id = c."deckId"
    WHERE r."reviewedAt" >= ${since} AND d."userId" = ${userId}
    GROUP BY 1
  `;
  return rows.map((r) => ({ day: r.day, count: Number(r.n) }));
}

/** Consecutive days with ≥1 review, counting back from today (or yesterday). */
export function computeStreak(activity: DayCount[], now: Date = new Date()): number {
  const days = new Set(activity.filter((a) => a.count > 0).map((a) => a.day));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let streak = 0;
  const cursor = new Date(now);
  // a streak survives if today has no reviews yet — start from yesterday then
  if (!days.has(fmt.format(cursor))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(fmt.format(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface SRSDistribution {
  state: SRSState;
  count: number;
}

/** One row of FILTER counts; keys mirror the SRSState union. */
type SRSDistRow = Record<SRSState, number>;

const SRS_STATE_ORDER: SRSState[] = ["new", "learning", "due", "scheduled", "mastered"];

/**
 * One round-trip replacing five `card.count` calls: per-state `count(*) FILTER`
 * columns whose predicates mirror `srsStateWhere` exactly (new/learning/due/
 * scheduled require `masteredAt IS NULL`; mastered = manual flag OR FSRS stability).
 * An aggregate without GROUP BY always returns exactly one row (all-zero for an
 * empty deck). The optional `deckId` narrows via a composed `Prisma.sql` fragment.
 */
export async function getSRSDistribution(
  userId: string,
  deckId?: string,
): Promise<SRSDistribution[]> {
  const now = new Date();
  const deckFilter = deckId ? Prisma.sql`AND c."deckId" = ${deckId}` : Prisma.empty;
  const [row] = await prisma.$queryRaw<SRSDistRow[]>`
    SELECT
      count(*) FILTER (WHERE c."masteredAt" IS NULL AND c.state = 0)::int AS "new",
      count(*) FILTER (WHERE c."masteredAt" IS NULL AND c.state IN (1, 3))::int AS "learning",
      count(*) FILTER (WHERE c."masteredAt" IS NULL AND c.state = 2 AND c.due <= ${now})::int AS "due",
      count(*) FILTER (
        WHERE c."masteredAt" IS NULL AND c.state = 2
          AND c.due > ${now} AND c.stability < ${MASTERED_STABILITY_DAYS}
      )::int AS "scheduled",
      count(*) FILTER (
        WHERE c."masteredAt" IS NOT NULL
           OR (c.state = 2 AND c.due > ${now} AND c.stability >= ${MASTERED_STABILITY_DAYS})
      )::int AS "mastered"
    FROM "Card" c
    JOIN "Deck" d ON d.id = c."deckId"
    WHERE d."userId" = ${userId} ${deckFilter}
  `;
  return SRS_STATE_ORDER.map((state) => ({ state, count: Number(row?.[state] ?? 0) }));
}

export interface ProgressTotals {
  totalReviews: number;
  totalSessions: number;
}

/**
 * The progress page's two scalar counts (lifetime reviews + completed sessions)
 * in one round-trip instead of two `count` calls. Predicates mirror the old
 * Prisma filters: reviews scoped to the user's cards; sessions to the user's
 * decks with `endedAt IS NOT NULL` (a finished session).
 */
export async function getProgressTotals(userId: string): Promise<ProgressTotals> {
  const [row] = await prisma.$queryRaw<ProgressTotals[]>`
    SELECT
      (SELECT count(*) FROM "Review" r
         JOIN "Card" c ON c.id = r."cardId"
         JOIN "Deck" d ON d.id = c."deckId"
        WHERE d."userId" = ${userId})::int AS "totalReviews",
      (SELECT count(*) FROM "Session" s
         JOIN "Deck" d ON d.id = s."deckId"
        WHERE d."userId" = ${userId} AND s."endedAt" IS NOT NULL)::int AS "totalSessions"
  `;
  return {
    totalReviews: Number(row?.totalReviews ?? 0),
    totalSessions: Number(row?.totalSessions ?? 0),
  };
}
