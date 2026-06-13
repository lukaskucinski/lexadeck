import type { EnrichRunProgress } from "./useEnrichRun";

/** Shared progress bar + status line for an enrichment run (panel + selection bar). */
export function EnrichProgress({
  progress,
  message,
  error,
  className = "",
}: {
  progress: EnrichRunProgress | null;
  message: string | null;
  error: string | null;
  className?: string;
}) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className={className}>
      {progress && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[0.7rem] font-bold tracking-wide text-muted uppercase">
            <span>{progress.phase === "conjugate" ? "Building tables" : "Enriching"}</span>
            <span className="tnum">
              {progress.done}/{progress.total}
            </span>
          </div>
          <div className="h-1.5 w-full bg-soft">
            <div className="h-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {message && <p className="mt-2 text-sm font-semibold text-ink">{message}</p>}
      {error && <p className="mt-2 text-sm font-bold text-coral">{error}</p>}
    </div>
  );
}
