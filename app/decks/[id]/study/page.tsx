import { notFound } from "next/navigation";
import { StudySession } from "@/components/study/StudySession";
import { prisma } from "@/lib/db";
import {
  interleaveQueue,
  MAX_NEW_PER_SESSION,
  MAX_SESSION_SIZE,
  type StudyCard,
} from "@/lib/study";
import type { Gender, WordType } from "@/lib/types";

export const dynamic = "force-dynamic";

const STUDY_SELECT = {
  id: true,
  term: true,
  translation: true,
  wordType: true,
  gender: true,
  emoji: true,
  example: true,
  exampleEn: true,
  notes: true,
  conjugation: true,
  language: true,
  reps: true,
  stability: true,
  state: true,
} as const;

interface StudyRow {
  id: string;
  term: string;
  translation: string | null;
  wordType: string;
  gender: string | null;
  emoji: string | null;
  example: string | null;
  exampleEn: string | null;
  notes: string | null;
  conjugation: string | null;
  language: string;
  reps: number;
  stability: number;
  state: number;
}

function toStudyCard(row: StudyRow): StudyCard {
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    wordType: row.wordType as WordType,
    gender: row.gender as Gender | null,
    emoji: row.emoji,
    example: row.example,
    exampleEn: row.exampleEn,
    notes: row.notes,
    conjugation: row.conjugation,
    language: row.language,
    reps: row.reps,
    stability: row.stability,
    isNew: row.state === 0,
  };
}

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) notFound();

  const now = new Date();

  // Reviewed cards that are due (learning + review states)
  const dueCards = await prisma.card.findMany({
    where: { deckId: id, due: { lte: now }, state: { not: 0 } },
    orderBy: { due: "asc" },
    select: STUDY_SELECT,
    take: MAX_SESSION_SIZE,
  });

  // New cards, oldest first, capped
  const newBudget = Math.min(
    MAX_NEW_PER_SESSION,
    Math.max(0, MAX_SESSION_SIZE - dueCards.length),
  );
  const newCards =
    newBudget > 0
      ? await prisma.card.findMany({
          where: { deckId: id, state: 0 },
          orderBy: { createdAt: "asc" },
          select: STUDY_SELECT,
          take: newBudget,
        })
      : [];

  const due = dueCards
    .slice(0, MAX_SESSION_SIZE - newCards.length)
    .map(toStudyCard);
  const fresh = newCards.map(toStudyCard);
  const queue = interleaveQueue(due, fresh);

  return (
    <StudySession
      deckId={id}
      deckName={deck.name}
      cards={queue}
      dueCount={due.length}
      newCount={fresh.length}
    />
  );
}
