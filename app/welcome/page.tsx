import { redirect } from "next/navigation";
import { DemoFlashCard } from "@/components/landing/DemoFlashCard";
import { EnrichDemo } from "@/components/landing/EnrichDemo";
import { Reveal } from "@/components/landing/Reveal";
import { TrackDemo } from "@/components/landing/TrackDemo";
import { ButtonLink } from "@/components/ui/Button";
import { WordSpinner } from "@/components/ui/WordSpinner";
import { getUser } from "@/lib/auth";
import { DEMO_CARD } from "@/lib/landing-demo";
import { SPINNER_WORDS } from "@/lib/spinner";

export const dynamic = "force-dynamic";

function SectionHeader({
  index,
  label,
  title,
  children,
}: {
  index: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="label-caps mb-3 text-muted">
        <span className="text-coral">{index}</span> — {label}
      </p>
      <h2 className="type-display text-4xl sm:text-5xl">{title}</h2>
      <p className="mt-4 max-w-[52ch] font-medium leading-relaxed text-muted">{children}</p>
    </div>
  );
}

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

      <main className="flex-1">
        {/* ---------- hero: fills the first viewport, as before ---------- */}
        <section className="flex min-h-[calc(100vh-8.5rem)] flex-col justify-center py-16">
          <p className="label-caps mb-6 text-muted">spaced repetition, typographically</p>
          {/* mobile size fits the widest rotation word ("geography.") on 390px */}
          <h1 className="type-display text-5xl sm:text-7xl md:text-8xl">
            flashcards
            <br />
            for{" "}
            <span className="whitespace-nowrap text-coral">
              <WordSpinner words={SPINNER_WORDS} settleOn="anything" />
              {/* breathing room — the g's ink and the period abut at this tracking */}
              <span className="ml-[0.04em]">.</span>
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

          <p className="label-caps mt-16 text-muted">↓ see it in action</p>
        </section>

        {/* ---------- 01 · study ---------- */}
        <section className="border-t-[1.5px] border-line py-20">
          <SectionHeader index="01" label="study" title="a card, mid-session.">
            Front: the term. Back: everything you need to anchor it. FSRS watches
            how you rate each review and schedules the next one for the moment
            you&apos;d otherwise forget.
          </SectionHeader>
          <Reveal className="max-w-xl">
            <DemoFlashCard card={DEMO_CARD} />
          </Reveal>
        </section>

        {/* ---------- 02 · enrich ---------- */}
        <section className="border-t-[1.5px] border-line py-20">
          <SectionHeader index="02" label="enrich" title="one click, full card.">
            Type a bare term and let the AI fill in the rest — a translation, a
            natural example sentence with its English gloss, and an emoji to hang
            the memory on.
          </SectionHeader>
          <Reveal>
            <EnrichDemo />
          </Reveal>
        </section>

        {/* ---------- 03 · track ---------- */}
        <section className="border-t-[1.5px] border-line py-20">
          <SectionHeader index="03" label="track" title="watch it stick.">
            Every review feeds the record: a daily activity grid, your current
            streak, and how the deck splits between new, learning, scheduled, and
            mastered.
          </SectionHeader>
          <Reveal>
            <TrackDemo />
          </Reveal>
        </section>

        {/* ---------- closing CTA ---------- */}
        <section className="border-t-[1.5px] border-line py-20">
          <Reveal>
            <h2 className="type-display text-4xl sm:text-6xl">
              start remembering<span className="text-coral">.</span>
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <ButtonLink href="/login" className="h-12 px-7">
                Sign in →
              </ButtonLink>
              <p className="label-caps text-muted">private beta — invite only</p>
            </div>
          </Reveal>
        </section>
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
