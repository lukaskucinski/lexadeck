"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { REEL_DELAY_MS, REEL_SPIN_MS, reelStrip } from "@/lib/spinner";

/**
 * Slot-machine reel in the landing headline. A masked one-line window over a
 * vertical strip of words: after a short beat the reel winds up (nudges
 * upward — the lever pull), then falls fast through one pass of `words`,
 * decelerating until `settleOn` creeps into place. Words physically enter
 * from the top and exit below, neighbors visible at the window edges. After
 * landing, the window width eases down to hug the settled word. Static
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
  // top→bottom: settle word first, then the pass in reverse, then a
  // sacrificial repeat of the settle word — the sliver the wind-up exposes
  const strip = useMemo(() => {
    const reversed = [...reelStrip(words, settleOn)].reverse();
    return [...reversed, reversed[0]];
  }, [words, settleOn]);

  const measureRef = useRef<HTMLSpanElement>(null);
  const [settleWidth, setSettleWidth] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setSettleWidth(measureRef.current?.getBoundingClientRect().width ?? null);
  }, []);

  if (reduced) {
    return <span className={className}>{settleOn}</span>;
  }

  const rows = strip.length;
  const rowPct = (offset: number) => `-${((offset / rows) * 100).toFixed(4)}%`;
  const yStart = rowPct(rows - 2); // opener ("languages") visible
  const yWindup = rowPct(rows - 2 + 0.4); // lever pull: nudge up 40% of a row
  const yLanded = "0%"; // settle word at the top of the strip

  return (
    <motion.span
      data-reel
      className={`relative inline-block h-[1.05em] overflow-hidden align-[-0.25em] ${
        landed ? "" : "[mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]"
      } ${className}`}
      animate={landed && settleWidth ? { width: settleWidth } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* invisible copy of the settle word for the width collapse */}
      <span ref={measureRef} aria-hidden className="invisible absolute whitespace-nowrap">
        {settleOn}
      </span>
      <motion.span
        className="block"
        initial={{ y: yStart }}
        animate={{ y: [yStart, yWindup, yLanded] }}
        transition={{
          delay: REEL_DELAY_MS / 1000,
          duration: REEL_SPIN_MS / 1000,
          times: [0, 0.08, 1],
          ease: ["easeOut", [0.22, 1, 0.36, 1]],
        }}
        onAnimationComplete={() => setLanded(true)}
      >
        {strip.map((word, i) => (
          <span key={`${word}-${i}`} className="block h-[1.05em] leading-[1.05]">
            {word}
          </span>
        ))}
      </motion.span>
    </motion.span>
  );
}
