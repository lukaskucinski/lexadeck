import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heatmap } from "@/components/ui/Heatmap";
import { DeckTile } from "@/components/deck/DeckTile";
import { getDeckSummaries } from "@/lib/queries";
import { getReviewActivity } from "@/lib/stats";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (h < 12) return "buenos días";
  if (h < 19) return "buenas tardes";
  return "buenas noches";
}

export default async function DashboardPage() {
  const [decks, activity, recent] = await Promise.all([
    getDeckSummaries(),
    getReviewActivity(95),
    prisma.card.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, deckId: true, term: true, emoji: true },
    }),
  ]);

  const totalReady = decks.reduce((sum, d) => sum + d.readyCount, 0);
  const primaryDeck = [...decks].sort((a, b) => b.readyCount - a.readyCount)[0];

  return (
    <div>
      <header className="border-b-[3px] border-line pb-8">
        <h1 className="type-display text-5xl md:text-7xl">
          {greeting()},
          <br />
          <span className="text-coral">lukas.</span>
        </h1>
        <p className="mt-5 max-w-[44ch] font-medium text-muted">
          {totalReady > 0 ? (
            <>
              <b className="tnum text-ink">{totalReady.toLocaleString()} cards</b> ready for
              review across <b className="tnum text-ink">{decks.length}</b>{" "}
              {decks.length === 1 ? "deck" : "decks"}.
            </>
          ) : (
            "Nothing due right now — everything is scheduled ahead."
          )}
        </p>
        {primaryDeck && totalReady > 0 && (
          <ButtonLink href={`/decks/${primaryDeck.id}/study`} className="mt-6 h-12 px-7">
            Start review →
          </ButtonLink>
        )}
      </header>

      {decks.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="no decks yet">
            <Link href="/decks/new" className="font-bold text-ink underline">
              Create a deck
            </Link>{" "}
            or run the import script to bring in your Notion cards.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {decks.map((deck) => (
            <DeckTile key={deck.id} deck={deck} />
          ))}
        </div>
      )}

      <section className="mt-12 grid gap-10 lg:grid-cols-[auto_1fr]">
        <div>
          <p className="label-caps mb-3 text-muted">Last 90 days</p>
          <Heatmap data={activity} weeks={14} />
        </div>

        {recent.length > 0 && (
          <div>
            <p className="label-caps mb-3 text-muted">Recently added</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((card) => (
                <Link
                  key={card.id}
                  href={`/decks/${card.deckId}/cards/${card.id}`}
                  className="border-[1.5px] border-line px-3 py-1.5 text-[0.8rem] font-bold transition-colors hover:bg-ink hover:text-bg"
                >
                  {card.emoji && <span className="mr-1.5">{card.emoji}</span>}
                  {card.term}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
