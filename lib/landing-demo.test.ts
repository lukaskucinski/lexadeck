import { describe, expect, it } from "vitest";
import { demoActivity, DEMO_CARD, DEMO_STREAK_DAYS } from "./landing-demo";

describe("demoActivity", () => {
  it("returns one entry per requested day, oldest first", () => {
    const days = demoActivity(95);
    expect(days).toHaveLength(95);
    expect(days[0].day < days[94].day).toBe(true);
    for (const d of days) expect(d.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is deterministic — same input, same output", () => {
    expect(demoActivity(40)).toEqual(demoActivity(40));
  });

  it("ends with an unbroken streak so the demo always looks alive", () => {
    const days = demoActivity(95);
    const streak = days.slice(-DEMO_STREAK_DAYS);
    for (const d of streak) expect(d.count).toBeGreaterThan(0);
  });

  it("has rest days further back — a believable history, not a solid block", () => {
    const days = demoActivity(95);
    expect(days.some((d) => d.count === 0)).toBe(true);
  });
});

describe("DEMO_CARD", () => {
  it("is a complete, enriched study card", () => {
    expect(DEMO_CARD.term).toBeTruthy();
    expect(DEMO_CARD.translation).toBeTruthy();
    expect(DEMO_CARD.example).toBeTruthy();
    expect(DEMO_CARD.exampleEn).toBeTruthy();
    expect(DEMO_CARD.emoji).toBeTruthy();
  });
});
