"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionState } from "./decks";

const credentialsSchema = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

/** Self-serve signup: a real email + a password we hold to a minimum length. */
const signUpSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

/** State for the signup form: an error, or the "check your email" confirmation. */
export type SignUpState = { error?: string; needsConfirmation?: boolean };

/**
 * The origin to bounce OAuth / email-confirmation through. Prefers the request
 * Origin header (set on action POSTs), then the forwarded host (Vercel), so the
 * redirect lands on the same deployment the user is on.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That didn’t match — try again." };

  redirect("/");
}

/**
 * Begin the Google OAuth dance: Supabase returns a provider URL we redirect to;
 * the provider sends the user back to /auth/callback to exchange the code.
 */
export async function signInWithGoogle(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error || !data?.url) return { error: "Could not start Google sign-in. Try again." };
  redirect(data.url);
}

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) return { error: error.message };
  // Confirmations on → no session yet; the user must click the email link.
  if (!data.session) return { needsConfirmation: true };

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
