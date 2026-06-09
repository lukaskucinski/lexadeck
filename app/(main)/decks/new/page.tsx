import { DeckForm } from "@/components/deck/DeckForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createDeck } from "@/lib/actions/decks";

export default function NewDeckPage() {
  return (
    <div>
      <PageHeader index="01·A" title="new deck" />
      <DeckForm action={createDeck} submitLabel="Create deck" />
    </div>
  );
}
