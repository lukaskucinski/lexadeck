"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setCardMastered } from "@/lib/actions/cards";
import { endSession, startSession, submitReview } from "@/lib/actions/study";
import { playEffect } from "@/lib/sound";
import { formatDueIn, previewIntervals, Rating, type Grade } from "@/lib/srs";
import { REQUEUE_WINDOW_MS, type StudyCard } from "@/lib/study";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FlashCard } from "./FlashCard";
import { ReviewButtons } from "./ReviewButtons";
import { SoundToggle } from "./SoundToggle";

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

/** "forward" = term first (es→en) · "reverse" = translation first (en→es) */
type Direction = "forward" | "reverse";
const DIRECTION_KEY = "lexadeck-study-direction";

// localStorage-backed external store (same pattern as ThemeToggle)
let directionListeners: (() => void)[] = [];
function subscribeDirection(listener: () => void) {
  directionListeners.push(listener);
  return () => {
    directionListeners = directionListeners.filter((l) => l !== listener);
  };
}
function getDirectionSnapshot(): Direction {
  return localStorage.getItem(DIRECTION_KEY) === "reverse" ? "reverse" : "forward";
}
function setStoredDirection(dir: Direction) {
  localStorage.setItem(DIRECTION_KEY, dir);
  for (const listener of directionListeners) listener();
}

