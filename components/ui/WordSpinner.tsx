"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { spinTimeline } from "@/lib/spinner";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rotating word in the landing-page tagline: one pass through `words` (long
 * opening hold, quick middle, decelerating end), then settles on `settleOn`
 * permanently — the page goes still once the visitor starts reading. Static
 * `settleOn` under prefers-reduced-motion.
 */
export function WordSpinner({
  words,
  settleOn,
  className = "",
}: {
  words: string[];
  settleOn: string;
  className?: string;
}) {
  const timeline = useMemo(() => spinTimeline(words, settleOn), [words, settleOn]);
  const [current, setCurrent] = useState(timeline[0].word);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      i += 1;
      setCurrent(timeline[i].word);
      if (Number.isFinite(timeline[i].holdMs)) {
        timer = setTimeout(advance, timeline[i].holdMs);
      } // terminal entry: settled, no further timers
    };
    if (timeline.length > 1) timer = setTimeout(advance, timeline[0].holdMs);
    return () => clearTimeout(timer);
  }, [timeline, reduced]);

  const displayed = reduced ? settleOn : current;

  return (
    <span key={displayed} className={`word-spin-in inline-block ${className}`}>
      {displayed}
    </span>
  );
}
