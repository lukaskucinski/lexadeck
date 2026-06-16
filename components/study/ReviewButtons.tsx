"use client";

import { tap } from "@/lib/haptics";
import { Rating, type Grade } from "@/lib/srs";

const BUTTONS: { rating: Grade; label: string; varName: string }[] = [
  { rating: Rating.Again, label: "Again", varName: "--c-coral" },
  { rating: Rating.Hard, label: "Hard", varName: "--c-amber" },
  { rating: Rating.Good, label: "Good", varName: "--c-blue" },
  { rating: Rating.Easy, label: "Easy", varName: "--c-green" },
];

export function ReviewButtons({
  onRate,
  disabled = false,
  hints,
}: {
  onRate: (rating: Grade) => void;
  disabled?: boolean;
  /** "due in" preview per rating, e.g. "<10m" / "3d" */
  hints?: Record<Grade, string>;
}) {
  return (
    <div className="grid w-full grid-cols-4 border-[1.5px] border-line">
      {BUTTONS.map(({ rating, label, varName }, i) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => {
            tap();
            onRate(rating);
          }}
          className={`pressable flex h-16 flex-col items-center justify-center gap-0.5 text-[0.8rem] font-extrabold tracking-[0.04em] uppercase hover:bg-soft disabled:opacity-40 ${
            i > 0 ? "border-l border-line" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5" style={{ background: `var(${varName})` }} />
            {label}
          </span>
          {hints && (
            <small className="tnum text-[0.62rem] font-semibold tracking-normal text-muted normal-case">
              {hints[rating]}
            </small>
          )}
        </button>
      ))}
    </div>
  );
}
