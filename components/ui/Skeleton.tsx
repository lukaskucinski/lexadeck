import type { ReactNode } from "react";

/**
 * Swiss skeleton primitives for route/Suspense loading fallbacks.
 * `Bar` is a soft placeholder block; `SkeletonScreen` is the shared
 * aria-busy + animate-pulse wrapper — one place to own the pulse (so a
 * reduced-motion gate, if ever wanted, lives in a single spot).
 */
export function Bar({ className }: { className?: string }) {
  return <div className={`bg-soft ${className ?? ""}`} />;
}

export function SkeletonScreen({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      {children}
    </div>
  );
}
