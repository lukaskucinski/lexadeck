"use client";

import { REPLAY_TOUR_EVENT } from "./FirstRunTourLoader";

/** Settings control that reopens the first-run walkthrough from anywhere in-app. */
export function ReplayWalkthroughButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))}
      className="label-caps border-[1.5px] border-line px-3 py-1.5 transition-colors hover:bg-ink hover:text-bg"
    >
      Replay
    </button>
  );
}
