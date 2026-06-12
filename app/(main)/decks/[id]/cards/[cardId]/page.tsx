import Link from "next/link";
import { notFound } from "next/navigation";
import { CardStatusActions } from "@/components/card/CardStatusActions";
import { EnrichButton } from "@/components/card/EnrichButton";
import { GenderBadge, SRSBadge, WordTypeBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeEmoji } from "@/lib/emoji";
import { getSRSState, STABILITY_HINT } from "@/lib/srs";
import type { Gender, WordType } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
    include: { deck: true, _count: { select: { reviews: true } } },
  });
  if (!card || card.deckId !== id) notFound();

  const srs = getSRSState(card);
  // legacy rows may hold non-emoji values; never render tofu
  const emoji = sanitizeEmoji(card.emoji);

  return (
    <div className="max-w-3xl">
      <nav className="label-caps mb-8 flex items-center gap-2 text-muted">
        <Link href={`/decks/${id}`} className="hover:text-ink">
          {card.deck.name}
        </Link>
        <span>/</span>
        <span className="text-ink">card</span>
      </nav>

      {/* dictionary entry */}
      <article className="border-[1.5px] border-line">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3.5">
          <div className="flex items-center gap-4">
            <WordTypeBadge wordType={card.wordType as WordType} />
            <GenderBadge gender={card.gender as Gender | null} />
          </div>
          <SRSBadge state={srs} withLabel />
        </div>

        <div className="px-6 py-7">
          <h1 className="type-display text-5xl md:text-6xl">
            {card.term}
            <SpeakButton text={card.term} lang={card.language} size={26} className="ml-4 align-middle" />
            {emoji && <span className="ml-4 align-middle text-4xl">{emoji}</span>}
          </h1>
          <p className="mt-4 text-2xl font-medium tracking-tight">
            {card.translation ?? <span className="text-muted/60">no translation yet</span>}
          </p>
        </div>

        {(card.example || card.exampleEn) && (
          <div className="mx-6 mb-6 border-l-2 border-line pl-4">
            {card.example && (
              <p className="font-medium">
                {card.example}
                <SpeakButton text={card.example} lang={card.language} className="ml-2 align-text-bottom" />
              </p>
            )}
            {card.exampleEn && <p className="mt-1 text-sm text-muted">{card.exampleEn}</p>}
          </div>
        )}

        {card.conjugation && (
          <div className="border-t border-soft px-6 py-5">
            <p className="label-caps mb-2 text-muted">Conjugation</p>
            <pre className="whitespace-pre-wrap font-[inherit] text-sm font-semibold leading-relaxed">
              {card.conjugation}
            </pre>
          </div>
        )}

        {card.notes && (
          <div className="border-t border-soft px-6 py-5">
            <p className="label-caps mb-2 text-muted">Notes</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{card.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 border-t border-line text-center sm:grid-cols-4">
          <div className="border-r border-soft px-4 py-3">
            <div className="tnum text-lg font-black">{card._count.reviews}</div>
            <div className="label-caps text-muted">Reviews</div>
          </div>
          <div className="cursor-help border-soft px-4 py-3 sm:border-r" title={STABILITY_HINT}>
            <div className="tnum text-lg font-black">{card.stability.toFixed(1)}d</div>
            <div className="label-caps text-muted underline decoration-dotted underline-offset-2">
              Stability
            </div>
          </div>
          <div className="border-r border-soft px-4 py-3">
            <div className="tnum text-lg font-black">{fmtDate(card.due)}</div>
            <div className="label-caps text-muted">Next review</div>
          </div>
          <div className="px-4 py-3">
            <div className="tnum text-lg font-black">{fmtDate(card.lastReview)}</div>
            <div className="label-caps text-muted">Last review</div>
          </div>
        </div>
      </article>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ButtonLink href={`/decks/${id}/cards/${cardId}/edit`} variant="outline">
          Edit card
        </ButtonLink>
        <CardStatusActions cardId={cardId} srs={srs} />
        {card.wordType !== "GRAMMAR" && (
          <EnrichButton cardId={cardId} enriched={card.enrichedAt != null} />
        )}
      </div>
    </div>
  );
}
