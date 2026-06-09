"use server";

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

  return prisma.card.findMany({
    where: {
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
