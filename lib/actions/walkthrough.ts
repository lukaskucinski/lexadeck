"use server";

import { requireUser } from "@/lib/auth";
import { upsertProfile } from "@/lib/profile";

/**
 * Record that the user has seen (or skipped) the first-run walkthrough, so it
 * won't auto-open again. Writes ONLY walkthroughSeenAt; idempotent (replaying
 * from Settings re-stamps it harmlessly).
 */
export async function dismissWalkthrough(): Promise<void> {
  const user = await requireUser();
  await upsertProfile(user.id, { walkthroughSeenAt: new Date() });
}
