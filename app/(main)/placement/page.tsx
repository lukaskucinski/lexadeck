import { ButtonLink } from "@/components/ui/Button";
import { PlacementTest } from "@/components/placement/PlacementTest";
import { getPlacementItems } from "@/lib/placement/items";
import { requireOnboardedUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * CEFR placement quiz. Reached after onboarding (a language learner who picked
 * "I'm not sure") or any time from Settings to re-calibrate. Lives inside (main)
 * because the learner is already onboarded by the time they arrive. Result is
 * written to Profile.cefrLevel by the submitPlacement action.
 */
export default async function PlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; deck?: string }>;
}) {
  const { profile } = await requireOnboardedUser();
  const sp = await searchParams;
  const fromSettings = sp.from === "settings";

  const language = profile?.primaryLanguage ?? null;
  const items = language ? getPlacementItems(language) : null;

  const skipHref = fromSettings ? "/settings" : "/";
  const continueHref = sp.deck ? `/decks/${sp.deck}` : fromSettings ? "/settings" : "/";

  return (
    <div className="mx-auto max-w-xl px-1 py-2">
      <p className="label-caps text-muted">2-minute level check</p>
      <h1 className="type-display mt-3 text-4xl sm:text-5xl">
        where are you<span className="text-coral">?</span>
      </h1>

      {items ? (
        <>
          <p className="mt-4 max-w-[48ch] text-sm font-medium leading-relaxed text-muted">
            A few quick questions to place you on the CEFR scale (A1–C2). It only tunes how
            AI enrichment writes for you — there are no stakes, so just answer what you can.
          </p>
          <PlacementTest items={items} skipHref={skipHref} continueHref={continueHref} />
        </>
      ) : (
        <>
          <p className="mt-4 max-w-[48ch] text-sm font-medium leading-relaxed text-muted">
            A placement test isn&apos;t available for your language yet. You can set your level
            by hand in Settings whenever you like.
          </p>
          <div className="mt-6">
            <ButtonLink href={fromSettings ? "/settings" : "/"} variant="outline">
              ← Back
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
