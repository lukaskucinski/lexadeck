"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type EnrichTargetCounts,
  getConjugationTargetIds,
  getEnrichCardIds,
  getEnrichTargets,
} from "@/lib/actions/cards";
import { type EnrichTargetBucket } from "@/lib/enrichBatch";
import { EnrichProgress } from "./EnrichProgress";
import { useEnrichRun } from "./useEnrichRun";

const BUCKET_LABELS: Record<EnrichTargetBucket, string> = {
  neverEnriched: "Never enriched",
  stale: "Missing detail layer",
  enriched: "Re-enrich fully enriched",
};

/** One labeled checkbox + count, styled to match the filter panel. */
function CheckRow({
  checked,
  onToggle,
  label,
  count,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 py-1 text-[0.8rem] font-semibold ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className={`flex h-[15px] w-[15px] items-center justify-center border-[1.5px] border-line text-[10px] leading-none ${
          checked ? "bg-ink text-bg" : "bg-transparent"
        }`}
      >
        {checked ? "×" : ""}
      </span>
      <span className={checked ? "text-ink" : "text-muted"}>{label}</span>
      <span className="tnum ml-auto text-muted">{count.toLocaleString()}</span>
    </label>
  );
}

/**
 * "AI enrich" for a whole deck. Picks a target population (never enriched /
 * stale / re-enrich) and hands the resolved card ids to the shared useEnrichRun
 * engine (chunked server-action loop, live progress, Cancel, graceful quota
 * stop). Spanish decks only (the parent renders it only for es decks).
 */
export function EnrichPanel({ deckId }: { deckId: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { run, cancel, fail, reset, running, progress, message, error } = useEnrichRun(deckId);

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<EnrichTargetCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<EnrichTargetBucket>>(
    () => new Set<EnrichTargetBucket>(["neverEnriched", "stale"]),
  );
  const [includeConjugation, setIncludeConjugation] = useState(false);

  // dismiss on click-outside / Escape (never while a run is in flight)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!running && rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !running) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, running]);

  async function loadCounts() {
    setLoadingCounts(true);
    const res = await getEnrichTargets(deckId);
    setLoadingCounts(false);
    if (res.error) {
      setCountsError(res.error);
      setCounts(null);
      return;
    }
    setCountsError(null);
    setCounts(res.counts ?? null);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      reset();
      loadCounts();
    }
  }

  function toggleBucket(b: EnrichTargetBucket) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  const selectedEnrichCount = counts ? [...selection].reduce((n, b) => n + counts[b], 0) : 0;
  const conjCount = includeConjugation && counts ? counts.verbsWithoutTable : 0;
  const plannedTotal = selectedEnrichCount + conjCount;
  const hasWork = plannedTotal > 0;

  async function startRun() {
    reset();
    const idsRes = await getEnrichCardIds(deckId, [...selection]);
    if (idsRes.error) return fail(idsRes.error);
    const enrichIds = idsRes.ids ?? [];

    let conjIds: string[] = [];
    if (includeConjugation) {
      const cRes = await getConjugationTargetIds(deckId);
      if (cRes.error) return fail(cRes.error);
      conjIds = cRes.ids ?? [];
    }

    await run({ enrichIds, conjIds, onComplete: loadCounts });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggleOpen}
        className={`flex h-10 items-center gap-2 border-[1.5px] border-line px-4 text-[0.78rem] font-extrabold tracking-[0.08em] uppercase transition-colors ${
          open ? "bg-ink text-bg" : "text-ink hover:bg-ink hover:text-bg"
        }`}
      >
        <Sparkles size={14} />
        AI enrich
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[340px] max-w-[90vw] border-[1.5px] border-line bg-bg p-5 shadow-[6px_6px_0_0_var(--c-soft)]">
          <p className="label-caps mb-3 text-muted">Enrich cards</p>

          {loadingCounts && !counts ? (
            <p className="text-sm text-muted">Counting cards…</p>
          ) : (
            <>
              <div className="space-y-0.5">
                <CheckRow
                  checked={selection.has("neverEnriched")}
                  onToggle={() => toggleBucket("neverEnriched")}
                  label={BUCKET_LABELS.neverEnriched}
                  count={counts?.neverEnriched ?? 0}
                  disabled={running}
                />
                <CheckRow
                  checked={selection.has("stale")}
                  onToggle={() => toggleBucket("stale")}
                  label={BUCKET_LABELS.stale}
                  count={counts?.stale ?? 0}
                  disabled={running}
                />
                <CheckRow
                  checked={selection.has("enriched")}
                  onToggle={() => toggleBucket("enriched")}
                  label={BUCKET_LABELS.enriched}
                  count={counts?.enriched ?? 0}
                  disabled={running}
                />
              </div>

              <div className="mt-3 border-t border-soft pt-3">
                <CheckRow
                  checked={includeConjugation}
                  onToggle={() => setIncludeConjugation((v) => !v)}
                  label="Also build verb tables"
                  count={counts?.verbsWithoutTable ?? 0}
                  disabled={running}
                />
                <p className="mt-1 text-[0.7rem] leading-snug text-muted">
                  Full conjugation tables cost one AI call per verb — leave off to save quota.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-soft pt-4">
                {running ? (
                  <button
                    onClick={cancel}
                    className="flex h-10 items-center gap-2 border-[1.5px] border-coral px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-coral uppercase transition-colors hover:bg-coral hover:text-bg"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={startRun}
                    disabled={!hasWork}
                    className="flex h-10 items-center gap-2 bg-ink px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-bg uppercase transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {hasWork ? `Enrich ${plannedTotal.toLocaleString()}` : "Nothing to enrich"}
                  </button>
                )}
              </div>

              <EnrichProgress
                progress={progress}
                message={message}
                error={error ?? countsError}
                className="mt-4"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
