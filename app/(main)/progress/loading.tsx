/**
 * Instant shell for /progress. force-dynamic (heatmap + aggregates + per-deck
 * stats) but no notFound() and no dynamic children, so a route-level fallback is
 * safe and gets prefetched — "Progress" taps swap in this skeleton immediately
 * while the data streams. Shaped like the page (stats row, heatmap, states bar,
 * mastery-by-deck list). No JS.
 */
import { Bar, SkeletonScreen } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <header className="mb-8 border-b-[3px] border-line pb-4">
        <Bar className="h-11 w-56" />
      </header>

      {/* headline stats */}
      <div className="grid grid-cols-2 border-[1.5px] border-line sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`px-5 py-5 ${i > 0 ? "border-l border-soft" : ""}`}>
            <Bar className="h-9 w-16" />
            <Bar className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* year heatmap */}
      <section className="mt-10">
        <Bar className="mb-3 h-3 w-48" />
        <Bar className="h-28 w-full" />
      </section>

      {/* card states */}
      <section className="mt-10">
        <Bar className="mb-3 h-3 w-24" />
        <Bar className="h-8 w-full" />
      </section>

      {/* mastery by deck */}
      <section className="mt-10">
        <Bar className="mb-3 h-3 w-32" />
        <div className="border-[1.5px] border-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-5 px-5 py-4 ${i > 0 ? "border-t border-soft" : ""}`}
            >
              <Bar className="h-4 w-40 shrink-0" />
              <Bar className="h-3 flex-1" />
              <Bar className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
