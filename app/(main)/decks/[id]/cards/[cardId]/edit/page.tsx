import { notFound } from "next/navigation";
import { CardForm } from "@/components/card/CardForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteCard, updateCard } from "@/lib/actions/cards";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
  });
  if (!card || card.deckId !== id) notFound();

  const updateAction = updateCard.bind(null, cardId);
  const deleteAction = deleteCard.bind(null, cardId);

  return (
    <div>
      <PageHeader title={`edit ${card.term.toLowerCase()}`} />
      <CardForm
        action={updateAction}
        initial={card}
        submitLabel="Save changes"
        cancelHref={`/decks/${id}/cards/${cardId}`}
        language={card.language}
      />

      <div className="mt-12 max-w-2xl border-t-[1.5px] border-line pt-6">
        <p className="label-caps mb-3 text-muted">Danger zone</p>
        <ConfirmButton onConfirm={deleteAction} label="Delete card" />
      </div>
    </div>
  );
}
