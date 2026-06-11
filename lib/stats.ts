import { prisma } from "./db";
import { srsStateWhere } from "./queries";
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

export async function getSRSDistribution(
  userId: string,
  deckId?: string,
): Promise<SRSDistribution[]> {
  const now = new Date();
  const states: SRSState[] = ["new", "learning", "due", "scheduled", "mastered"];
  const counts = await Promise.all(
    states.map((state) =>
      prisma.card.count({
        where: {
          deck: { userId },
          ...(deckId ? { deckId } : {}),
          ...srsStateWhere(state, now),
        },
      }),
    ),
  );
  return states.map((state, i) => ({ state, count: counts[i] }));
}
