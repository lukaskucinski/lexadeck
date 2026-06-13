"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCards, updateCardInline } from "@/lib/actions/cards";
import { CardActionsMenu } from "./CardActionsMenu";
import { SRS_STATE_LABELS, WORD_TYPE_LABELS } from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { Button } from "@/components/ui/Button";
import { useDeckSelection } from "@/components/deck/useDeckSelection";
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
  selectionKey,
}: {
  cards: CardRow[];
  sort: string;
  dir: "asc" | "desc";
  showDeck?: boolean;
  /** when set (deck page), selection uses the shared per-deck store and the
   *  inline delete bar yields to the floating DeckSelectionBar */
  selectionKey?: string;
}) {
  const router = useRouter();
  const { setParams } = useViewParams();
  const usingShared = !!selectionKey;
  const shared = useDeckSelection(selectionKey ?? "");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const selected = usingShared ? shared.selected : localSelected;

  function toggleSort(key: string) {
    if (sort === key) setParams({ dir: dir === "asc" ? "desc" : "asc" }, { resetPage: false });
    else setParams({ sort: key, dir: "asc" }, { resetPage: false });
  }

  // library (local) selection via checkboxes; the deck (shared) view selects by
  // shift-click on the row instead
  function toggleLocal(id: string) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = cards.length > 0 && cards.every((c) => selected.has(c.id));

  function toggleAll() {
    const ids = cards.map((c) => c.id);
    setLocalSelected(allSelected ? new Set() : new Set(ids));
  }

  return (
    <div className="border-[1.5px] border-line">
      {!usingShared && localSelected.size > 0 && (
        <div className="flex items-center justify-between border-b border-line bg-soft/40 px-4 py-2">
          <span className="label-caps text-ink">{localSelected.size} selected</span>
          <Button
            variant="danger"
            disabled={pending}
            className="h-8 px-3 text-[0.66rem]"
            onClick={() =>
              startTransition(async () => {
                await deleteCards([...localSelected]);
                setLocalSelected(new Set());
              })
            }
          >
            {pending ? "Deleting…" : `Delete ${localSelected.size}`}
          </Button>
        </div>
      )}

      {/* mobile: secondary columns hide so the table fits the viewport
          (library overflowed the screen); sm+ restores them. The wrapper
          keeps any residual overflow inside the card instead of the page. */}
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {!usingShared && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-[var(--c-ink)]"
                />
              </th>
            )}
            <th className="px-3 py-2.5"><SortHeader id="term" sort={sort} dir={dir} onToggle={toggleSort}>Term</SortHeader></th>
            <th className="px-3 py-2.5"><span className="label-caps text-muted">Translation</span></th>
            {showDeck && <th className="hidden px-3 py-2.5 md:table-cell"><span className="label-caps text-muted">Deck</span></th>}
            <th className="hidden px-3 py-2.5 sm:table-cell"><SortHeader id="wordType" sort={sort} dir={dir} onToggle={toggleSort}>Type</SortHeader></th>
            <th className="hidden px-3 py-2.5 md:table-cell"><span className="label-caps text-muted">State</span></th>
            <th className="hidden px-3 py-2.5 sm:table-cell"><SortHeader id="due" sort={sort} dir={dir} onToggle={toggleSort}>Next</SortHeader></th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr
              key={card.id}
              onClick={(e) => {
                // deck view: shift-click selects; otherwise open the card
                if (usingShared && e.shiftKey) {
                  shared.toggle(card.id, card.wordType);
                  return;
                }
                router.push(`/decks/${card.deckId}/cards/${card.id}`);
              }}
              className={`cursor-pointer border-b border-soft last:border-b-0 ${
                usingShared && selected.has(card.id) ? "bg-soft" : "hover:bg-soft/25"
              }`}
            >
              {/* interactive cells swallow the row click */}
              {!usingShared && (
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(card.id)}
                    onChange={() => toggleLocal(card.id)}
                    className="accent-[var(--c-ink)]"
                  />
                </td>
              )}
              <td className="px-3 py-2 font-bold" onClick={(e) => e.stopPropagation()}>
                <EditableCell cardId={card.id} field="term" value={card.term} />
              </td>
              <td className="px-3 py-2 text-muted" onClick={(e) => e.stopPropagation()}>
                <EditableCell cardId={card.id} field="translation" value={card.translation} />
              </td>
              {showDeck && (
                <td className="hidden px-3 py-2 text-[0.72rem] font-semibold text-muted md:table-cell">{card.deckName}</td>
              )}
              <td className="hidden px-3 py-2 sm:table-cell">
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
              <td className="hidden px-3 py-2 md:table-cell">
                <span
                  className="inline-flex items-center gap-1.5 text-[0.72rem] font-semibold text-muted"
                  title={SRS_STATE_LABELS[card.srs]}
                >
                  <i className="h-2.5 w-2.5" style={{ background: srsStateVar(card.srs) }} />
                  {SRS_STATE_LABELS[card.srs]}
                </span>
              </td>
              <td className="tnum hidden px-3 py-2 text-[0.78rem] font-semibold text-muted sm:table-cell">
                {dueLabel(card.due)}
              </td>
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <CardActionsMenu cardId={card.id} deckId={card.deckId} srs={card.srs} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
