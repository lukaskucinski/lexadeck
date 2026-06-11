import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { WordSpinner } from "@/components/ui/WordSpinner";
import { getUser } from "@/lib/auth";
import { SPINNER_WORDS } from "@/lib/spinner";

export const dynamic = "force-dynamic";

// Public landing — signed-out "/" rewrites here (see proxy.ts).
export default async function WelcomePage() {
  if (await getUser()) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 md:px-10">
      <header className="flex items-center justify-between">
        <p className="type-term text-2xl">
          lexadeck<span className="text-coral">.</span>
        </p>
        <ButtonLink href="/login" variant="outline">
          Sign in
        </ButtonLink>
      </header>

      <main className="flex flex-1 flex-col justify-center py-16">
        <p className="label-caps mb-6 text-muted">spaced repetition, typographically</p>
        {/* mobile size fits the widest rotation word ("geography.") on 390px */}
        <h1 className="type-display text-5xl sm:text-7xl md:text-8xl">
          flashcards
          <br />
          for{" "}
          <span className="whitespace-nowrap text-coral">
            <WordSpinner words={SPINNER_WORDS} />.
          </span>
        </h1>

        <div className="mt-14 grid max-w-3xl border-[1.5px] border-line sm:grid-cols-3">
          <div className="border-b border-soft px-5 py-4 sm:border-b-0 sm:border-r">
            <p className="label-caps mb-2 text-muted">Remembers for you</p>
            <p className="text-sm font-medium leading-relaxed">
              FSRS scheduling shows each card exactly when you&apos;re about to
              forget it.
            </p>
          </div>
          <div className="border-b border-soft px-5 py-4 sm:border-b-0 sm:border-r">
            <p className="label-caps mb-2 text-muted">AI-enriched cards</p>
            <p className="text-sm font-medium leading-relaxed">
              Example sentences, translations, and an emoji per card — generated
              on demand.
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="label-caps mb-2 text-muted">Bring your deck</p>
            <p className="text-sm font-medium leading-relaxed">
              Import any CSV or TSV in one step, or build cards by hand.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-5">
          <ButtonLink href="/login" className="h-12 px-7">
            Sign in →
          </ButtonLink>
          <p className="label-caps text-muted">private beta — invite only</p>
        </div>
      </main>

      <footer className="border-t-[1.5px] border-line pt-4">
        <p className="label-caps text-muted">
          lexadeck<span className="text-coral">.</span> — a study tool, not a
          social network
        </p>
      </footer>
    </div>
  );
}
