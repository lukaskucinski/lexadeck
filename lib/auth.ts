import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Current Supabase Auth user, deduped per request render with React cache
 * (layout + page + actions share one auth round-trip).
 */
export const getUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "you";
  return { id: user.id, email: user.email ?? "", displayName };
});

/** Pages and server actions call this first; unauthenticated → /login. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
