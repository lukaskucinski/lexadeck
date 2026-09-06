"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseOnboarding, profileFromOnboarding } from "@/lib/onboarding";
import { hasPlacementTest } from "@/lib/placement/items";
import { upsertProfile } from "@/lib/profile";
import { createSpanishStarterDeck } from "@/lib/starter/es-starter";

export interface OnboardingState {
  error?: string;
}

/**
 * Persist the learner's use-case + consent and mark onboarding complete, then
 * drop them into the app. Allowlist/onboarded gating is enforced by the layout +
 * onboarding page; a completed Profile for a non-allowlisted user is harmless
 * (requireOnboardedUser still routes them to /request-access).
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = parseOnboarding({
    primarySubject: formData.get("primarySubject") ?? undefined,
    primaryLanguage: formData.get("primaryLanguage") ?? undefined,
    ageRange: formData.get("ageRange") ?? undefined,
    cefrLevel: formData.get("cefrLevel") ?? undefined,
    acceptedTerms: formData.get("acceptedTerms"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { primarySubject, primaryLanguage, ageRange, cefrLevel } = profileFromOnboarding(
    parsed.data,
  );
  const now = new Date();
  await upsertProfile(user.id, {
    primarySubject,
    primaryLanguage,
    ageRange,
    cefrLevel,
    acceptedTermsAt: now,
    onboardingCompletedAt: now,
  });

  // Optional curated starter — only meaningful for a Spanish language learner.
  // primaryLanguage === "es" implies the Languages subject (domain decks store null).
  let starterDeckId: string | null = null;
  if (formData.get("starterDeck") === "on" && primaryLanguage === "es") {
    starterDeckId = await createSpanishStarterDeck(user.id);
  }

  // A language learner who left their level as "I'm not sure" gets a quick
  // placement quiz next (Spanish only for now). Carry the freshly-created starter
  // deck so "Continue" after the quiz still lands on it.
  if (cefrLevel == null && hasPlacementTest(primaryLanguage)) {
    const deckParam = starterDeckId ? `&deck=${starterDeckId}` : "";
    redirect(`/placement?from=onboarding${deckParam}`);
  }

  if (starterDeckId) redirect(`/decks/${starterDeckId}`);
  redirect("/");
}
