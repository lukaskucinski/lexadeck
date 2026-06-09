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

/** Display-level state used for badges, filters and stats. */
export function getSRSState(
  fields: Pick<SchedulerFields, "state" | "due" | "stability">,
  now: Date = new Date(),
): SRSState {
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
