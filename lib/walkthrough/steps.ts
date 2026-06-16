/**
 * Hand-authored first-run walkthrough content. Pure data + a pure planner keyed
 * by the learner's age range — but the age basis is NEVER surfaced: the variants
 * differ only in tone, depth, and pacing. Copy must not reference age or say the
 * tour is tailored (see steps.test.ts's guard). Imports nothing from the DB/React
 * (the icon is a string key the client maps to a lucide component), so it's pure
 * and unit-testable.
 */

export type TourVariant = "young" | "standard" | "senior";

/** Icon key — mapped to a lucide component in components/walkthrough/FirstRunTour. */
export type TourIcon = "welcome" | "decks" | "study" | "library" | "progress" | "settings";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** A nav href to spotlight while this step shows, or null for no highlight. */
  highlightHref: string | null;
  icon: TourIcon;
  /** Label for the closing step's primary action (only set on the last step). */
  cta?: string;
}

/** The nav destinations a step may spotlight (must match NavRail/BottomNav hrefs). */
export const TOUR_NAV_HREFS = ["/", "/decks", "/library", "/progress", "/settings"] as const;

const CTA = "Take a look around →";

// The standard middle bands get a quick three-step orientation.
const STANDARD_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "welcome to lexadeck",
    body: "A quick look at the essentials before you dive in.",
    highlightHref: null,
    icon: "welcome",
  },
  {
    id: "decks",
    title: "your decks",
    body: "Cards live in decks — create one or import your own to begin.",
    highlightHref: "/decks",
    icon: "decks",
  },
  {
    id: "study",
    title: "daily review",
    body: "Your home screen shows what's due. Start a review and rate each card — we handle the schedule.",
    highlightHref: "/",
    icon: "study",
    cta: CTA,
  },
];

// Terse, energetic full tour.
const YOUNG_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "welcome to lexadeck",
    body: "Smart flashcards that make Spanish stick. Here's the 30-second tour.",
    highlightHref: null,
    icon: "welcome",
  },
  {
    id: "decks",
    title: "your decks",
    body: "Cards live in decks. Make one or import your own to get going.",
    highlightHref: "/decks",
    icon: "decks",
  },
  {
    id: "study",
    title: "daily review",
    body: "Your home screen shows what's due. Hit Start review and rate each card.",
    highlightHref: "/",
    icon: "study",
  },
  {
    id: "library",
    title: "find any card",
    body: "Search and filter every card you have in one place.",
    highlightHref: "/library",
    icon: "library",
  },
  {
    id: "progress",
    title: "track progress",
    body: "Streaks, mastery, and a heat-map of your study days.",
    highlightHref: "/progress",
    icon: "progress",
  },
  {
    id: "settings",
    title: "make it yours",
    body: "Set your level, switch themes, and replay this tour from Settings.",
    highlightHref: "/settings",
    icon: "settings",
    cta: CTA,
  },
];

// Plain, reassuring, unhurried full tour.
const SENIOR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "welcome to lexadeck",
    body: "Let's take a calm look at how everything works. You can stop any time — nothing here is permanent.",
    highlightHref: null,
    icon: "welcome",
  },
  {
    id: "decks",
    title: "your decks",
    body: "Your cards are grouped into decks. You can create a new deck or bring in cards you already have. This is the place to start.",
    highlightHref: "/decks",
    icon: "decks",
  },
  {
    id: "study",
    title: "daily review",
    body: "Each day your home screen shows the cards that are ready. Open a review and, after each card, tell us how well you remembered it. We take care of the schedule for you.",
    highlightHref: "/",
    icon: "study",
  },
  {
    id: "library",
    title: "find any card",
    body: "Every card you own lives in your library. You can search, sort, and tidy them here whenever you wish.",
    highlightHref: "/library",
    icon: "library",
  },
  {
    id: "progress",
    title: "see your progress",
    body: "A simple chart shows your streak, what you've mastered, and the days you've studied. It's a nice way to see how far you've come.",
    highlightHref: "/progress",
    icon: "progress",
  },
  {
    id: "settings",
    title: "settings and help",
    body: "From Settings you can set your level, change the theme, and replay this walkthrough any time you like.",
    highlightHref: "/settings",
    icon: "settings",
    cta: CTA,
  },
];

const STEPS_BY_VARIANT: Record<TourVariant, TourStep[]> = {
  young: YOUNG_STEPS,
  standard: STANDARD_STEPS,
  senior: SENIOR_STEPS,
};

/**
 * Pick the tour variant for an age range. The extremes get the fuller, gentler
 * or snappier tour; the middle bands get the quick one; anything unknown (incl.
 * "prefer not to say") gets standard. The mapping is internal — never shown.
 */
export function tourVariantForAge(ageRange: string | null | undefined): TourVariant {
  switch (ageRange) {
    case "under-18":
      return "young";
    case "50-64":
    case "65-plus":
      return "senior";
    default:
      return "standard";
  }
}

export function getTourSteps(variant: TourVariant): TourStep[] {
  return STEPS_BY_VARIANT[variant];
}

/** The full plan for an age range: which variant, and its steps. */
export function tourPlanForAge(ageRange: string | null | undefined): {
  variant: TourVariant;
  steps: TourStep[];
} {
  const variant = tourVariantForAge(ageRange);
  return { variant, steps: getTourSteps(variant) };
}
