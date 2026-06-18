"use client";

import { useActionState, useState } from "react";
import { submitPlacement, type PlacementState } from "@/lib/actions/placement";
import type { CefrLevel } from "@/lib/ai/cefr";
import type { PlacementItem } from "@/lib/placement/items";
import { ButtonLink } from "@/components/ui/Button";

/** A short human label per band for the result screen. */
const BAND_LABEL: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

export function PlacementTest({
  items,
  skipHref,
  continueHref,
}: {
  items: PlacementItem[];
  skipHref: string;
  continueHref: string;
}) {
  const [state, formAction, pending] = useActionState<PlacementState, FormData>(
    submitPlacement,
    {},
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Result screen — shown once the action returns a scored band.
  if (state.level) {
    const level = state.level as CefrLevel;
    return (
      <div className="mt-8 border-[1.5px] border-line">
        <div className="border-b border-soft px-6 py-5">
          <p className="label-caps text-muted">your level</p>
          <p className="type-display mt-2 text-6xl">
            {level}
            <span className="text-coral">.</span>
          </p>
          <p className="mt-2 text-sm font-medium text-muted">
            {BAND_LABEL[level] ?? ""} — we&apos;ll tune AI enrichment to this level. You can
            change it any time in Settings.
          </p>
        </div>
        <div className="flex items-center justify-end px-6 py-4">
          <ButtonLink href={continueHref}>Continue →</ButtonLink>
        </div>
      </div>
    );
  }

  const item = items[index];
  const isLast = index === items.length - 1;
  const selected = answers[item.id];

  function choose(choice: number) {
    setAnswers((a) => ({ ...a, [item.id]: choice }));
  }

  return (
    <form action={formAction} className="mt-8">
      {/* All collected answers ride along as hidden fields; scoring re-checks them. */}
      {Object.entries(answers).map(([id, choice]) => (
        <input key={id} type="hidden" name={`q_${id}`} value={choice} />
      ))}

      <div className="border-[1.5px] border-line">
        {/* Progress */}
        <div className="flex items-center justify-between border-b border-soft px-5 py-3">
          <span className="label-caps tnum text-muted">
            Q{index + 1} / {items.length}
          </span>
          <span className="flex gap-1" aria-hidden>
            {items.map((it, i) => (
              <i
                key={it.id}
                className="h-1.5 w-1.5"
                style={{ background: i <= index ? "var(--c-ink)" : "var(--c-soft)" }}
              />
            ))}
          </span>
        </div>

        {/* Question */}
        <div className="border-b border-soft px-5 py-5">
          <p className="text-[0.72rem] font-medium text-muted">{item.promptEn}</p>
          <p className="type-term mt-2 text-2xl">{item.prompt}</p>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {item.choices.map((choice, i) => {
            const active = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                aria-pressed={active}
                className={`border-b border-soft px-5 py-4 text-left text-sm font-bold transition-colors sm:[&:nth-child(2n)]:border-l sm:[&:nth-child(2n)]:border-l-soft ${
                  active ? "bg-ink text-bg" : "text-ink hover:bg-soft/40"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm font-bold text-coral">{state.error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((n) => n - 1)}
              className="label-caps text-muted transition-colors hover:text-ink"
            >
              ← Back
            </button>
          )}
          <a
            href={skipHref}
            className="label-caps text-muted transition-colors hover:text-ink"
          >
            Skip the test
          </a>
        </div>

        {isLast ? (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 bg-ink px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-bg uppercase transition-colors hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Scoring…" : "See my level →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((n) => Math.min(n + 1, items.length - 1))}
            className="inline-flex h-10 items-center justify-center gap-2 bg-ink px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-bg uppercase transition-colors hover:bg-coral"
          >
            Next →
          </button>
        )}
      </div>
    </form>
  );
}
