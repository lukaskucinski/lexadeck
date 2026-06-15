"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { StudyCard } from "@/lib/study";

// The demo reuses the real study card (and its `motion` flip). Loading it
// lazily keeps `motion` out of the landing page's initial bundle; the
// placeholder holds the card's height so nothing shifts when it swaps in.
const FlashCard = dynamic(
  () => import("@/components/study/FlashCard").then((m) => m.FlashCard),
  {
    ssr: false,
    loading: () => <div className="min-h-[420px] w-full border-[1.5px] border-line bg-bg" />,
  },
);

/**
 * The real study FlashCard as a landing-page set piece: any click toggles
 * the flip. The wrapper owns the state; FlashCard's own front-face click
 * handler is a no-op so a single click doesn't fire two updates.
 */
export function DemoFlashCard({ card }: { card: StudyCard }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="cursor-pointer" onClick={() => setRevealed((v) => !v)}>
      <FlashCard card={card} revealed={revealed} onReveal={() => {}} />
      <p className="label-caps mt-4 text-muted" aria-hidden>
        {revealed ? "click to flip it back" : "click the card to reveal"}
      </p>
    </div>
  );
}
