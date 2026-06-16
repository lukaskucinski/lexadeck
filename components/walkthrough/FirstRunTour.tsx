"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChartNoAxesColumn,
  House,
  Layers,
  LibraryBig,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { setHighlight, setTourActive } from "@/lib/walkthrough/highlightStore";
import { tourPlanForAge, type TourIcon } from "@/lib/walkthrough/steps";

const ICONS: Record<TourIcon, LucideIcon> = {
  welcome: Sparkles,
  decks: Layers,
  study: House,
  library: LibraryBig,
  progress: ChartNoAxesColumn,
  settings: Settings,
};

const CONTROL =
  "inline-flex h-10 items-center justify-center bg-ink px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-bg uppercase transition-colors hover:bg-coral";

/**
 * The first-run walkthrough carousel. Loaded lazily by FirstRunTourLoader, so its
 * motion chunk only ships when the tour actually opens. While mounted it lifts the
 * nav above the dim (via the highlight store) and spotlights the step's nav item.
 * The age-derived variant changes only tone/depth/size — never any visible label.
 */
export default function FirstRunTour({
  ageRange,
  onClose,
}: {
  ageRange: string | null;
  onClose: () => void;
}) {
  const { variant, steps } = tourPlanForAge(ageRange);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const isSenior = variant === "senior";
  const Icon = ICONS[step.icon];

  // Lift + dim the nav layer for the tour's lifetime; restore on unmount.
  useEffect(() => {
    setTourActive(true);
    return () => {
      setTourActive(false);
      setHighlight(null);
    };
  }, []);

  // Spotlight the current step's nav item.
  useEffect(() => {
    setHighlight(step.highlightHref);
  }, [step.highlightHref]);

  // Escape skips the tour.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Dim sits BELOW the lifted nav (z-50 < nav z-55); clicking it does nothing. */}
      <div className="fixed inset-0 z-50 bg-black/30" aria-hidden />

      {/* Card sits ABOVE the nav (z-60 > nav z-55). Bottom-aligned on mobile so the
          glowing BottomNav item stays visible beneath it; centered on desktop. */}
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center px-4 pb-24 sm:items-center sm:pb-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Welcome walkthrough"
          className="pointer-events-auto w-full max-w-md border-[1.5px] border-line bg-bg shadow-[8px_8px_0_0_var(--c-soft)]"
        >
          <div className="flex items-center justify-between border-b border-soft px-5 py-3">
            <span className="label-caps text-muted">getting started</span>
            <span className="flex gap-1" aria-hidden>
              {steps.map((s, i) => (
                <i
                  key={s.id}
                  className="h-1.5 w-1.5"
                  style={{
                    background:
                      i === index
                        ? "var(--c-coral)"
                        : i < index
                          ? "var(--c-ink)"
                          : "var(--c-soft)",
                  }}
                />
              ))}
            </span>
          </div>

          <div className="px-5 py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.id}
                initial={reduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center border-[1.5px] border-line text-ink">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <h2 className={`type-term mt-4 ${isSenior ? "text-2xl" : "text-xl"}`}>
                  {step.title}
                </h2>
                <p
                  className={`mt-2 leading-relaxed text-muted ${
                    isSenior ? "text-base" : "text-sm"
                  }`}
                >
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-soft px-5 py-3.5">
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
              {!isLast && (
                <button
                  type="button"
                  onClick={onClose}
                  className="label-caps text-muted transition-colors hover:text-ink"
                >
                  Skip
                </button>
              )}
            </div>

            {isLast ? (
              <button type="button" onClick={onClose} className={CONTROL}>
                {step.cta ?? "Done"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((n) => Math.min(n + 1, steps.length - 1))}
                className={CONTROL}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
