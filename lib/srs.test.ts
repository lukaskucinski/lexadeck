import { describe, expect, it } from "vitest";
import {
  emptySchedulerFields,
  getSRSState,
  MASTERED_STABILITY_DAYS,
  rateCard,
  Rating,
  State,
} from "./srs";

const NOW = new Date("2026-06-09T12:00:00Z");

describe("emptySchedulerFields", () => {
  it("creates a New card due immediately", () => {
    const fields = emptySchedulerFields(NOW);
    expect(fields.state).toBe(State.New);
    expect(fields.reps).toBe(0);
    expect(fields.lapses).toBe(0);
    expect(fields.due.getTime()).toBe(NOW.getTime());
    expect(fields.lastReview).toBeNull();
  });
});

describe("rateCard", () => {
  it("Again on a new card re-queues it within minutes (short-term step)", () => {
    const { fields } = rateCard(emptySchedulerFields(NOW), Rating.Again, NOW);
    expect(fields.state).toBe(State.Learning);
    const minutesAhead = (fields.due.getTime() - NOW.getTime()) / 60_000;
    expect(minutesAhead).toBeGreaterThan(0);
    expect(minutesAhead).toBeLessThan(30); // same-session re-queue
  });

  it("Good on a new card enters learning, then graduates to Review", () => {
    const first = rateCard(emptySchedulerFields(NOW), Rating.Good, NOW);
    expect(first.fields.reps).toBe(1);

    // keep rating Good at each due time until the card reaches Review state
    let current = first.fields;
    for (let i = 0; i < 5 && current.state !== State.Review; i++) {
      current = rateCard(current, Rating.Good, current.due).fields;
    }
    expect(current.state).toBe(State.Review);
    expect(current.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it("Easy graduates immediately with a multi-day interval", () => {
    const { fields } = rateCard(emptySchedulerFields(NOW), Rating.Easy, NOW);
    expect(fields.state).toBe(State.Review);
    const daysAhead = (fields.due.getTime() - NOW.getTime()) / 86_400_000;
    expect(daysAhead).toBeGreaterThanOrEqual(1);
  });

  it("Again on a Review card records a lapse and enters Relearning", () => {
    // graduate first
    let current = rateCard(emptySchedulerFields(NOW), Rating.Easy, NOW).fields;
    expect(current.state).toBe(State.Review);

    const lapsesBefore = current.lapses;
    current = rateCard(current, Rating.Again, current.due).fields;
    expect(current.state).toBe(State.Relearning);
    expect(current.lapses).toBe(lapsesBefore + 1);
  });

  it("repeated Good reviews grow stability monotonically", () => {
    let current = rateCard(emptySchedulerFields(NOW), Rating.Easy, NOW).fields;
    let previousStability = current.stability;
    for (let i = 0; i < 4; i++) {
      current = rateCard(current, Rating.Good, current.due).fields;
      expect(current.stability).toBeGreaterThan(previousStability);
      previousStability = current.stability;
    }
  });

  it("returns log values matching the new state", () => {
    const { fields, log } = rateCard(emptySchedulerFields(NOW), Rating.Hard, NOW);
    expect(log.rating).toBe(Rating.Hard);
    expect(log.stabilityAfter).toBe(fields.stability);
    expect(log.difficultyAfter).toBe(fields.difficulty);
    expect(log.dueAfter.getTime()).toBe(fields.due.getTime());
  });
});

describe("getSRSState", () => {
  const base = emptySchedulerFields(NOW);

  it("maps New to 'new'", () => {
    expect(getSRSState(base, NOW)).toBe("new");
  });

  it("maps Learning/Relearning to 'learning'", () => {
    expect(getSRSState({ ...base, state: State.Learning }, NOW)).toBe("learning");
    expect(getSRSState({ ...base, state: State.Relearning }, NOW)).toBe("learning");
  });

  it("maps overdue Review to 'due'", () => {
    const past = new Date(NOW.getTime() - 1000);
    expect(
      getSRSState({ state: State.Review, due: past, stability: 5 }, NOW),
    ).toBe("due");
  });

  it("maps future Review to 'scheduled' below the mastery threshold", () => {
    const future = new Date(NOW.getTime() + 86_400_000);
    expect(
      getSRSState({ state: State.Review, due: future, stability: 5 }, NOW),
    ).toBe("scheduled");
  });

  it("maps future Review to 'mastered' at the stability threshold", () => {
    const future = new Date(NOW.getTime() + 86_400_000);
    expect(
      getSRSState(
        { state: State.Review, due: future, stability: MASTERED_STABILITY_DAYS },
        NOW,
      ),
    ).toBe("mastered");
  });
});
