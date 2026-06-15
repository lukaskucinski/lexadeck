/**
 * Pure onboarding logic — the access/onboarding gate decision and the form
 * schema that maps a learner's answers onto a Profile. Kept free of DB/Next
 * imports so it's unit-testable; the server pieces live in lib/profile.ts and
 * lib/actions/onboarding.ts.
 */
import { z } from "zod";
import { DEFAULT_SUBJECT, isLanguageSubject, SUBJECT_SLUGS } from "./ai/subjects";

export type GateOutcome = "request-access" | "onboarding" | "ok";

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

/** Onboarding form (PR1): a use-case (subject), an optional language, T&C consent. */
export const onboardingSchema = z.object({
  primarySubject: z.enum(SUBJECT_SLUGS as [string, ...string[]]).default(DEFAULT_SUBJECT),
  primaryLanguage: z.string().trim().optional(),
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
}): { primarySubject: string; primaryLanguage: string | null } {
  const primaryLanguage = isLanguageSubject(input.primarySubject)
    ? (input.primaryLanguage ?? "").trim() || "es"
    : null;
  return { primarySubject: input.primarySubject, primaryLanguage };
}
