import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { getUser } from "@/lib/auth";
import { isAllowedEmail } from "@/lib/profile";

export const dynamic = "force-dynamic";

// Signed-in but not on the beta allowlist. The (main) layout sends them here;
// an allowlisted user who lands here is bounced into the app.
export default async function RequestAccessPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (await isAllowedEmail(user.email)) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="type-display text-4xl">
          lexadeck<span className="text-coral">.</span>
        </h1>
        <p className="label-caps mt-3 text-muted">Private beta</p>
        <p className="mt-8 text-sm font-medium leading-relaxed text-muted">
          You&apos;re signed in as{" "}
          <span className="font-bold text-ink">{user.email}</span>, but this email
          isn&apos;t on the beta list yet. Once you&apos;re added, sign in again and
          you&apos;ll go straight to setup.
        </p>
        <form action={signOut} className="mt-10">
          <button
            type="submit"
            className="h-12 w-full border-[1.5px] border-line text-sm font-extrabold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-ink hover:text-bg"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
