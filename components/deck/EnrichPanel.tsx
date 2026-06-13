"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  conjugateVerbs,
  type EnrichTargetCounts,
  enrichCards,
  getConjugationTargetIds,
  getEnrichCardIds,
  getEnrichTargets,
} from "@/lib/actions/cards";
import {
  CONJ_BATCH_SIZE,
  chunkIds,
  ENRICH_BATCH_SIZE,
  type EnrichTargetBucket,
} from "@/lib/enrichBatch";

type Phase = "enrich" | "conjugate" | null;
interface Progress {
  done: number;
  total: number;
  phase: Phase;
}

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

const ENRICH_PACE_MS = 400; // breath between chunks; the daily cap is the real limiter

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "AI enrich" for a whole deck. Picks a target population (never enriched /
 * stale / re-enrich), then drives the run client-side: it fetches the card ids,
 * slices them, and calls the server action per chunk — keeping every request
 * short, the progress live, the run cancelable, and quota-exhaustion graceful.
 * Spanish decks only (the parent renders it only for es decks).
 */
export function EnrichPanel({ deckId }: { deckId: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<EnrichTargetCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [selection, setSelection] = useState<Set<EnrichTargetBucket>>(
    () => new Set<EnrichTargetBucket>(["neverEnriched", "stale"]),
  );
  const [includeConjugation, setIncludeConjugation] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(res.error);
      setCounts(null);
      return;
    }
    setError(null);
    setCounts(res.counts ?? null);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setMessage(null);
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

  const selectedEnrichCount = counts
    ? [...selection].reduce((n, b) => n + counts[b], 0)
    : 0;
  const conjCount = includeConjugation && counts ? counts.verbsWithoutTable : 0;
  const plannedTotal = selectedEnrichCount + conjCount;
  const hasWork = plannedTotal > 0;

  async function run() {
    setError(null);
    setMessage(null);
    cancelRef.current = false;

    const idsRes = await getEnrichCardIds(deckId, [...selection]);
    if (idsRes.error) return setError(idsRes.error);
    const enrichIds = idsRes.ids ?? [];

    let conjIds: string[] = [];
    if (includeConjugation) {
      const cRes = await getConjugationTargetIds(deckId);
      if (cRes.error) return setError(cRes.error);
      conjIds = cRes.ids ?? [];
    }

    const total = enrichIds.length + conjIds.length;
    if (total === 0) {
      setMessage("Nothing to do — those cards are already enriched.");
      return;
    }

    setRunning(true);
    let ok = 0;
    let failed = 0;
    let done = 0;
    let quota = false;
    let stopped = false;
    setProgress({ done, total, phase: "enrich" });

    for (const slice of chunkIds(enrichIds, ENRICH_BATCH_SIZE)) {
      if (cancelRef.current) {
        stopped = true;
        break;
      }
      const res = await enrichCards(deckId, slice);
      if (res.error && res.results.length === 0) {
        setError(res.error);
        stopped = true;
        break;
      }
      ok += res.results.filter((r) => r.ok).length;
      failed += res.results.filter((r) => !r.ok).length;
      done += slice.length;
      setProgress({ done, total, phase: "enrich" });
      if (res.quotaExhausted) {
        quota = true;
        stopped = true;
        break;
      }
      await sleep(ENRICH_PACE_MS);
    }

    if (!stopped && conjIds.length) {
      setProgress({ done, total, phase: "conjugate" });
      for (const slice of chunkIds(conjIds, CONJ_BATCH_SIZE)) {
        if (cancelRef.current) {
          stopped = true;
          break;
        }
        const res = await conjugateVerbs(deckId, slice);
        ok += res.results.filter((r) => r.ok).length;
        failed += res.results.filter((r) => !r.ok).length;
        done += slice.length;
        setProgress({ done, total, phase: "conjugate" });
        if (res.quotaExhausted) {
          quota = true;
          stopped = true;
          break;
        }
        await sleep(ENRICH_PACE_MS);
      }
    }

    setRunning(false);
    setProgress(null);
    const remaining = total - done;
    if (quota) {
      setMessage(`Daily AI limit reached — ${ok} done, ${remaining} left. Resume later.`);
    } else if (cancelRef.current) {
      setMessage(`Stopped — ${ok} done, ${remaining} left.`);
    } else {
      setMessage(`Done — ${ok} enriched${failed ? `, ${failed} failed (retry later)` : ""}.`);
    }
    router.refresh();
    loadCounts();
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

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
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    className="flex h-10 items-center gap-2 border-[1.5px] border-coral px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-coral uppercase transition-colors hover:bg-coral hover:text-bg"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={run}
                    disabled={!hasWork}
                    className="flex h-10 items-center gap-2 bg-ink px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-bg uppercase transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {hasWork ? `Enrich ${plannedTotal.toLocaleString()}` : "Nothing to enrich"}
                  </button>
                )}
              </div>

              {progress && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[0.7rem] font-bold tracking-wide text-muted uppercase">
                    <span>{progress.phase === "conjugate" ? "Building tables" : "Enriching"}</span>
                    <span className="tnum">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-soft">
                    <div
                      className="h-full bg-ink transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {message && <p className="mt-3 text-sm font-semibold text-ink">{message}</p>}
              {error && <p className="mt-3 text-sm font-bold text-coral">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
