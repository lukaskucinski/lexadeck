import { notFound } from "next/navigation";
import { StudySession } from "@/components/study/StudySession";
import { prisma } from "@/lib/db";
import {
  interleaveQueue,
  MAX_NEW_PER_SESSION,
  MAX_SESSION_SIZE,
  type StudyCard,
} from "@/lib/study";
import type { CardType, Gender, WordType } from "@/lib/types";

export const dynamic = "force-dynamic";

const STUDY_SELECT = {
  id: true,
  term: true,
  translation: true,
  cardType: true,
  wordType: true,
  gender: true,
  emoji: true,
  example: true,
  exampleEn: true,
  notes: true,
  conjugation: true,
  language: true,
  // full FSRS slice — the client previews next intervals per rating
  due: true,
  stability: true,
  difficulty: true,
  elapsedDays: true,
  scheduledDays: true,
  learningSteps: true,
  reps: true,
  lapses: true,
  state: true,
  lastReview: true,
} as const;

interface StudyRow {
  id: string;
  term: string;
  translation: string | null;
  cardType: string;
  wordType: string;
  gender: string | null;
  emoji: string | null;
  example: string | null;
  exampleEn: string | null;
  notes: string | null;
  conjugation: string | null;
  language: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

function toStudyCard(row: StudyRow): StudyCard {
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    cardType: row.cardType as CardType,
    wordType: row.wordType as WordType,
    gender: row.gender as Gender | null,
    emoji: row.emoji,
    example: row.example,
    exampleEn: row.exampleEn,
    notes: row.notes,
    conjugation: row.conjugation,
    language: row.language,
    isNew: row.state === 0,
    srs: {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
      learningSteps: row.learningSteps,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.lastReview,
    },
  };
}

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // "Study more" links back here with a fresh ?s= value; keying the session on
  // it remounts the client component out of its "done" phase (board bug).
  const sessionKey = typeof sp.s === "string" ? sp.s : "initial";
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) notFound();

  const now = new Date();

  // Reviewed cards that are due (learning + review states)
  const dueCards = await prisma.card.findMany({
    where: { deckId: id, due: { lte: now }, state: { not: 0 }, masteredAt: null },
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
          where: { deckId: id, state: 0, masteredAt: null },
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
      key={sessionKey}
      deckId={id}
      deckName={deck.name}
      language={deck.language}
      cards={queue}
      dueCount={due.length}
      newCount={fresh.length}
    />
  );
}
