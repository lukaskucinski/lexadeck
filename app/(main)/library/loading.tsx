/**
 * Instant shell for /library. The library route is force-dynamic (loads every
 * card the user owns) but has no notFound() and no dynamic children, so a plain
 * route-level fallback is safe — Next prefetches it, so tapping "Library" swaps
 * in this skeleton with zero latency while the real list streams in behind it.
 * Shaped like LibraryCardView (header + controls + count + list). No JS.
 */
import { Bar, SkeletonScreen } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonScreen>
      <header className="mb-8 border-b-[3px] border-line pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Bar className="h-11 w-52" />
          <div className="flex flex-wrap items-center gap-3">
            <Bar className="h-9 w-40" />
            <Bar className="h-9 w-24" />
            <Bar className="h-9 w-24" />
          </div>
        </div>
      </header>

      <Bar className="mb-4 h-3 w-24" />

      <div className="border-[1.5px] border-line">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t border-soft" : ""}`}
          >
            <Bar className="h-4 w-44 max-w-[40%]" />
            <Bar className="h-3 w-28 max-w-[24%]" />
            <Bar className="ml-auto h-3 w-12" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
