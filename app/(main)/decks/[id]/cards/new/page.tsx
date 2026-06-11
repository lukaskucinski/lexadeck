import { notFound } from "next/navigation";
import { CardForm } from "@/components/card/CardForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createCard } from "@/lib/actions/cards";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WordType } from "@/lib/types";

export default async function NewCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wordType?: string }>;
}) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireUser()]);
  const deck = await prisma.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) notFound();

  const wordType = Object.values(WordType).find((wt) => wt === sp.wordType);
  const action = createCard.bind(null, deck.id);

  return (
    <div>
      <PageHeader title={`new card · ${deck.name.toLowerCase()}`} />
      <CardForm
        action={action}
        initial={{ wordType }}
        submitLabel="Create card"
        allowAddAnother
        cancelHref={`/decks/${deck.id}`}
      />
    </div>
  );
}
