"use client";

import { useState } from "react";
import { FlashCard } from "@/components/study/FlashCard";
import type { StudyCard } from "@/lib/study";

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
