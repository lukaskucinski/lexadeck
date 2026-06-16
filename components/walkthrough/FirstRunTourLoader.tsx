"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dismissWalkthrough } from "@/lib/actions/walkthrough";

// Lazy so the tour (and its motion chunk) costs nothing for users who won't see it.
const FirstRunTour = dynamic(() => import("./FirstRunTour"), { ssr: false });

/** Event the Settings "Replay" button fires to reopen the tour from anywhere. */
export const REPLAY_TOUR_EVENT = "lexadeck:replay-tour";

/**
 * Decides whether the first-run walkthrough should show. Auto-opens once on the
 * first dashboard visit (never over /study or an import); reopens on the replay
 * event. Mounted beside CommandPaletteLoader in the (main) layout, so it stays
 * alive across soft navigations and the `dismissed` latch holds.
 */
export function FirstRunTourLoader({
  seen,
  ageRange,
}: {
  seen: boolean;
  ageRange: string | null;
}) {
  const pathname = usePathname();
  const [replayOpen, setReplayOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onReplay() {
      setDismissed(false);
      setReplayOpen(true);
    }
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, onReplay);
  }, []);

  const open = !dismissed && (replayOpen || (!seen && pathname === "/"));
  if (!open) return null;

  function handleClose() {
    setReplayOpen(false);
    setDismissed(true);
    void dismissWalkthrough(); // persist "seen" (no-op if already seen)
  }

  return <FirstRunTour ageRange={ageRange} onClose={handleClose} />;
}
