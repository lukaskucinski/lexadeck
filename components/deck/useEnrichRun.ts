"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { conjugateVerbs, enrichCards } from "@/lib/actions/cards";
import { CONJ_BATCH_SIZE, chunkIds, ENRICH_BATCH_SIZE } from "@/lib/enrichBatch";

export type EnrichPhase = "enrich" | "conjugate" | null;
export interface EnrichRunProgress {
  done: number;
  total: number;
  phase: EnrichPhase;
}

export interface RunArgs {
  enrichIds: string[];
  /** verb ids to also build conjugation tables for (opt-in second pass) */
  conjIds?: string[];
  /** called once the run settles; `fullyCompleted` is false on cancel/quota/error */
  onComplete?: (fullyCompleted: boolean) => void;
}

export interface UseEnrichRun {
  run: (args: RunArgs) => Promise<void>;
  cancel: () => void;
  /** push a pre-run resolution error through the same channel as run errors */
  fail: (msg: string) => void;
  reset: () => void;
  running: boolean;
  progress: EnrichRunProgress | null;
  message: string | null;
  error: string | null;
}

const ENRICH_PACE_MS = 400; // breath between chunks; the daily cap is the real limiter
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drives a chunked AI-enrichment run over explicit card-id arrays, client-side:
 * slices the ids, calls the `enrichCards` / `conjugateVerbs` server actions per
 * chunk, and tracks live progress with Cancel and a graceful daily-quota stop.
 * Extracted from EnrichPanel so the deck-wide panel and the hand-pick selection
 * bar share one engine.
 */
export function useEnrichRun(deckId: string): UseEnrichRun {
  const router = useRouter();
  const cancelRef = useRef(false);
  const runningRef = useRef(false); // synchronous double-fire guard
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<EnrichRunProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);
  const fail = useCallback((msg: string) => setError(msg), []);
  const reset = useCallback(() => {
    setMessage(null);
    setError(null);
  }, []);

  const run = useCallback(
    async ({ enrichIds, conjIds = [], onComplete }: RunArgs) => {
      if (runningRef.current) return;
      setError(null);
      setMessage(null);
      cancelRef.current = false;

      const total = enrichIds.length + conjIds.length;
      if (total === 0) {
        setMessage("Nothing to do — those cards are already enriched.");
        return;
      }

      runningRef.current = true;
      setRunning(true);
      let ok = 0;
      let failed = 0;
      let done = 0;
      let quota = false;
      let errored = false;
      let stopped = false;
      setProgress({ done, total, phase: "enrich" });

      try {
        for (const slice of chunkIds(enrichIds, ENRICH_BATCH_SIZE)) {
          if (cancelRef.current) {
            stopped = true;
            break;
          }
          const res = await enrichCards(deckId, slice);
          if (res.error && res.results.length === 0) {
            setError(res.error);
            errored = true;
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

        const remaining = total - done;
        const canceled = cancelRef.current;
        if (quota) {
          setMessage(`Daily AI limit reached — ${ok} done, ${remaining} left. Resume later.`);
        } else if (canceled) {
          setMessage(`Stopped — ${ok} done, ${remaining} left.`);
        } else if (!errored) {
          setMessage(`Done — ${ok} processed${failed ? `, ${failed} failed (retry later)` : ""}.`);
        }
        router.refresh();
        onComplete?.(!quota && !canceled && !errored);
      } finally {
        runningRef.current = false;
        setRunning(false);
        setProgress(null);
      }
    },
    [deckId, router],
  );

  return { run, cancel, fail, reset, running, progress, message, error };
}
