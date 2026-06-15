import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { DEFAULT_SUBJECT } from "@/lib/ai/subjects";
import { requireAllowedUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

// First-run tailoring. Reachable only by a signed-in, allowlisted user; an
// already-onboarded user is bounced into the app. (Lives outside the (main)
// route group so its gate doesn't redirect here in a loop.)
export default async function OnboardingPage() {
  const { user, profile } = await requireAllowedUser();
  if (profile?.onboardingCompletedAt) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <p className="label-caps text-muted">welcome, {user.displayName.toLowerCase()}</p>
      <h1 className="type-display mt-3 text-4xl sm:text-5xl">
        let&apos;s set up<span className="text-coral">.</span>
      </h1>
      <p className="mt-4 max-w-[46ch] text-sm font-medium leading-relaxed text-muted">
        A couple of quick questions so your decks and AI enrichment fit what you&apos;re
        studying. You can change all of this later.
      </p>

      <OnboardingForm
        initialSubject={profile?.primarySubject ?? DEFAULT_SUBJECT}
        initialLanguage={profile?.primaryLanguage ?? "es"}
      />
    </div>
  );
}
