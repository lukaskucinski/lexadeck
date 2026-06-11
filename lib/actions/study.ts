"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateCard, type Grade, type SchedulerFields } from "@/lib/srs";

export async function startSession(deckId: string): Promise<string> {
  const user = await requireUser();
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: user.id },
    select: { id: true },
  });
  if (!deck) throw new Error("Deck not found");
  const session = await prisma.session.create({ data: { deckId } });
  return session.id;
}

export interface ReviewOutcome {
  /** ms until this card is due again; the client re-queues short waits. */
  dueInMs: number;
  state: number;
  /** Updated FSRS state, so re-queued cards preview accurate intervals. */
  fields: SchedulerFields;
}

export async function submitReview(
  sessionId: string | null,
  cardId: string,
  rating: Grade,
): Promise<ReviewOutcome> {
  const user = await requireUser();
  const card = await prisma.card.findFirst({
    where: { id: cardId, deck: { userId: user.id } },
  });
  if (!card) throw new Error("Card not found");

  const now = new Date();
  const { fields, log } = rateCard(card, rating, now);

  await prisma.$transaction([
    prisma.card.update({ where: { id: cardId }, data: { ...fields } }),
    prisma.review.create({
      data: {
        cardId,
        sessionId,
        rating: log.rating,
        state: log.state,
        reviewedAt: now,
        stabilityAfter: log.stabilityAfter,
        difficultyAfter: log.difficultyAfter,
        dueAfter: log.dueAfter,
      },
    }),
  ]);

  return { dueInMs: fields.due.getTime() - now.getTime(), state: fields.state, fields };
}

export async function endSession(sessionId: string, cardCount: number): Promise<void> {
  const user = await requireUser();
  const owned = await prisma.session.findFirst({
    where: { id: sessionId, deck: { userId: user.id } },
    select: { id: true },
  });
  if (!owned) throw new Error("Session not found");
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), cardCount },
  });
  revalidatePath("/");
  revalidatePath("/progress");
  if (session.deckId) revalidatePath(`/decks/${session.deckId}`);
}
