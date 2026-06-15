"use client";

import { useState, useTransition } from "react";
import { conjugateVerb } from "@/lib/actions/cards";
import type { ConjugationData } from "@/lib/conjugation";
import { Button } from "@/components/ui/Button";
import { ConjugationTable } from "@/components/card/ConjugationTable";

/**
 * "Show all tenses" for a verb card. If the full table is already cached on the
 * card it expands instantly; otherwise the first open generates it (per-language
 * ConjugationSpec) and caches it on the card. The table is self-describing
 * (ConjugationData), so this component renders any language without branching.
 */
export function ConjugationPanel({
  cardId,
  initialTable,
}: {
  cardId: string;
  initialTable?: ConjugationData;
}) {
  const [table, setTable] = useState<ConjugationData | undefined>(initialTable);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    start(async () => {
      const res = await conjugateVerb(cardId);
      if (res.error || !res.table) {
        setError(res.error ?? "No conjugation returned");
        return;
      }
      setTable(res.table);
      setOpen(true);
    });
  }

  return (
    <div className="border-t border-soft px-6 py-5">
      {!table ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={generate}>
            {pending ? "Conjugating…" : "Show all tenses"}
          </Button>
          {error && <span className="text-sm font-bold text-coral">{error}</span>}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="label-caps flex items-center gap-2 text-muted hover:text-ink"
            aria-expanded={open}
          >
            <span className="inline-block w-3">{open ? "▾" : "▸"}</span>
            All tenses
          </button>
          {open && <ConjugationTable data={table} />}
        </>
      )}
    </div>
  );
}
