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

  // also refreshes an expired session — do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    // Everything except the login page, Next internals, static assets, and
    // the social-share images (link-preview scrapers are always signed out)
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|opengraph-image|twitter-image|lexadeck-import-template.csv).*)",
  ],
};
