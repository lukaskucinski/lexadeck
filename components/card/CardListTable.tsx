"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCards, updateCardInline } from "@/lib/actions/cards";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { Button } from "@/components/ui/Button";
import type { CardRow } from "./cardRow";
import { useViewParams } from "./useViewParams";

function dueLabel(due: Date): string {
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "now";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

/* Editable cell: double-click to edit, Enter/blur saves, Esc cancels. */
function EditableCell({
  cardId,
  field,
  value,
  className = "",
}: {
  cardId: string;
  field: "term" | "translation";
  value: string | null;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [current, setCurrent] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value);

  // derived-state sync when the server re-renders with fresh data
  if (prevValue !== value) {
    setPrevValue(value);
    setCurrent(value ?? "");
    setDraft(value ?? "");
  }

  async function save() {
    setEditing(false);
    if (draft.trim() === current.trim()) return;
    const res = await updateCardInline(cardId, field, draft);
    if (!res.error) setCurrent(draft.trim());
    else setDraft(current);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(current);
            setEditing(false);
          }
        }}
        className="w-full border-b-2 border-coral bg-transparent outline-none"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
      className={`block cursor-text ${className} ${current ? "" : "text-muted/60"}`}
    >
      {current || "—"}
    </span>
  );
}

function SortHeader({
  id,
  sort,
  dir,
  onToggle,
  children,
}: {
  id: string;
  sort: string;
  dir: "asc" | "desc";
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const active = sort === id;
  return (
    <button
      onClick={() => onToggle(id)}
      className={`label-caps inline-flex items-center gap-1 ${active ? "text-ink" : "text-muted hover:text-ink"}`}
    >
      {children}
      {active && (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  );
}

export function CardListTable({
  cards,
  sort,
  dir,
  showDeck = false,
}: {
  cards: CardRow[];
  sort: string;
  dir: "asc" | "desc";
  showDeck?: boolean;
}) {
  const { setParams } = useViewParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggleSort(key: string) {
    if (sort === key) setParams({ dir: dir === "asc" ? "desc" : "asc" }, { resetPage: false });
    else setParams({ sort: key, dir: "asc" }, { resetPage: false });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = cards.length > 0 && cards.every((c) => selected.has(c.id));

  return (
    <div className="border-[1.5px] border-line">
      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-line bg-soft/40 px-4 py-2">
          <span className="label-caps text-ink">{selected.size} selected</span>
          <Button
            variant="danger"
            disabled={pending}
            className="h-8 px-3 text-[0.66rem]"
            onClick={() =>
              startTransition(async () => {
                await deleteCards([...selected]);
                setSelected(new Set());
              })
            }
          >
            {pending ? "Deleting…" : `Delete ${selected.size}`}
          </Button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(cards.map((c) => c.id)))
                }
                className="accent-[var(--c-ink)]"
              />
            </th>
            <th className="px-3 py-2.5"><SortHeader id="term" sort={sort} dir={dir} onToggle={toggleSort}>Term</SortHeader></th>
            <th className="px-3 py-2.5"><span className="label-caps text-muted">Translation</span></th>
            {showDeck && <th className="px-3 py-2.5"><span className="label-caps text-muted">Deck</span></th>}
            <th className="px-3 py-2.5"><SortHeader id="wordType" sort={sort} dir={dir} onToggle={toggleSort}>Type</SortHeader></th>
            <th className="px-3 py-2.5"><span className="label-caps text-muted">State</span></th>
            <th className="px-3 py-2.5"><SortHeader id="due" sort={sort} dir={dir} onToggle={toggleSort}>Next</SortHeader></th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className="border-b border-soft last:border-b-0 hover:bg-soft/25">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(card.id)}
                  onChange={() => toggle(card.id)}
                  className="accent-[var(--c-ink)]"
                />
              </td>
              <td className="px-3 py-2 font-bold">
                <EditableCell cardId={card.id} field="term" value={card.term} />
              </td>
              <td className="px-3 py-2 text-muted">
                <EditableCell cardId={card.id} field="translation" value={card.translation} />
              </td>
              {showDeck && (
                <td className="px-3 py-2 text-[0.72rem] font-semibold text-muted">{card.deckName}</td>
              )}
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold">
                  <i className="h-2.5 w-2.5" style={{ background: wordTypeVar(card.wordType) }} />
                  {WORD_TYPE_LABELS[card.wordType]}
                  {card.gender && (
                    <em className="not-italic text-muted">
                      {card.gender === "MASCULINE" ? "m" : card.gender === "FEMININE" ? "f" : "m·f"}
                    </em>
                  )}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[0.72rem] font-semibold text-muted"
                  title={SRS_STATE_LABELS[card.srs]}
                >
                  <i className="h-2.5 w-2.5" style={{ background: srsStateVar(card.srs) }} />
                  {SRS_STATE_LABELS[card.srs]}
                </span>
              </td>
              <td className="tnum px-3 py-2 text-[0.78rem] font-semibold text-muted">
                {dueLabel(card.due)}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/decks/${card.deckId}/cards/${card.id}`}
                  className="text-muted hover:text-ink"
                  title="Open card"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
