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
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setCardWordType } from "@/lib/actions/cards";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS, WordType } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { CardActionsMenu } from "@/components/card/CardActionsMenu";
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
}: {
  card: CardRow;
  overlay?: boolean;
  onOpen?: (card: CardRow) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={() => onOpen?.(card)}
      className={`group flex items-center justify-between gap-2 border-b border-soft bg-bg px-3.5 py-2.5 last:border-b-0 ${
        isDragging && !overlay ? "opacity-30" : ""
      } ${overlay ? "border-[1.5px] border-line shadow-[4px_4px_0_0_var(--c-soft)]" : "cursor-pointer hover:bg-soft/40"}`}
    >
      <div className="min-w-0">
        <Link
          href={`/decks/${card.deckId}/cards/${card.id}`}
          className="type-term block truncate text-[0.95rem] hover:text-coral"
          onClick={(e) => e.stopPropagation()}
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
          <KanbanCard key={card.id} card={card} onOpen={onOpen} />
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
  const [, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
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

  useEffect(() => {
    updateOverflow();
    window.addEventListener("resize", updateOverflow);
    return () => window.removeEventListener("resize", updateOverflow);
  }, [updateOverflow]);

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
    setActive((event.active.data.current?.card as CardRow) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 50);
    const card = event.active.data.current?.card as CardRow | undefined;
    const target = event.over?.id as WordType | undefined;
    if (!card || !target || card.wordType === target) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, wordType: target, gender: target === "NOUN" ? c.gender : null }
          : c,
      ),
    );
    startTransition(() => setCardWordType(card.id, target));
  }

  const canScroll = overflow.left || overflow.right;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* scroll controls sit above the board so they never overlap columns */}
      {canScroll && (
        <div className="mb-3 hidden justify-end md:flex">
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
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={updateOverflow}
          className="flex snap-x snap-proximity gap-5 overflow-x-auto pb-4"
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
      <DragOverlay>{active && <KanbanCard card={active} overlay />}</DragOverlay>
    </DndContext>
  );
}
