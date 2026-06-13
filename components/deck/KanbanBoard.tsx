"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setCardsWordType } from "@/lib/actions/cards";
import { planCardMove } from "@/lib/kanbanMove";
import { clearSelection, getSelectionSnapshot, toggleSelection } from "@/lib/selectionStore";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS, WordType } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { CardActionsMenu } from "@/components/card/CardActionsMenu";
import { useIsSelected } from "@/components/deck/useDeckSelection";
import type { CardRow } from "@/components/card/cardRow";

const COLUMN_ORDER: WordType[] = [
  "VERB",
  "NOUN",
  "ADJECTIVE",
  "ADVERB",
  "PRONOUN",
  "ARTICLE",
  "CONJUNCTION",
  "PREPOSITION",
  "EXPRESSION",
  "GRAMMAR",
  "OTHER",
];

const PAGE = 50;

function KanbanCard({
  card,
  overlay = false,
  onOpen,
  selectionKey,
  count = 1,
}: {
  card: CardRow;
  overlay?: boolean;
  onOpen?: (card: CardRow) => void;
  selectionKey?: string;
  /** for the drag overlay: how many cards are being dragged together */
  count?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });
  const selected = useIsSelected(selectionKey ?? "", card.id);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={(e) => {
        // shift-click selects instead of opening
        if (!overlay && selectionKey && e.shiftKey) {
          e.preventDefault();
          toggleSelection(selectionKey, card.id, card.wordType);
          return;
        }
        onOpen?.(card);
      }}
      className={`group relative flex items-center justify-between gap-2 border-b border-soft bg-bg px-3.5 py-2.5 last:border-b-0 ${
        isDragging && !overlay ? "opacity-30" : ""
      } ${overlay ? "border-[1.5px] border-line shadow-[4px_4px_0_0_var(--c-soft)]" : "cursor-pointer hover:bg-soft/40"} ${
        selected && !overlay ? "bg-soft/60 ring-1 ring-ink ring-inset" : ""
      }`}
    >
      <div className="min-w-0">
        <Link
          href={`/decks/${card.deckId}/cards/${card.id}`}
          className="type-term block truncate text-[0.95rem] hover:text-coral"
          onClick={(e) => {
            if (selectionKey && e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              toggleSelection(selectionKey, card.id, card.wordType);
              return;
            }
            e.stopPropagation();
          }}
          draggable={false}
        >
          {card.term}
        </Link>
        <div className="truncate text-[0.74rem] font-medium text-muted">
          {card.translation ?? "—"}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!overlay && (
          <CardActionsMenu
            cardId={card.id}
            deckId={card.deckId}
            srs={card.srs}
            className="md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100"
          />
        )}
        <i
          title={SRS_STATE_LABELS[card.srs]}
          className="h-2 w-2 shrink-0"
          style={{ background: srsStateVar(card.srs) }}
        />
      </div>
      {overlay && count > 1 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[0.7rem] font-bold text-bg">
          {count}
        </span>
      )}
    </div>
  );
}

function KanbanColumn({
  wordType,
  cards,
  deckId,
  onOpen,
}: {
  wordType: WordType;
  cards: CardRow[];
  deckId: string;
  onOpen: (card: CardRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: wordType });
  const [visible, setVisible] = useState(PAGE);

  return (
    <div className="flex w-[240px] shrink-0 snap-start flex-col md:w-[264px] xl:w-[290px]">
      <div
        className="flex items-center gap-2.5 border-b-2 px-1 pb-2"
        style={{ borderColor: wordTypeVar(wordType) }}
      >
        <i className="h-[11px] w-[11px]" style={{ background: wordTypeVar(wordType) }} />
        <span className="label-caps">{WORD_TYPE_LABELS[wordType]}</span>
        <span className="tnum ml-auto text-[0.74rem] font-bold text-muted">{cards.length}</span>
        <Link
          href={`/decks/${deckId}/cards/new?wordType=${wordType}`}
          title={`Add ${WORD_TYPE_LABELS[wordType].toLowerCase()}`}
          className="text-muted hover:text-ink"
        >
          <Plus size={15} />
        </Link>
      </div>

      <div
        ref={setNodeRef}
        className={`mt-2 border-[1.5px] transition-colors ${
          isOver ? "border-line bg-soft/50" : "border-soft"
        }`}
      >
        {cards.slice(0, visible).map((card) => (
          <KanbanCard key={card.id} card={card} onOpen={onOpen} selectionKey={deckId} />
        ))}
        {cards.length === 0 && (
          <div className="px-3.5 py-6 text-center text-[0.74rem] font-semibold text-muted">
            Drop cards here
          </div>
        )}
      </div>

      {cards.length > visible && (
        <button
          onClick={() => setVisible((v) => v + PAGE)}
          className="label-caps mt-2 self-start text-muted hover:text-ink"
        >
          Show {Math.min(PAGE, cards.length - visible)} more ↓
        </button>
      )}
    </div>
  );
}

