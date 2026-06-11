"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { spinFrames } from "@/lib/spinner";

const STEP_MS = 110; // spin-to-land frame rate
const LOOP_DWELL_MS = 1800; // calm rotation when cycling forever
const FIRST_HOLD_MS = 500;

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Slot-machine word in the tagline. With `landOn` it spins through `words`
 * and decelerates onto the landing word; without it, it cycles forever
 * (landing-page mode). Sized to the current word — neighbors hug the text
 * once it settles.
 */
export function WordSpinner({
  words,
  landOn,
  className = "",
}: {
  words: string[];
  landOn?: string;
  className?: string;
}) {
  const frames = useMemo(
    () => (landOn ? spinFrames(words, landOn) : [...words]),
    [words, landOn],
  );
  const [current, setCurrent] = useState(frames[0]);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (reduced || frames.length <= 1) return;
    const last = frames.length - 1;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i = landOn ? Math.min(i + 1, last) : (i + 1) % frames.length;
      setCurrent(frames[i]);
      if (landOn && i === last) return; // settled
      let delay = LOOP_DWELL_MS;
      if (landOn) {
        // decelerate over the final few frames so the landing reads as a settle
        const remaining = last - i;
        delay = remaining <= 3 ? STEP_MS * (5 - remaining) : STEP_MS;
      }
      timer = setTimeout(step, delay);
    };
    timer = setTimeout(step, landOn ? FIRST_HOLD_MS : LOOP_DWELL_MS);
    return () => clearTimeout(timer);
  }, [frames, landOn, reduced]);

  const displayed = reduced ? (landOn ?? words[0]) : current;

  return (
    <span key={displayed} className={`word-spin-in inline-block ${className}`}>
      {displayed}
    </span>
  );
}
