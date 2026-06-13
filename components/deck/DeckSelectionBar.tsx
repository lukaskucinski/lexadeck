"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteCards, resolveEnrichSelection } from "@/lib/actions/cards";
import { Button } from "@/components/ui/Button";
import { EnrichProgress } from "./EnrichProgress";
import { useDeckSelection } from "./useDeckSelection";
import { useEnrichRun } from "./useEnrichRun";

/**
 * Floating action bar for a hand-picked card selection on the deck page. Reads
 * the shared per-deck selection store (so it reflects picks made in any of the
 * list/grid/kanban views) and offers bulk Enrich (+ opt-in verb tables) and
 * Delete via the shared useEnrichRun engine. Rendered once by the deck page at
 * a stable position so an in-flight run survives view-toggle soft-navs.
 */
export function DeckSelectionBar({
  deckId,
  enrichEnabled,
}: {
  deckId: string;
  enrichEnabled: boolean;
}) {
  const { selected, clear } = useDeckSelection(deckId);
  const enrich = useEnrichRun(deckId);
  const [includeConjugation, setIncludeConjugation] = useState(false);
  const [deleting, startDelete] = useTransition();

  const count = selected.size;
  if (count === 0) return null;
  const busy = enrich.running || deleting;

  async function startEnrich() {
    enrich.reset();
    const res = await resolveEnrichSelection(deckId, [...selected]);
    if (res.error || !res.resolved) {
      enrich.fail(res.error ?? "Could not resolve the selection");
      return;
    }
    const { enrichIds, verbIdsWithoutTable, skipped } = res.resolved;
    if (enrichIds.length === 0) {
      enrich.fail(
        skipped > 0
          ? `Nothing to enrich — ${skipped} grammar card${skipped > 1 ? "s" : ""} skipped`
          : "Nothing to enrich",
      );
      return;
    }
    await enrich.run({
      enrichIds,
      conjIds: includeConjugation ? verbIdsWithoutTable : [],
      onComplete: (fullyCompleted) => {
        if (fullyCompleted) clear(); // keep selection on cancel/quota/error to resume
      },
    });
  }

  function deleteSelected() {
    startDelete(async () => {
      await deleteCards([...selected]);
      clear();
    });
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(94vw,580px)] -translate-x-1/2 border-[1.5px] border-line bg-bg p-3 shadow-[6px_6px_0_0_var(--c-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-caps text-ink">{count} selected</span>

        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {enrich.running ? (
            <Button variant="danger" onClick={enrich.cancel}>
              Cancel
            </Button>
          ) : (
            <>
              {enrichEnabled && (
                <label
                  className={`flex items-center gap-1.5 text-[0.7rem] font-semibold ${
                    busy ? "opacity-40" : "cursor-pointer text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={includeConjugation}
                    onChange={() => setIncludeConjugation((v) => !v)}
                    disabled={busy}
                    className="accent-[var(--c-ink)]"
                  />
                  verb tables
                </label>
              )}
              {enrichEnabled && (
                <Button variant="primary" onClick={startEnrich} disabled={busy}>
                  <Sparkles size={14} />
                  Enrich {count}
                </Button>
              )}
              <Button variant="danger" onClick={deleteSelected} disabled={busy}>
                {deleting ? "Deleting…" : `Delete ${count}`}
              </Button>
              <Button variant="ghost" onClick={clear} disabled={busy}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      <EnrichProgress
        progress={enrich.progress}
        message={enrich.message}
        error={enrich.error}
        className="mt-2"
      />
    </div>
  );
}
