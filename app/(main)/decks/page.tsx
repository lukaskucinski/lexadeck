import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeckTile } from "@/components/deck/DeckTile";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDeckSummaries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const decks = await getDeckSummaries();

  return (
    <div>
      <PageHeader index="01" title="decks">
        <ButtonLink href="/decks/new" variant="outline">
          + New deck
        </ButtonLink>
      </PageHeader>

      {decks.length === 0 ? (
        <EmptyState title="no decks yet">
          Create a deck or run the Notion import script to get started.
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
