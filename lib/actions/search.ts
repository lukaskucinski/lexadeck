"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface SearchHit {
  id: string;
  deckId: string;
  term: string;
  translation: string | null;
  emoji: string | null;
}

export async function searchCards(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const user = await requireUser();
  return prisma.card.findMany({
    where: {
      deck: { userId: user.id },
      OR: [
        { term: { contains: q, mode: "insensitive" } },
        { translation: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, deckId: true, term: true, translation: true, emoji: true },
    orderBy: { term: "asc" },
    take: 8,
  });
}
