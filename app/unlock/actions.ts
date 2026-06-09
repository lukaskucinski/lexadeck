"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export async function unlock(formData: FormData) {
  const attempt = formData.get("password");
  const password = process.env.SITE_PASSWORD;

  if (!password || typeof attempt !== "string" || attempt !== password) {
    redirect("/unlock?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, await hashPassword(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  redirect("/");
}
