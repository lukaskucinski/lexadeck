import { notFound } from "next/navigation";
import { CardForm } from "@/components/card/CardForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createCard, previewConjugation, previewEnrichment } from "@/lib/actions/cards";
import { isEnrichable } from "@/lib/ai/languages";
import { requireUser } from "@/lib/auth";
import { getConjugationSpec } from "@/lib/conjugation";
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
  // Auto-fill is available for any tuned language (es/ja/de)
  const enrich = isEnrichable(deck.language) ? previewEnrichment.bind(null, deck.id) : undefined;
  // "Generate all tenses" — only for languages with a structured conjugation table
  const conjugate = getConjugationSpec(deck.language)
    ? previewConjugation.bind(null, deck.id)
    : undefined;

  return (
    <div>
      <PageHeader title={`new card · ${deck.name.toLowerCase()}`} />
      <CardForm
        action={action}
        initial={{ wordType }}
        submitLabel="Create card"
        allowAddAnother
        cancelHref={`/decks/${deck.id}`}
        enrich={enrich}
        conjugate={conjugate}
        language={deck.language}
      />
    </div>
  );
}
