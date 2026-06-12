/**
 * Curated sample data for the public landing page demo sections
 * (app/welcome/page.tsx). Real components, fake data — the demos always
 * match the live product because they ARE the live components.
 */
import type { DayCount } from "@/components/ui/Heatmap";
import type { StudyCard } from "./study";

/** The flippable demo card in the "study" section. */
export const DEMO_CARD: StudyCard = {
  id: "landing-demo",
  term: "la madrugada",
  translation: "the early hours of the morning",
  cardType: "VOCAB",
  wordType: "NOUN",
  gender: "FEMININE",
  emoji: "🌅",
  example: "Volvimos a casa de madrugada, justo antes del amanecer.",
  exampleEn: "We got home in the early hours, just before dawn.",
  notes: null,
  conjugation: null,
  language: "es",
  isNew: false,
  srs: {
    due: new Date("2026-01-01T00:00:00Z"),
    stability: 14.2,
    difficulty: 5.1,
    elapsedDays: 9,
    scheduledDays: 14,
    learningSteps: 0,
    reps: 11,
    lapses: 1,
    state: 2,
    lastReview: new Date("2026-01-01T00:00:00Z"),
  },
};

/** Before/after pair for the "enrich" section. */
export const DEMO_ENRICH = {
  term: "la sobremesa",
  wordType: "NOUN" as const,
  gender: "f",
  enriched: {
    translation: "lingering at the table after a meal",
    example: "La sobremesa duró más que la propia cena.",
    exampleEn: "The after-dinner conversation lasted longer than dinner itself.",
    emoji: "🍽️",
  },
};

/** Headline numbers for the "track" section. */
export const DEMO_STATS = {
  reviews: 2418,
  mastered: 184,
  distribution: [
    { state: "new" as const, count: 96 },
    { state: "learning" as const, count: 41 },
    { state: "scheduled" as const, count: 612 },
    { state: "mastered" as const, count: 184 },
  ],
};

/** Trailing days of demoActivity guaranteed non-zero (the streak). */
export const DEMO_STREAK_DAYS = 21;

function localDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * A believable review history for the demo heatmap, ending today: light
 * early weeks, an unbroken closing streak, occasional rest days in between.
 * Deterministic per calendar day (hash of the date string) — no flicker
 * between server render and revisits.
 */
export function demoActivity(days = 95): DayCount[] {
  const out: DayCount[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const day = localDayString(date);

    let hash = 0;
    for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) % 997;

    const inStreak = i < DEMO_STREAK_DAYS;
    const restDay = !inStreak && hash % 5 === 0;
    // ramp up toward the present so the story reads "building a habit"
    const ramp = 1 - i / days;
    const count = restDay ? 0 : 1 + Math.floor((hash % 40) * (0.35 + ramp));

    out.push({ day, count });
  }
  return out;
}
