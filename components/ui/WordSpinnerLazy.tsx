"use client";

import { type ComponentType, useEffect, useState } from "react";

interface WordSpinnerProps {
  words: string[];
  settleOn: string;
  className?: string;
}

/**
 * Progressive-enhancement wrapper for the headline reel. Server-renders the
 * settled word as plain text — identical to WordSpinner's reduced-motion / done
 * state — so the hero's LCP text is instant and `motion` stays OUT of the
 * landing page's initial bundle. After hydration it lazy-imports the animated
 * WordSpinner (motion lands in its own chunk) and swaps it in to play the reel.
 */
export function WordSpinnerLazy({ words, settleOn, className = "" }: WordSpinnerProps) {
  const [Spinner, setSpinner] = useState<ComponentType<WordSpinnerProps> | null>(null);

  useEffect(() => {
    let active = true;
    import("./WordSpinner").then((m) => {
      if (active) setSpinner(() => m.WordSpinner);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Spinner) return <span className={className}>{settleOn}</span>;
  return <Spinner words={words} settleOn={settleOn} className={className} />;
}
