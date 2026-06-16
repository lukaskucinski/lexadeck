import Link from "next/link";
import { PendingDim } from "@/components/ui/PendingDim";
import type { DeckSummary } from "@/lib/queries";

const SEGMENTS = 20;

function timeAgo(date: Date | null): string {
  if (!date) return "Never studied";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "Studied today";
  if (days === 1) return "Studied yesterday";
  return `Studied ${days} days ago`;
}

export function DeckTile({ deck }: { deck: DeckSummary }) {
  const masteredPct =
    deck.cardCount > 0 ? deck.masteredCount / deck.cardCount : 0;
  const filled = Math.round(masteredPct * SEGMENTS);
  const accent = `var(--c-${deck.accentColor ?? "coral"})`;

  return (
    // the body is one link; the footer keeps its own links (no nested anchors)
    <div className="border-[1.5px] border-line bg-bg">
      <Link href={`/decks/${deck.id}`} className="block">
        <PendingDim className="block pressable hover:bg-soft/30">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
          <span className="type-term text-2xl">{deck.name}</span>
          <span className="label-caps" style={{ color: accent }}>
            {deck.language}
          </span>
        </div>

        <div className="grid grid-cols-3">
          <div className="border-r border-soft px-5 py-4">
            <div className="tnum text-3xl font-black tracking-tight">
              {deck.cardCount.toLocaleString()}
            </div>
            <div className="label-caps mt-1 text-muted">Cards</div>
          </div>
          <div className="border-r border-soft px-5 py-4">
            <div className="tnum text-3xl font-black tracking-tight text-coral">
              {deck.readyCount.toLocaleString()}
            </div>
            <div className="label-caps mt-1 text-muted">Ready</div>
          </div>
          <div className="px-5 py-4">
            <div className="tnum text-3xl font-black tracking-tight">
              {deck.masteredCount.toLocaleString()}
            </div>
            <div className="label-caps mt-1 text-muted">Mastered</div>
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="label-caps mb-2 flex justify-between text-muted">
            <span>Mastered</span>
            <b className="text-ink">{Math.round(masteredPct * 100)}%</b>
          </div>
          <div className="flex h-3 gap-[3px]">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <i
                key={i}
                className="flex-1"
                style={{ background: i < filled ? "var(--c-teal)" : "var(--c-soft)" }}
              />
            ))}
          </div>
        </div>
        </PendingDim>
      </Link>

      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[0.7rem] font-semibold tracking-wide text-muted">
        {timeAgo(deck.lastStudied)}
        <Link
          href={`/decks/${deck.id}/cards/new`}
          className="label-caps pressable text-muted hover:text-ink"
          title={`Add a card to ${deck.name}`}
        >
          + Card
        </Link>
      </div>
    </div>
  );
}
