/**
 * Instant shell for the dashboard route only. Scoped to the (home) route group
 * (not the whole authenticated area) so its Suspense boundary doesn't swallow
 * notFound()'s 404 status on sibling routes like /decks/[id]. Next streams this
 * as the route segment's fallback, so on a cold PWA launch the nav (from the
 * layout) + this skeleton paint in the first flush — ending the OS "lx." splash
 * right away — while the data-heavy dashboard RSC streams in behind it. Shaped
 * to match the dashboard (header + deck grid) so the swap is calm. No JS.
 */
function Bar({ className }: { className?: string }) {
  return <div className={`bg-soft ${className ?? ""}`} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <header className="border-b-[3px] border-line pb-8">
        <Bar className="h-3 w-56" />
        <Bar className="mt-5 h-11 w-80 max-w-full" />
        <Bar className="mt-5 h-4 w-72 max-w-full" />
        <Bar className="mt-6 h-12 w-40" />
      </header>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-[1.5px] border-line p-5">
            <Bar className="h-4 w-28" />
            <Bar className="mt-4 h-7 w-16" />
            <Bar className="mt-3 h-3 w-full" />
            <Bar className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