export function KanbanBoard({ cards: initialCards, deckId }: { cards: CardRow[]; deckId: string }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [prevInitial, setPrevInitial] = useState(initialCards);
  const [active, setActive] = useState<CardRow | null>(null);
  const [multiCount, setMultiCount] = useState(1); // # cards dragging together (overlay badge)
  const [, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const [fullscreen, setFullscreen] = useState(false);
  // the click that follows a drop must not open the card
  const justDragged = useRef(false);

  // derived-state sync when the server re-renders with fresh data
  if (prevInitial !== initialCards) {
    setPrevInitial(initialCards);
    setCards(initialCards);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const updateOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  // re-measure when the board resizes into/out of the full-screen overlay
  useEffect(() => {
    updateOverflow();
    window.addEventListener("resize", updateOverflow);
    return () => window.removeEventListener("resize", updateOverflow);
  }, [updateOverflow, fullscreen]);

  // full screen: Escape exits, the page behind stays put
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const openCard = useCallback(
    (card: CardRow) => {
      if (justDragged.current) return;
      router.push(`/decks/${card.deckId}/cards/${card.id}`);
    },
    [router],
  );

  function nudge(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  const columns = useMemo(() => {
    const grouped = new Map<WordType, CardRow[]>();
    for (const card of cards) {
      const list = grouped.get(card.wordType) ?? [];
      list.push(card);
      grouped.set(card.wordType, list);
    }
    return COLUMN_ORDER.filter((wt) => grouped.has(wt)).map((wt) => ({
      wordType: wt,
      cards: grouped.get(wt)!,
    }));
  }, [cards]);

  function onDragStart(event: DragStartEvent) {
    const card = (event.active.data.current?.card as CardRow) ?? null;
    setActive(card);
    const sel = getSelectionSnapshot(deckId);
    setMultiCount(card && sel.has(card.id) ? sel.size : 1);
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 50);
    const card = event.active.data.current?.card as CardRow | undefined;
    const target = event.over?.id as WordType | undefined;
    if (!card || !target) return;

    // dragging a SELECTED card moves the whole selection; dragging an UNSELECTED
    // card moves just it and clears any existing selection (see planCardMove)
    const selectedIds = new Set(getSelectionSnapshot(deckId).keys());
    const { moveIds, clearSelection: shouldClear } = planCardMove(card.id, target, selectedIds, cards);
    if (shouldClear) clearSelection(deckId);
    if (moveIds.length === 0) return;

    setCards((prev) =>
      prev.map((c) =>
        moveIds.includes(c.id)
          ? { ...c, wordType: target, gender: target === "NOUN" ? c.gender : null }
          : c,
      ),
    );
    startTransition(() => setCardsWordType(moveIds, target));
  }

  const canScroll = overflow.left || overflow.right;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        className={
          fullscreen ? "fixed inset-0 z-50 flex flex-col bg-bg px-5 py-4 md:px-8 md:py-5" : ""
        }
      >
        {/* controls sit above the board so they never overlap columns */}
        <div className="mb-3 hidden items-center md:flex">
          {fullscreen && <span className="label-caps text-muted">Esc exits full screen</span>}
          <div className="ml-auto flex">
            {canScroll && (
              <>
                <button
                  onClick={() => nudge(-1)}
                  disabled={!overflow.left}
                  aria-label="Scroll columns left"
                  className="flex h-8 w-9 items-center justify-center border-[1.5px] border-line text-muted transition-colors enabled:hover:bg-ink enabled:hover:text-bg disabled:border-soft disabled:text-muted/40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => nudge(1)}
                  disabled={!overflow.right}
                  aria-label="Scroll columns right"
                  className="-ml-[1.5px] flex h-8 w-9 items-center justify-center border-[1.5px] border-line text-muted transition-colors enabled:hover:bg-ink enabled:hover:text-bg disabled:border-soft disabled:text-muted/40"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <button
              onClick={() => setFullscreen((v) => !v)}
              aria-label={fullscreen ? "Exit full screen" : "View board full screen"}
              title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
              className={`flex h-8 w-9 items-center justify-center border-[1.5px] border-line text-muted transition-colors hover:bg-ink hover:text-bg ${
                canScroll ? "-ml-[1.5px]" : ""
              }`}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        <div className={`relative ${fullscreen ? "min-h-0 flex-1" : ""}`}>
          <div
            ref={scrollerRef}
            onScroll={updateOverflow}
            className={`flex snap-x snap-proximity gap-5 overflow-x-auto pb-4 ${
              fullscreen ? "h-full items-start overflow-y-auto" : ""
            }`}
          >
            {columns.map(({ wordType, cards: columnCards }) => (
              <KanbanColumn
                key={wordType}
                wordType={wordType}
                cards={columnCards}
                deckId={deckId}
                onOpen={openCard}
              />
            ))}
          </div>

          {/* edge fades hint at horizontally clipped columns */}
          {overflow.left && (
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent" />
          )}
          {overflow.right && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent" />
          )}
        </div>
      </div>
      <DragOverlay>{active && <KanbanCard card={active} overlay count={multiCount} />}</DragOverlay>
    </DndContext>
  );
}
