import Link from "next/link";

export const metadata = { title: "Terms — lexadeck" };

// Placeholder copy — final legal text pending. Public (excluded from proxy auth).
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="type-display text-4xl">
        terms<span className="text-coral">.</span>
      </h1>
      <p className="label-caps mt-3 text-muted">placeholder — final copy pending</p>

      <div className="mt-8 space-y-5 text-sm font-medium leading-relaxed text-muted">
        <p>
          <span className="font-bold text-ink">AI-generated content.</span> LexaDeck can
          enrich cards with translations, example sentences, and other material produced
          by AI models. This content may be inaccurate, incomplete, or misleading. Verify
          anything you rely on; it is not professional, medical, legal, or educational
          advice.
        </p>
        <p>
          <span className="font-bold text-ink">Beta.</span> The app is in private beta and
          provided as-is, without warranty. Features and data may change.
        </p>
        <p>
          <span className="font-bold text-ink">Your content.</span> Decks and cards you
          create or import are yours. Don&apos;t upload content you don&apos;t have the
          right to use.
        </p>
      </div>

      <Link
        href="/"
        className="label-caps mt-10 inline-block text-ink underline underline-offset-4"
      >
        ← back
      </Link>
    </div>
  );
}
