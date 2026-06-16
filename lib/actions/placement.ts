"use server";

import { isCefrLevel } from "@/lib/ai/cefr";
import { requireUser } from "@/lib/auth";
import { getPlacementItems } from "@/lib/placement/items";
import { parsePlacementResponses, scorePlacement } from "@/lib/placement/scoring";
import { getProfile, upsertProfile } from "@/lib/profile";

export interface PlacementState {
  /** The scored CEFR band, set on success so the UI can show a result. */
  level?: string;
  error?: string;
}

/**
 * Score a submitted placement quiz and persist the band to Profile.cefrLevel.
 * The item bank (and its answer key) is resolved from the user's own profile
 * language — never from the posted form — so a tampered submission can't be
 * scored against a different key. Writes ONLY cefrLevel; onboarding state is
 * untouched, so this is safe to re-take from Settings.
 */
export async function submitPlacement(
  _prev: PlacementState,
  formData: FormData,
): Promise<PlacementState> {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const language = profile?.primaryLanguage ?? null;
  const items = language ? getPlacementItems(language) : null;
  if (!items) return { error: "No placement test is available for your language yet." };

  const responses = parsePlacementResponses(
    (k) => formData.get(k) as string | null,
    items,
  );
  const level = scorePlacement(items, responses);
  if (!isCefrLevel(level)) return { error: "Could not score the test — please try again." };

  await upsertProfile(user.id, { cefrLevel: level });
  return { level };
}
