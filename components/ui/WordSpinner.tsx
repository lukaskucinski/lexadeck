"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { REEL_DELAY_MS, REEL_SPIN_MS, reelStrip } from "@/lib/spinner";

/**
 * Slot-machine reel in the landing headline, in three pixel-aligned phases:
 *
 * 1. Spin — a masked one-line window over a vertical strip of words: after a
 *    short beat the reel winds up (nudges upward — the lever pull), falls
 *    fast through one pass of `words`, and decelerates until `settleOn`
 *    creeps into place. Neighbors are visible at the window edges.
 * 2. Closing — the masked window is swapped for an unmasked inline-block of
 *    just the settled word, whose width eases down so the text after it
 *    (the period) glides in snug. No clipping exists in this phase — the
 *    final glyph's ink overhang must never be shaved (the masked window
 *    used to nick the "g" right before the swap).
 * 3. Done — plain static text, identical to the reduced-motion render.
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
  const windowRef = useRef<HTMLSpanElement>(null);
  const [settleWidth, setSettleWidth] = useState<number | null>(null);
  const [reelWidth, setReelWidth] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setSettleWidth(measureRef.current?.getBoundingClientRect().width ?? null);
    setReelWidth(windowRef.current?.getBoundingClientRect().width ?? null);
  }, []);

  if (reduced || done) {
    return <span className={className}>{settleOn}</span>;
  }

  // phase 2: unmasked width glide — inline-block baseline-aligns the text
  // like the static render, so only the trailing period moves
  if (landed && settleWidth && reelWidth) {
    return (
      <motion.span
        className={`inline-block ${className}`}
        initial={{ width: reelWidth }}
        animate={{ width: settleWidth }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onAnimationComplete={() => setDone(true)}
      >
        {settleOn}
      </motion.span>
    );
  }

  const rows = strip.length;
  const rowPct = (offset: number) => `-${((offset / rows) * 100).toFixed(4)}%`;
  const yStart = rowPct(rows - 2); // opener ("languages") visible
  const yWindup = rowPct(rows - 2 + 0.4); // lever pull: nudge up 40% of a row
  const yLanded = "0%"; // settle word at the top of the strip

  // The window paints 1.05em tall (descenders need the room) but its layout
  // margin box is shrunk to a 0.25em sliver that sits inside the text strut,
  // so the line box is purely text-driven — identical across all three
  // phases (no reflow below, ever). The positive align offsets the negative
  // margins: alignment uses the margin edge.
  return (
    <span
      ref={windowRef}
      data-reel
      className={`relative my-[-0.4em] inline-block h-[1.05em] overflow-hidden align-[0.15em] [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] ${className}`}
    >
      {/* invisible copy of the settle word for the closing width glide */}
      <span ref={measureRef} aria-hidden className="invisible absolute whitespace-nowrap">
        {settleOn}
      </span>
      <motion.span
        // top offset: the rows' internal baseline sits 0.054em below the
        // headline baseline (measured; Archivo's ascent/descent split) — lift
        // the strip so the landed word doesn't jump at the phase swap
        className="relative top-[-0.054em] block"
        initial={{ y: yStart }}
        animate={{ y: [yStart, yWindup, yLanded] }}
        transition={{
          delay: REEL_DELAY_MS / 1000,
          duration: REEL_SPIN_MS / 1000,
          times: [0, 0.08, 1],
          ease: ["easeOut", [0.22, 1, 0.36, 1]],
        }}
        onAnimationComplete={() => {
          setLanded(true);
          // no measurements → skip the glide, go straight to static
          if (!settleWidth || !reelWidth) setDone(true);
        }}
      >
        {strip.map((word, i) => (
          <span key={`${word}-${i}`} className="block h-[1.05em] leading-[1.05]">
            {word}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
