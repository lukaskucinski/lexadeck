"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { endSession, startSession, submitReview } from "@/lib/actions/study";
import { Rating, type Grade } from "@/lib/srs";
import { REQUEUE_WINDOW_MS, type StudyCard } from "@/lib/study";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FlashCard } from "./FlashCard";
import { ReviewButtons } from "./ReviewButtons";

interface QueueItem {
  card: StudyCard;
  /** epoch ms when this item becomes due (requeued items); 0 = due now */
  dueAt: number;
  /** distinguishes re-queued appearances for animation keys */
  pass: number;
}

interface Counts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

const RATING_KEY: Record<Grade, keyof Counts> = {
  [Rating.Again]: "again",
  [Rating.Hard]: "hard",
  [Rating.Good]: "good",
  [Rating.Easy]: "easy",
};

const WASH_COLOR: Record<Grade, string> = {
  [Rating.Again]: "var(--c-coral)",
  [Rating.Hard]: "var(--c-amber)",
  [Rating.Good]: "var(--c-blue)",
  [Rating.Easy]: "var(--c-green)",
};

export function StudySession({
  deckId,
  deckName,
  cards,
  dueCount,
  newCount,
}: {
  deckId: string;
  deckName: string;
  cards: StudyCard[];
  dueCount: number;
  newCount: number;
}) {
  const [phase, setPhase] = useState<"preview" | "active" | "done">("preview");
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    cards.map((card) => ({ card, dueAt: 0, pass: 0 })),
  );
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [counts, setCounts] = useState<Counts>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [wash, setWash] = useState<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const studiedRef = useRef<Set<string>>(new Set());

  const current = queue[0] ?? null;

  const begin = useCallback(() => {
    setPhase("active");
    // don't block the first card on session creation; reviews await this promise
    sessionPromiseRef.current = startSession(deckId);
  }, [deckId]);

  const finish = useCallback(async () => {
    setPhase("done");
    const sessionId = await sessionPromiseRef.current;
    if (sessionId) await endSession(sessionId, studiedRef.current.size);
  }, []);

  const rate = useCallback(
    (rating: Grade) => {
      if (!current || !revealed) return;
      const { card, pass } = current;

      setExitDir(rating >= Rating.Good ? 1 : -1);
      setWash(WASH_COLOR[rating]);
      setTimeout(() => setWash(null), 220);

      setCounts((prev) => {
        const key = RATING_KEY[rating];
        return { ...prev, [key]: prev[key] + 1 };
      });
      setDone((d) => d + 1);
      studiedRef.current.add(card.id);
      setRevealed(false);

      // optimistic pop; server decides if the card re-enters the session
      setQueue((prev) => prev.slice(1));

      (sessionPromiseRef.current ?? Promise.resolve(null))
        .then((sessionId) => submitReview(sessionId, card.id, rating))
        .then(({ dueInMs }) => {
          if (dueInMs <= REQUEUE_WINDOW_MS) {
            const dueAt = Date.now() + Math.max(0, dueInMs);
            setQueue((prev) => {
              const next = [
                ...prev,
                {
                  card: { ...card, isNew: false, reps: card.reps + 1 },
                  dueAt,
                  pass: pass + 1,
                },
              ];
              return next.sort((a, b) => a.dueAt - b.dueAt);
            });
          }
        })
        .catch((err) => console.error("review failed:", err));
    },
    [current, revealed],
  );

  // session ends when the queue drains during active phase
  useEffect(() => {
    if (phase === "active" && queue.length === 0) void finish();
  }, [phase, queue.length, finish]);

  // keyboard: space/enter reveal, 1-4 rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "active") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key) as Grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, rate]);

  /* ---------- preview ---------- */
  if (phase === "preview") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center px-6">
        <p className="label-caps text-muted">{deckName}</p>
        <h1 className="type-display mt-2 text-5xl">
          study<span className="text-coral">.</span>
        </h1>

        <div className="mt-8 w-full border-[1.5px] border-line">
          <div className="grid grid-cols-2">
            <div className="border-r border-soft px-5 py-4">
              <div className="tnum text-4xl font-black text-coral">{dueCount}</div>
              <div className="label-caps mt-1 text-muted">Due</div>
            </div>
            <div className="px-5 py-4">
              <div className="tnum text-4xl font-black text-blue">{newCount}</div>
              <div className="label-caps mt-1 text-muted">New</div>
            </div>
          </div>
          <div className="border-t border-line px-5 py-3 text-[0.72rem] font-semibold text-muted">
            Sessions are capped at 50 cards · keys: space reveals, 1–4 rate
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={begin} disabled={cards.length === 0}>
            Start session →
          </Button>
          <ButtonLink href={`/decks/${deckId}`} variant="ghost">
            Back
          </ButtonLink>
        </div>
        {cards.length === 0 && (
          <p className="mt-4 text-sm font-semibold text-muted">
            Nothing to review right now. Nice.
          </p>
        )}
      </div>
    );
  }

  /* ---------- summary ---------- */
  if (phase === "done") {
    const total = done;
    const accuracy = total > 0 ? Math.round(((total - counts.again) / total) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center px-6">
        <p className="label-caps text-muted">{deckName}</p>
        <h1 className="type-display mt-2 text-5xl">
          done<span className="text-green">.</span>
        </h1>

        <div className="mt-8 w-full border-[1.5px] border-line">
          <div className="grid grid-cols-2">
            <div className="border-r border-soft px-5 py-4">
              <div className="tnum text-4xl font-black">{studiedRef.current.size}</div>
              <div className="label-caps mt-1 text-muted">Cards studied</div>
            </div>
            <div className="px-5 py-4">
              <div className="tnum text-4xl font-black">{accuracy}%</div>
              <div className="label-caps mt-1 text-muted">Accuracy</div>
            </div>
          </div>
          <div className="grid grid-cols-4 border-t border-line">
            {(
              [
                ["again", "--c-coral"],
                ["hard", "--c-amber"],
                ["good", "--c-blue"],
                ["easy", "--c-green"],
              ] as const
            ).map(([key, varName], i) => (
              <div
                key={key}
                className={`px-4 py-3 ${i > 0 ? "border-l border-soft" : ""}`}
              >
                <div className="tnum flex items-center gap-2 text-lg font-black">
                  <i className="h-2.5 w-2.5" style={{ background: `var(${varName})` }} />
                  {counts[key]}
                </div>
                <div className="label-caps mt-0.5 text-muted">{key}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <ButtonLink href={`/decks/${deckId}/study`} variant="outline">
            Study more
          </ButtonLink>
          <ButtonLink href={`/decks/${deckId}`}>Back to deck →</ButtonLink>
        </div>
      </div>
    );
  }

  /* ---------- active ---------- */
  const total = done + queue.length;
  const progress = total > 0 ? done / total : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-6">
      <div className="flex items-center gap-4">
        <Link href={`/decks/${deckId}`} className="label-caps text-muted hover:text-ink">
          ← Exit
        </Link>
        <span className="label-caps">{deckName}</span>
        <div className="relative h-[4px] flex-1 bg-soft">
          <div
            className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="tnum text-[0.78rem] font-bold">
          {done}/{total}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="popLayout" initial={false}>
          {current && (
            <motion.div
              key={`${current.card.id}-${current.pass}`}
              initial={{ x: exitDir * -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: exitDir * 480, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative"
            >
              <FlashCard
                card={current.card}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
              />
              {wash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none absolute inset-0"
                  style={{ background: wash }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pb-2">
        {revealed ? (
          <ReviewButtons onRate={rate} />
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="h-14 w-full border-[1.5px] border-line text-[0.8rem] font-extrabold tracking-[0.1em] uppercase transition-colors hover:bg-ink hover:text-bg"
          >
            Reveal answer
          </button>
        )}
      </div>
    </div>
  );
}
