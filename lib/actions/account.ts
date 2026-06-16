"use server";

import { redirect } from "next/navigation";
import { confirmationMatches } from "@/lib/account";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export interface DeleteAccountState {
  error?: string;
}

/**
 * Permanently delete the signed-in user's account: all app data (decks → cards →
 * reviews, sessions, profile) in one transaction, then the Supabase auth identity
 * via the service-role admin API, then sign out and return to the public landing.
 * Requires the user to retype their email (server-verified) so it can't fire by
 * accident or CSRF.
 */
export async function deleteAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();

  if (!confirmationMatches(formData.get("confirm") as string | null, user.email)) {
    return { error: "Type your email exactly to confirm." };
  }

  const admin = supabaseAdmin();
  if (!admin) {
    return { error: "Account deletion isn’t configured on this server yet." };
  }

  const userId = user.id;
  // App data first, atomically (leaf → root so FK constraints never block).
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { card: { deck: { userId } } } }),
    prisma.session.deleteMany({ where: { deck: { userId } } }),
    prisma.card.deleteMany({ where: { deck: { userId } } }),
    prisma.deck.deleteMany({ where: { userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
  ]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    // Data is gone but the identity remains; the user can retry (they'll just
    // re-onboard if they sign back in). Surface it rather than silently passing.
    return { error: "Your data was removed, but the account couldn’t be deleted. Try again." };
  }

  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/welcome");
}
