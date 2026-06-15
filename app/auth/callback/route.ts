import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * OAuth + email-confirmation landing. Supabase redirects here with a `code`
 * which we exchange for a session (cookies are writable in a Route Handler,
 * unlike an RSC render). On success we send the user to `next` (default "/"),
 * where the onboarding gate (app/(main)/layout.tsx) takes over — routing them
 * to /onboarding or /request-access as appropriate.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind Vercel's proxy the request origin is internal; prefer the
      // forwarded host so the browser lands back on the right deployment.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
