import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Upload } from "lucide-react";
import { toCardRow } from "@/components/card/cardRow";
import { DeckCardView } from "@/components/card/DeckCardView";
import { DeckSelectionBar } from "@/components/deck/DeckSelectionBar";
import { EnrichPanel } from "@/components/deck/EnrichPanel";
import { LastDeckCookie } from "@/components/deck/LastDeckCookie";
import { ButtonLink } from "@/components/ui/Button";
import { Bar, SkeletonScreen } from "@/components/ui/Skeleton";
import { getLanguageProfile } from "@/lib/ai/languages";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getStudySessionCounts } from "@/lib/queries";
import { parseStudyExclude, STUDY_EXCLUDE_COOKIE } from "@/lib/study";

export const dynamic = "force-dynamic";

const CARD_SELECT = {
  id: true,
  deckId: true,
  term: true,
  translation: true,
  wordType: true,
  gender: true,
  cardType: true,
  emoji: true,
  due: true,
  createdAt: true,
  state: true,
  stability: true,
  masteredAt: true,
} as const;

/** Keep only the string search params for the client view's initial state. */
function queryString(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params.toString();
}

/**
 * The heavy part of the page: loading ALL of a deck's cards. Split into its own
 * async component so the page can wrap it in <Suspense> — the lightweight shell
 * (header + counts) commits as soon as ownership is confirmed, and the full card
 * list streams in behind the skeleton. The page's notFound() runs upstream of
 * this boundary, so a foreign/missing deck still returns a real 404 (no
 * route-level loading.tsx here — that would flush 200 first; see isolation-smoke).
 */
async function DeckCardsSection({
  deckId,
  now,
  initialQuery,
}: {
  deckId: string;
  now: Date;
  initialQuery: string;
}) {
  const cards = await prisma.card.findMany({ where: { deckId }, select: CARD_SELECT });
  const rows = cards.map((c) => toCardRow(c, now));
  return <DeckCardView cards={rows} deckId={deckId} initialQuery={initialQuery} />;
}

/** Calm fallback shaped like DeckCardView (controls bar + card grid). */
function DeckCardsSkeleton() {
  return (
    <SkeletonScreen>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Bar className="h-9 w-28" />
        <div className="flex items-center gap-3">
          <Bar className="h-9 w-40" />
          <Bar className="h-9 w-20" />
          <Bar className="h-9 w-20" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex min-h-36 flex-col border-[1.5px] border-line">
            <div className="flex items-center justify-between border-b border-soft px-3.5 py-2">
              <Bar className="h-2.5 w-16" />
              <Bar className="h-2.5 w-2.5" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 px-3.5 py-3">
              <Bar className="h-5 w-3/4" />
              <Bar className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const now = new Date();

  const user = await requireUser();
  const deck = await prisma.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) notFound();

  const studyExclude = parseStudyExclude((await cookies()).get(STUDY_EXCLUDE_COOKIE)?.value);
  // Header counts only — cheap aggregates. The deck's cards (the heavy load)
  // stream separately via <DeckCardsSection> so the header paints immediately.
  const [total, ready, session] = await Promise.all([
    prisma.card.count({ where: { deckId: id } }),
    prisma.card.count({ where: { deckId: id, due: { lte: now }, masteredAt: null } }),
    getStudySessionCounts(id, now, studyExclude),
  ]);

  // enrichment opens to any tuned language (es/ja/de); structured conjugation
  // tables are language-specific (Spanish only until Phase 2).
  const enrichProfile = getLanguageProfile(deck.language);
  const enrichEnabled = enrichProfile != null;
  const conjugationEnabled = enrichProfile?.conjugation.table ?? false;

  return (
    <div>
      <LastDeckCookie deckId={id} />
      <DeckSelectionBar
        deckId={id}
        enrichEnabled={enrichEnabled}
        conjugationEnabled={conjugationEnabled}
      />
      {/* /decks auto-opens this deck again — ?all=1 suppresses the redirect */}
      <nav className="label-caps mb-4">
        <Link href="/decks?all=1" className="text-muted hover:text-ink">
          ← all decks
        </Link>
      </nav>
      <header className="mb-6 border-b-[3px] border-line pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps mb-1.5 flex items-center gap-3 text-muted">
              <span style={{ color: `var(--c-${deck.accentColor ?? "coral"})` }}>
                {deck.language}
              </span>
              <span className="tnum">{total.toLocaleString()} cards</span>
              <span className="tnum text-coral">{ready.toLocaleString()} ready</span>
              <Link href={`/decks/${id}/edit`} className="hover:text-ink" title="Edit deck">
                <Pencil size={13} />
              </Link>
              <Link
                href={`/decks/import?deck=${id}`}
                className="hover:text-ink"
                title="Import cards from CSV"
              >
                <Upload size={13} />
              </Link>
            </div>
            <h1 className="type-display text-4xl md:text-5xl">{deck.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {enrichEnabled && (
              <EnrichPanel deckId={id} conjugationEnabled={conjugationEnabled} />
            )}
            <ButtonLink href={`/decks/${id}/cards/new`} variant="outline">
              + Card
            </ButtonLink>
            <ButtonLink href={`/decks/${id}/study`} variant="primary">
              Study {session.total > 0 ? `(${session.total})` : ""} →
            </ButtonLink>
          </div>
        </div>
      </header>

      <Suspense fallback={<DeckCardsSkeleton />}>
        <DeckCardsSection deckId={id} now={now} initialQuery={queryString(sp)} />
      </Suspense>
    </div>
  );
}
