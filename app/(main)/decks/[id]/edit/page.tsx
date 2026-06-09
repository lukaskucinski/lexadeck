import { notFound } from "next/navigation";
import { DeckForm } from "@/components/deck/DeckForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteDeck, updateDeck } from "@/lib/actions/decks";
import { prisma } from "@/lib/db";

export default async function EditDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({
    where: { id },
    include: { _count: { select: { cards: true } } },
  });
  if (!deck) notFound();

  const updateAction = updateDeck.bind(null, deck.id);
  const deleteAction = deleteDeck.bind(null, deck.id);

  return (
    <div>
      <PageHeader index="01·B" title={`edit ${deck.name.toLowerCase()}`} />
      <DeckForm action={updateAction} initial={deck} submitLabel="Save changes" />

      <div className="mt-12 max-w-xl border-t-[1.5px] border-line pt-6">
        <p className="label-caps mb-3 text-muted">Danger zone</p>
        <ConfirmButton
          onConfirm={deleteAction}
          label={`Delete deck (${deck._count.cards} cards)`}
          confirmLabel="This deletes every card — confirm"
        />
      </div>
    </div>
  );
}
