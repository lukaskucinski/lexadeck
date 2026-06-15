import { redirect } from "next/navigation";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getUser()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="type-display text-4xl">
          lexadeck<span className="text-coral">.</span>
        </h1>
        <p className="label-caps mt-3 text-muted">Private beta — request access</p>
        <SignupForm />
        <p className="label-caps mt-8 text-muted">
          by continuing you agree to the{" "}
          <Link href="/terms" className="text-ink underline underline-offset-4">
            terms
          </Link>
          , including AI-generated content
        </p>
      </div>
    </div>
  );
}
