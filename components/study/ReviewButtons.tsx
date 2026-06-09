"use client";

import { Rating, type Grade } from "@/lib/srs";

const BUTTONS: { rating: Grade; label: string; key: string; varName: string }[] = [
  { rating: Rating.Again, label: "Again", key: "1", varName: "--c-coral" },
  { rating: Rating.Hard, label: "Hard", key: "2", varName: "--c-amber" },
  { rating: Rating.Good, label: "Good", key: "3", varName: "--c-blue" },
  { rating: Rating.Easy, label: "Easy", key: "4", varName: "--c-green" },
];

export function ReviewButtons({
  onRate,
  disabled = false,
}: {
  onRate: (rating: Grade) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-4 border-[1.5px] border-line">
      {BUTTONS.map(({ rating, label, key, varName }, i) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onRate(rating)}
          className={`flex h-14 items-center justify-center gap-2.5 text-[0.8rem] font-extrabold tracking-[0.04em] uppercase transition-colors hover:bg-soft disabled:opacity-40 ${
            i > 0 ? "border-l border-line" : ""
          }`}
        >
          <i className="h-2.5 w-2.5" style={{ background: `var(${varName})` }} />
          {label}
          <small className="hidden text-[0.62rem] font-semibold text-muted sm:inline">{key}</small>
        </button>
      ))}
    </div>
  );
}
