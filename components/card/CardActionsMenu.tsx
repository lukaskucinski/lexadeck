"use client";

import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useState, useTransition } from "react";
import { queueCardForReview, setCardMastered } from "@/lib/actions/cards";
import type { SRSState } from "@/lib/types";

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-[0.72rem] font-bold tracking-[0.06em] uppercase transition-colors hover:bg-soft"
    >
      {children}
    </button>
  );
}

/**
 * "⋯" actions for a card in any deck view (kanban / grid / list).
 * Stops pointer + click propagation so it coexists with whole-card click
 * targets and dnd-kit drag listeners.
 */
export function CardActionsMenu({
  cardId,
  deckId,
  srs,
  className = "",
}: {
  cardId: string;
  deckId: string;
  srs: SRSState;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function act(fn: () => Promise<void>) {
    setOpen(false);
    startTransition(fn);
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        aria-label="Card actions"
        title="Card actions"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-6 w-6 items-center justify-center transition-colors hover:bg-soft hover:text-ink ${
          open ? "text-ink" : "text-muted"
        }`}
      >
        <Ellipsis size={15} />
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute top-full right-0 z-50 mt-1 w-44 border-[1.5px] border-line bg-bg shadow-[4px_4px_0_0_var(--c-soft)]">
            <MenuItem
              onClick={() => {
                setOpen(false);
                router.push(`/decks/${deckId}/cards/${cardId}`);
              }}
            >
              Open card
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                router.push(`/decks/${deckId}/cards/${cardId}/edit`);
              }}
            >
              Edit
            </MenuItem>
            {(srs === "scheduled" || srs === "learning") && (
              <MenuItem onClick={() => act(() => queueCardForReview(cardId))}>
                Add to review
              </MenuItem>
            )}
            {srs === "mastered" ? (
              <MenuItem onClick={() => act(() => queueCardForReview(cardId))}>
                Unmaster
              </MenuItem>
            ) : (
              <MenuItem onClick={() => act(() => setCardMastered(cardId, true))}>
                Mark mastered
              </MenuItem>
            )}
          </span>
        </>
      )}
    </span>
  );
}
