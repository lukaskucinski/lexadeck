import Link from "next/link";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { CardActionsMenu } from "./CardActionsMenu";
import type { CardRow } from "./cardRow";

export function FlashCardPreview({ card }: { card: CardRow }) {
  return (
    <div className="group relative">
      <Link
        href={`/decks/${card.deckId}/cards/${card.id}`}
        className="flex min-h-36 flex-col border-[1.5px] border-line bg-bg transition-colors hover:bg-soft/30"
      >
        <div className="flex items-center justify-between gap-2 border-b border-soft px-3.5 py-2">
          <span className="label-caps inline-flex items-center gap-2 text-muted">
            <i className="h-2.5 w-2.5" style={{ background: wordTypeVar(card.wordType) }} />
            {WORD_TYPE_LABELS[card.wordType]}
          </span>
          <i
            title={SRS_STATE_LABELS[card.srs]}
            className="h-2.5 w-2.5 shrink-0"
            style={{ background: srsStateVar(card.srs) }}
          />
        </div>

        <div className="flex flex-1 flex-col justify-center px-3.5 py-3">
          <div className="type-term text-xl leading-tight">
            {card.term}
            {card.emoji && <span className="ml-2 text-base">{card.emoji}</span>}
          </div>
          <div className="mt-1 truncate text-[0.82rem] font-medium text-muted">
            {card.translation ?? "—"}
          </div>
        </div>
      </Link>

      <CardActionsMenu
        cardId={card.id}
        deckId={card.deckId}
        srs={card.srs}
        className="absolute right-2 bottom-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100"
      />
    </div>
  );
}
