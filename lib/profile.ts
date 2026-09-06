/**
 * Per-user Profile + beta allowlist data access, and the app access gates.
 * Server-only (touches Prisma + redirects). The pure gate decision lives in
 * lib/onboarding.ts so it stays unit-tested.
 */
import { redirect } from "next/navigation";
import { cache } from "react";
import { type AppUser, requireUser } from "./auth";
import { prisma } from "./db";
import { onboardingGateDecision } from "./onboarding";

/** Current user's Profile row (or null), deduped per request render. */
export const getProfile = cache(async (userId: string) => {
  return prisma.profile.findUnique({ where: { userId } });
});

/** True when the email is on the beta allowlist (stored lower-cased). */
export async function isAllowedEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  const row = await prisma.allowedEmail.findUnique({ where: { email: e } });
  return row != null;
}

type ProfileWrite = {
  primarySubject?: string;
  primaryLanguage?: string | null;
  ageRange?: string | null;
  cefrLevel?: string | null;
  acceptedTermsAt?: Date | null;
  onboardingCompletedAt?: Date | null;
  walkthroughSeenAt?: Date | null;
};

/** Create-or-update the signed-in user's Profile. */
export async function upsertProfile(userId: string, data: ProfileWrite) {
  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

type Profile = Awaited<ReturnType<typeof getProfile>>;

/**
 * Signed-in + allowlisted. Redirects a non-allowlisted user to /request-access.
 * Used by the onboarding route (which must stay reachable before onboarding is
 * complete) and composed into requireOnboardedUser.
 */
export async function requireAllowedUser(): Promise<{ user: AppUser; profile: Profile }> {
  const user = await requireUser();
  const [allowed, profile] = await Promise.all([isAllowedEmail(user.email), getProfile(user.id)]);
  if (!allowed) redirect("/request-access");
  return { user, profile };
}

/**
 * Full app gate: signed-in + allowlisted + onboarded. Drives the authenticated
 * layout. The decision (request-access / onboarding / ok) is the tested pure
 * onboardingGateDecision.
 */
export async function requireOnboardedUser(): Promise<{ user: AppUser; profile: Profile }> {
  const user = await requireUser();
  const [allowed, profile] = await Promise.all([isAllowedEmail(user.email), getProfile(user.id)]);
  switch (
    onboardingGateDecision({ allowed, onboardingCompletedAt: profile?.onboardingCompletedAt })
  ) {
    case "request-access":
      redirect("/request-access");
    case "onboarding":
      redirect("/onboarding");
  }
  return { user, profile };
}
