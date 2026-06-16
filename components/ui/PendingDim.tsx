"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";

/**
 * "Hold the dim": while the enclosing <Link>'s navigation is pending, dim this
 * subtree to 0.6 — a seamless continuation of `.pressable`'s :active dim, so a
 * tap that triggers a slow (server-rendered) route still feels acknowledged
 * after the finger lifts.
 *
 * Must render as a descendant of a <Link> (that's how `useLinkStatus` reads the
 * link's pending state). Stays quiet for routes that have a loading.tsx — Next
 * skips the pending phase there, and the skeleton is the feedback instead.
 * Opacity-only, so nothing to gate for reduced-motion.
 *
 * Carry the control's own box classes via `className` (border/bg/layout) so the
 * dim covers the whole control, and include `pressable` (or an explicit opacity
 * transition) so the 0.6 fades in rather than snapping.
 */
export function PendingDim({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  return <div className={`${pending ? "opacity-60 " : ""}${className ?? ""}`}>{children}</div>;
}
