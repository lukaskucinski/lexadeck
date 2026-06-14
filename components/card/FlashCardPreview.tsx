"use client";

import Link from "next/link";
import { resolveCardTap } from "@/lib/cardTap";
import { sanitizeEmoji } from "@/lib/emoji";
import { toggleSelection } from "@/lib/selectionStore";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import {
  useCoarsePointer,
  useHasSelection,
  useIsSelected,
} from "@/components/deck/useDeckSelection";
import { useLongPress } from "@/components/deck/useLongPress";
import { CardActionsMenu } from "./CardActionsMenu";
import type { CardRow } from "./cardRow";

export function FlashCardPreview({ card, selectionKey }: { card: CardRow; selectionKey?: string }) {
  // legacy rows may hold non-emoji values; never render tofu
  const emoji = sanitizeEmoji(card.emoji);
  const selected = useIsSelected(selectionKey ?? "", card.id);
  const hasSelection = useHasSelection(selectionKey ?? "");
  const coarse = useCoarsePointer();
  const longPress = useLongPress({
    onLongPress: () => {
      if (selectionKey) toggleSelection(selectionKey, card.id, card.wordType);
    },
  });

  return (
    <div className="group relative">
      <Link
        href={`/decks/${card.deckId}/cards/${card.id}`}
        {...(selectionKey ? longPress.handlers : {})}
        // shift+mousedown would extend the page's text selection — suppress it
        onMouseDown={(e) => {
          if (selectionKey && e.shiftKey) e.preventDefault();
        }}
        onClick={(e) => {
          if (!selectionKey) return;
          if (longPress.consumedClick()) {
            e.preventDefault(); // a long-press just selected — don't also open
            return;
          }
          if (resolveCardTap({ shiftKey: e.shiftKey, coarse, hasSelection }) === "toggle") {
            e.preventDefault();
            toggleSelection(selectionKey, card.id, card.wordType);
          }
          // otherwise: let the Link open the card
        }}
        className={`flex min-h-36 flex-col border-[1.5px] bg-bg transition-colors hover:bg-soft/30 ${
          selected ? "border-ink ring-1 ring-ink" : "border-line"
        }`}
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
            {emoji && <span className="ml-2 text-base">{emoji}</span>}
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
