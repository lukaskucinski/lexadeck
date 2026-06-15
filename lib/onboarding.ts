/**
 * Pure onboarding logic — the access/onboarding gate decision and the form
 * schema that maps a learner's answers onto a Profile. Kept free of DB/Next
 * imports so it's unit-testable; the server pieces live in lib/profile.ts and
 * lib/actions/onboarding.ts.
 */
import { z } from "zod";
import { CEFR_LEVELS } from "./ai/cefr";
import { DEFAULT_SUBJECT, isLanguageSubject, SUBJECT_SLUGS } from "./ai/subjects";

export type GateOutcome = "request-access" | "onboarding" | "ok";

/** Optional age buckets captured at onboarding (drives the PR4 walkthrough later). */
export const AGE_RANGES = [
  { slug: "under-18", label: "Under 18" },
  { slug: "18-24", label: "18–24" },
  { slug: "25-34", label: "25–34" },
  { slug: "35-49", label: "35–49" },
  { slug: "50-64", label: "50–64" },
  { slug: "65-plus", label: "65+" },
] as const;

export const AGE_RANGE_SLUGS: readonly string[] = AGE_RANGES.map((a) => a.slug);

/**
 * Where a signed-in user should go. The allowlist wins over everything (beta
 * gate); an allowlisted user without a completed onboarding goes to /onboarding;
 * otherwise the app renders normally. Pure so the decision table is unit-tested.
 */
export function onboardingGateDecision(input: {
  allowed: boolean;
  onboardingCompletedAt: Date | null | undefined;
}): GateOutcome {
  if (!input.allowed) return "request-access";
  if (!input.onboardingCompletedAt) return "onboarding";
  return "ok";
}

// Empty form values (unselected Select / "not sure") become undefined so the
// optional enums pass instead of failing on "".
const optionalEnum = (values: readonly string[]) =>
  z.preprocess((v) => (v ? v : undefined), z.enum(values as [string, ...string[]]).optional());

/**
 * Onboarding form: a use-case (subject), an optional language + CEFR level (for
 * language learners), an optional age range, and required T&C consent.
 */
export const onboardingSchema = z.object({
  primarySubject: z.enum(SUBJECT_SLUGS as [string, ...string[]]).default(DEFAULT_SUBJECT),
  primaryLanguage: z.string().trim().optional(),
  ageRange: optionalEnum(AGE_RANGE_SLUGS),
  cefrLevel: optionalEnum(CEFR_LEVELS),
  // checkbox: present ("on") only when checked; coerce then require true.
  acceptedTerms: z.preprocess(
    (v) => v === "on" || v === true,
    z.literal(true, { error: "Please accept the terms to continue." }),
  ),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** safeParse a raw record (the action builds it from FormData). */
export function parseOnboarding(raw: Record<string, unknown>) {
  return onboardingSchema.safeParse(raw);
}

/**
 * Map the use-case answers onto Profile fields. Only Languages learners carry a
 * target language (default Spanish); every domain subject stores null, mirroring
 * effectiveDeckLanguage's intent for decks.
 */
export function profileFromOnboarding(input: {
  primarySubject: string;
  primaryLanguage?: string;
  ageRange?: string;
  cefrLevel?: string;
}): {
  primarySubject: string;
  primaryLanguage: string | null;
  ageRange: string | null;
  cefrLevel: string | null;
} {
  const isLang = isLanguageSubject(input.primarySubject);
  return {
    primarySubject: input.primarySubject,
    primaryLanguage: isLang ? (input.primaryLanguage ?? "").trim() || "es" : null,
    ageRange: input.ageRange ?? null,
    // CEFR only applies to language learning; domain decks never carry it.
    cefrLevel: isLang ? (input.cefrLevel ?? null) : null,
  };
}
