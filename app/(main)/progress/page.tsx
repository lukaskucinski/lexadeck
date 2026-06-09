import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Heatmap } from "@/components/ui/Heatmap";
import { prisma } from "@/lib/db";
import { getDeckSummaries } from "@/lib/queries";
import { computeStreak, getReviewActivity, getSRSDistribution } from "@/lib/stats";
import { SRS_STATE_LABELS } from "@/lib/types";
import { srsStateVar } from "@/lib/wordTypeColors";

export const dynamic = "force-dynamic";

const SEGMENTS = 24;

export default async function ProgressPage() {
  const [activity, distribution, decks, totalReviews, totalSessions, difficult, graduates] =
    await Promise.all([
      getReviewActivity(370),
      getSRSDistribution(),
      getDeckSummaries(),
      prisma.review.count(),
      prisma.session.count({ where: { endedAt: { not: null } } }),
      prisma.card.findMany({
        where: { reps: { gt: 0 } },
        orderBy: { difficulty: "desc" },
        take: 8,
        select: { id: true, deckId: true, term: true, translation: true, difficulty: true, lapses: true },
      }),
      prisma.card.findMany({
        where: { reps: { gt: 0 } },
        orderBy: { stability: "desc" },
        take: 8,
        select: { id: true, deckId: true, term: true, translation: true, stability: true },
      }),
    ]);

  const streak = computeStreak(activity);
  const totalCards = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <PageHeader index="04" title="progress" />

      {/* headline stats */}
      <div className="grid grid-cols-2 border-[1.5px] border-line sm:grid-cols-4">
        {(
          [
            [streak, streak === 1 ? "day streak" : "day streak"],
            [totalReviews, "total reviews"],
            [totalSessions, "sessions"],
            [totalCards, "cards"],
          ] as const
        ).map(([n, label], i) => (
          <div key={label} className={`px-5 py-5 ${i > 0 ? "border-l border-soft" : ""}`}>
            <div className="tnum text-4xl font-black tracking-tight">{n.toLocaleString()}</div>
            <div className="label-caps mt-1 text-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* year heatmap */}
      <section className="mt-10">
        <p className="label-caps mb-3 text-muted">Review activity · last 12 months</p>
        <div className="overflow-x-auto pb-2">
          <Heatmap data={activity} weeks={52} />
        </div>
      </section>

      {/* SRS distribution */}
      <section className="mt-10">
        <p className="label-caps mb-3 text-muted">Card states</p>
        <div className="flex h-8 w-full border-[1.5px] border-line">
          {distribution
            .filter((d) => d.count > 0)
            .map((d) => (
              <div
                key={d.state}
                title={`${SRS_STATE_LABELS[d.state]}: ${d.count}`}
                style={{
                  width: `${(d.count / Math.max(1, totalCards)) * 100}%`,
                  background: srsStateVar(d.state),
                }}
              />
            ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          {distribution.map((d) => (
            <span key={d.state} className="label-caps inline-flex items-center gap-2 text-muted">
              <i className="h-2.5 w-2.5" style={{ background: srsStateVar(d.state) }} />
              {SRS_STATE_LABELS[d.state]} <b className="tnum text-ink">{d.count.toLocaleString()}</b>
            </span>
          ))}
        </div>
      </section>

      {/* per-deck mastery */}
      <section className="mt-10">
        <p className="label-caps mb-3 text-muted">Mastery by deck</p>
        <div className="border-[1.5px] border-line">
          {decks.map((deck, i) => {
            const pct = deck.cardCount > 0 ? deck.masteredCount / deck.cardCount : 0;
            const filled = Math.round(pct * SEGMENTS);
            return (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className={`flex items-center gap-5 px-5 py-4 transition-colors hover:bg-soft/30 ${
                  i > 0 ? "border-t border-soft" : ""
                }`}
              >
                <span className="type-term w-40 truncate text-lg">{deck.name}</span>
                <span className="flex h-3 flex-1 gap-[3px]">
                  {Array.from({ length: SEGMENTS }, (_, j) => (
                    <i
                      key={j}
                      className="flex-1"
                      style={{ background: j < filled ? "var(--c-teal)" : "var(--c-soft)" }}
                    />
                  ))}
                </span>
                <b className="tnum w-12 text-right text-sm">{Math.round(pct * 100)}%</b>
              </Link>
            );
          })}
        </div>
      </section>

      {/* difficult + graduates */}
      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <p className="label-caps mb-3 text-muted">Most difficult</p>
          <div className="border-[1.5px] border-line">
            {difficult.length === 0 && (
              <p className="px-4 py-5 text-sm text-muted">No reviewed cards yet.</p>
            )}
            {difficult.map((card, i) => (
              <Link
                key={card.id}
                href={`/decks/${card.deckId}/cards/${card.id}`}
                className={`flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-soft/30 ${
                  i > 0 ? "border-t border-soft" : ""
                }`}
              >
                <span className="min-w-0">
                  <b className="type-term text-[0.95rem]">{card.term}</b>
                  <span className="ml-2 text-[0.78rem] text-muted">{card.translation}</span>
                </span>
                <span className="tnum shrink-0 text-[0.72rem] font-bold text-coral">
                  d {card.difficulty.toFixed(1)} · {card.lapses} lapses
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="label-caps mb-3 text-muted">Strongest cards</p>
          <div className="border-[1.5px] border-line">
            {graduates.length === 0 && (
              <p className="px-4 py-5 text-sm text-muted">No reviewed cards yet.</p>
            )}
            {graduates.map((card, i) => (
              <Link
                key={card.id}
                href={`/decks/${card.deckId}/cards/${card.id}`}
                className={`flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-soft/30 ${
                  i > 0 ? "border-t border-soft" : ""
                }`}
              >
                <span className="min-w-0">
                  <b className="type-term text-[0.95rem]">{card.term}</b>
                  <span className="ml-2 text-[0.78rem] text-muted">{card.translation}</span>
                </span>
                <span className="tnum shrink-0 text-[0.72rem] font-bold text-teal">
                  {card.stability.toFixed(0)}d stability
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
