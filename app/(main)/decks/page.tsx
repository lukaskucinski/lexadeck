import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeckTile } from "@/components/deck/DeckTile";
import { PageHeader } from "@/components/layout/PageHeader";
import { LAST_DECK_COOKIE, resolveDeckLanding } from "@/lib/decks";
import { getDeckSummaries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const [decks, sp, cookieStore] = await Promise.all([
    getDeckSummaries(),
    searchParams,
    cookies(),
  ]);

  // auto-open the only deck / the last-visited deck; ?all=1 (the "all decks"
  // breadcrumb on deck pages) shows the index instead
  const landing = resolveDeckLanding(
    decks.map((d) => d.id),
    cookieStore.get(LAST_DECK_COOKIE)?.value,
    sp.all === "1",
  );
  if (landing) redirect(`/decks/${landing}`);

  return (
    <div>
      <PageHeader title="decks">
        <ButtonLink href="/decks/import" variant="outline">
          Import
        </ButtonLink>
        <ButtonLink href="/decks/new" variant="outline">
          + New deck
        </ButtonLink>
      </PageHeader>

      {decks.length === 0 ? (
        <EmptyState title="no decks yet">
          Create a deck or import a CSV file to get started.
        </EmptyState>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => (
            <DeckTile key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}
