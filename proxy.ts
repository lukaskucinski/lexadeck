import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next(); // auth not configured (CI builds)

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() verifies the session JWT LOCALLY when the project uses
  // asymmetric signing keys — no Supabase round-trip per request, unlike
  // getUser() — while still refreshing an expired session via the cookie
  // setAll above (do not remove). Pages/actions still call getUser()
  // (lib/auth.ts) so protected data is never trusted on the JWT alone.
  const { data } = await supabase.auth.getClaims();

  if (!data) {
    const { pathname } = request.nextUrl;
    // first contact: the root URL shows the public landing page, not a login wall
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/welcome", request.url));
    }
    if (pathname === "/welcome") return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except the login page, Next internals, static assets, the
    // social-share images (link-preview scrapers are always signed out), the
    // service worker, and the apple-touch-icon — the SW must register and iOS
    // must fetch the icon even when signed out, so these can't 302 to /login.
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|opengraph-image|twitter-image|apple-icon|sw.js|lexadeck-import-template.csv).*)",
  ],
};
