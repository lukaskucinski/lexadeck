import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";
import type { SRSState } from "./types";

export { Rating, State };
export type { Grade };

/** Stability (in days) at or above which a Review-state card counts as mastered. */
export const MASTERED_STABILITY_DAYS = 21;

/**
 * The FSRS slice of a Card row. Matches prisma/schema.prisma field names;
 * pure-object friendly so scripts and tests can use it without Prisma.
 */
export interface SchedulerFields {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: true,
    // Learning steps: "Again" cards come back within the same session
    enable_short_term: true,
  }),
);

function toFsrsCard(fields: SchedulerFields): FsrsCard {
  return {
    due: fields.due,
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsedDays,
    scheduled_days: fields.scheduledDays,
    learning_steps: fields.learningSteps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: fields.state as State,
    last_review: fields.lastReview ?? undefined,
  };
}

function fromFsrsCard(card: FsrsCard): SchedulerFields {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

/** Fresh FSRS state for a brand-new (or imported) card. */
export function emptySchedulerFields(now: Date = new Date()): SchedulerFields {
  return fromFsrsCard(createEmptyCard(now));
}

export interface RateResult {
  /** Updated scheduler fields to persist on the card. */
  fields: SchedulerFields;
  /** Values for the Review log row. */
  log: {
    rating: number;
    state: number;
    stabilityAfter: number;
    difficultyAfter: number;
    dueAfter: Date;
  };
}

/** Apply a review rating and get back the next scheduler state. */
export function rateCard(
  fields: SchedulerFields,
  rating: Grade,
  now: Date = new Date(),
): RateResult {
  const { card, log } = scheduler.next(toFsrsCard(fields), now, rating);
  const next = fromFsrsCard(card);
  return {
    fields: next,
    log: {
      rating,
      state: log.state,
      stabilityAfter: next.stability,
      difficultyAfter: next.difficulty,
      dueAfter: next.due,
    },
  };
}

/** ms until due for each rating, so the UI can show what each button does. */
export function previewIntervals(
  fields: SchedulerFields,
  now: Date = new Date(),
): Record<Grade, number> {
  const preview = scheduler.repeat(toFsrsCard(fields), now);
  const dueIn = (grade: Grade) => preview[grade].card.due.getTime() - now.getTime();
  return {
    [Rating.Again]: dueIn(Rating.Again),
    [Rating.Hard]: dueIn(Rating.Hard),
    [Rating.Good]: dueIn(Rating.Good),
    [Rating.Easy]: dueIn(Rating.Easy),
  };
}

/** Compact "due in" label: <1m, 8m, 3h, 12d, 4mo, 1.5y. */
export function formatDueIn(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months}mo`;
  const years = ms / (365.25 * 86_400_000);
  return `${Math.round(years * 10) / 10}y`;
}

/** Display-level state used for badges, filters and stats. */
export function getSRSState(
  fields: Pick<SchedulerFields, "state" | "due" | "stability"> & {
    /** manual override — set via "Mark mastered" */
    masteredAt?: Date | null;
  },
  now: Date = new Date(),
): SRSState {
  if (fields.masteredAt) return "mastered";
  switch (fields.state) {
    case State.New:
      return "new";
    case State.Learning:
    case State.Relearning:
      return "learning";
    default: // Review
      if (fields.due <= now) return "due";
      return fields.stability >= MASTERED_STABILITY_DAYS ? "mastered" : "scheduled";
  }
}
