import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // gate disabled (local dev)

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await hashPassword(password))) {
    return NextResponse.next();
  }

  const unlockUrl = new URL("/unlock", request.url);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: [
    // Everything except the unlock page, Next internals, and static assets
    "/((?!unlock|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
