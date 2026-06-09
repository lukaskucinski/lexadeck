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
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setCardWordType } from "@/lib/actions/cards";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS, WordType } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
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

function KanbanCard({ card, overlay = false }: { card: CardRow; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      className={`flex items-center justify-between gap-2 border-b border-soft bg-bg px-3.5 py-2.5 last:border-b-0 ${
        isDragging && !overlay ? "opacity-30" : ""
      } ${overlay ? "border-[1.5px] border-line shadow-[4px_4px_0_0_var(--c-soft)]" : "cursor-grab"}`}
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
      <i
        title={SRS_STATE_LABELS[card.srs]}
        className="h-2 w-2 shrink-0"
        style={{ background: srsStateVar(card.srs) }}
      />
    </div>
  );
}

function KanbanColumn({
  wordType,
  cards,
  deckId,
}: {
  wordType: WordType;
  cards: CardRow[];
  deckId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: wordType });
  const [visible, setVisible] = useState(PAGE);

  return (
    <div className="flex w-[290px] shrink-0 flex-col">
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
          <KanbanCard key={card.id} card={card} />
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
  const [cards, setCards] = useState(initialCards);
  const [active, setActive] = useState<CardRow | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setCards(initialCards), [initialCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-5 overflow-x-auto pb-4">
        {columns.map(({ wordType, cards: columnCards }) => (
          <KanbanColumn
            key={wordType}
            wordType={wordType}
            cards={columnCards}
            deckId={deckId}
          />
        ))}
      </div>
      <DragOverlay>{active && <KanbanCard card={active} overlay />}</DragOverlay>
    </DndContext>
  );
}