export function StudySession({
  deckId,
  deckName,
  language = "es",
  cards,
  dueCount,
  newCount,
}: {
  deckId: string;
  deckName: string;
  language?: string;
  cards: StudyCard[];
  dueCount: number;
  newCount: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"preview" | "active" | "done">("preview");
  const direction = useSyncExternalStore(
    subscribeDirection,
    getDirectionSnapshot,
    () => "forward" as Direction,
  );
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    cards.map((card) => ({ card, dueAt: 0, pass: 0 })),
  );
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [counts, setCounts] = useState<Counts>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [wash, setWash] = useState<string | null>(null);
  const [studied, setStudied] = useState<ReadonlySet<string>>(new Set());
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const current = queue[0] ?? null;

  const begin = useCallback(() => {
    setPhase("active");
    // don't block the first card on session creation; reviews await this promise
    sessionPromiseRef.current = startSession(deckId);
  }, [deckId]);

  const finish = useCallback(async () => {
    playEffect("complete");
    setPhase("done");
    const sessionId = await sessionPromiseRef.current;
    if (sessionId) await endSession(sessionId, studied.size);
  }, [studied]);

  const rate = useCallback(
    (rating: Grade) => {
      if (!current || !revealed) return;
      const { card, pass } = current;

      setExitDir(rating >= Rating.Good ? 1 : -1);
      setWash(WASH_COLOR[rating]);
      setTimeout(() => setWash(null), 220);
      playEffect(RATING_KEY[rating]);

      // tallies record each card's FIRST rating only (pass 0 = first
      // appearance), so they sum to cards studied; `done` counts every review
      if (pass === 0) {
        setCounts((prev) => {
          const key = RATING_KEY[rating];
          return { ...prev, [key]: prev[key] + 1 };
        });
      }
      setDone((d) => d + 1);
      setStudied((prev) => (prev.has(card.id) ? prev : new Set(prev).add(card.id)));
      setRevealed(false);

      // optimistic pop; server decides if the card re-enters the session
      setQueue((prev) => prev.slice(1));

      (sessionPromiseRef.current ?? Promise.resolve(null))
        .then((sessionId) => submitReview(sessionId, card.id, rating))
        .then(({ dueInMs, fields }) => {
          if (dueInMs <= REQUEUE_WINDOW_MS) {
            const dueAt = Date.now() + Math.max(0, dueInMs);
            setQueue((prev) => {
              const next = [
                ...prev,
                {
                  card: { ...card, isNew: false, srs: fields },
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

  // manual mastery mid-session: persist the flag and drop every queued
  // appearance of the card; not counted as a rating
  const master = useCallback(() => {
    if (!current) return;
    const { card } = current;
    setExitDir(1);
    setWash(WASH_COLOR[Rating.Easy]);
    setTimeout(() => setWash(null), 220);
    playEffect("mastered");
    setRevealed(false);
    setQueue((prev) => prev.filter((item) => item.card.id !== card.id));
    setCardMastered(card.id, true).catch((err) => console.error("master failed:", err));
  }, [current]);

  // session ends when the queue stays drained — the grace period lets an
  // in-flight "Again" re-queue land instead of ending the session under it
  useEffect(() => {
    if (phase !== "active" || queue.length > 0) return;
    const timer = setTimeout(() => void finish(), 800);
    return () => clearTimeout(timer);
  }, [phase, queue.length, finish]);

  // keyboard: space/enter reveal, 1-4 rate, m masters
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "active") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        master();
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key) as Grade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, rate, master]);

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

        {/* study direction — shared FSRS schedule either way */}
        <div className="mt-4 flex w-full border-[1.5px] border-line">
          {(
            [
              ["forward", `${language} → en`],
              ["reverse", `en → ${language}`],
            ] as const
          ).map(([dir, label], i) => (
            <button
              key={dir}
              onClick={() => setStoredDirection(dir)}
              className={`h-10 flex-1 text-[0.72rem] font-extrabold tracking-[0.1em] uppercase transition-colors ${
                i > 0 ? "border-l border-line" : ""
              } ${direction === dir ? "bg-ink text-bg" : "text-muted hover:bg-soft"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.7rem] font-semibold text-muted">
          Cards without a translation always show {language} first.
        </p>

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
    const cardsStudied = studied.size;
    const accuracy =
      cardsStudied > 0
        ? Math.round(((cardsStudied - counts.again) / cardsStudied) * 100)
        : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center px-6">
        <p className="label-caps text-muted">{deckName}</p>
        <h1 className="type-display mt-2 text-5xl">
          done<span className="text-green">.</span>
        </h1>

        <div className="mt-8 w-full border-[1.5px] border-line">
          <div className="grid grid-cols-3">
            <div className="border-r border-soft px-4 py-4">
              <div className="tnum text-3xl font-black">{cardsStudied}</div>
              <div className="label-caps mt-1 text-muted">Cards</div>
            </div>
            <div className="border-r border-soft px-4 py-4">
              <div className="tnum text-3xl font-black">{done}</div>
              <div className="label-caps mt-1 text-muted">Reviews</div>
            </div>
            <div className="px-4 py-4">
              <div className="tnum text-3xl font-black">{accuracy}%</div>
              <div className="label-caps mt-1 text-muted">First try</div>
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
          <div className="border-t border-line px-5 py-3 text-[0.72rem] font-semibold text-muted">
            Ratings count your first answer per card · repeats show up in reviews
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {/* fresh ?s= remounts the keyed session — a link to the bare route
              would keep this component (and its "done" phase) alive */}
          <Button
            variant="outline"
            onClick={() => router.push(`/decks/${deckId}/study?s=${Date.now()}`)}
          >
            Study more
          </Button>
          <ButtonLink href={`/decks/${deckId}`}>Back to deck →</ButtonLink>
        </div>
      </div>
    );
  }

  /* ---------- active ---------- */
  const total = done + queue.length;
  const progress = total > 0 ? done / total : 0;
  // what each rating would do to the current card — re-queues make these
  // intra-session values ("<10m") rather than always days
  const hints =
    current && revealed
      ? (() => {
          const ms = previewIntervals(current.card.srs);
          return {
            [Rating.Again]: formatDueIn(ms[Rating.Again]),
            [Rating.Hard]: formatDueIn(ms[Rating.Hard]),
            [Rating.Good]: formatDueIn(ms[Rating.Good]),
            [Rating.Easy]: formatDueIn(ms[Rating.Easy]),
          };
        })()
      : undefined;

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
        <span className="tnum text-[0.78rem] font-bold whitespace-nowrap">
          {done} done · {queue.length} left
        </span>
        <SoundToggle />
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
                reversed={direction === "reverse" && current.card.translation != null}
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
          <ReviewButtons onRate={rate} hints={hints} />
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="h-14 w-full border-[1.5px] border-line text-[0.8rem] font-extrabold tracking-[0.1em] uppercase transition-colors hover:bg-ink hover:text-bg"
          >
            Reveal answer
          </button>
        )}
        <button
          onClick={master}
          disabled={!current}
          className="mt-3 h-8 w-full text-[0.68rem] font-extrabold tracking-[0.12em] uppercase text-muted transition-colors hover:text-ink disabled:opacity-0"
        >
          ✓ Mark mastered · removes from study (M)
        </button>
      </div>
    </div>
  );
}
