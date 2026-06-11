"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DWELL_MS = 1800;

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rotating word in the landing-page tagline: cycles through `words` with a
 * quick flip between dwells. Static first word under prefers-reduced-motion.
 * Sized to the current word — neighbors hug the text.
 */
export function WordSpinner({
  words,
  className = "",
}: {
  words: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (reduced || words.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, DWELL_MS);
    return () => clearInterval(id);
  }, [reduced, words.length]);

  const displayed = reduced ? words[0] : words[index];

  return (
    <span key={displayed} className={`word-spin-in inline-block ${className}`}>
      {displayed}
    </span>
  );
}
