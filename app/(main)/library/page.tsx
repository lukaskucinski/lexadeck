import { toCardRow } from "@/components/card/cardRow";
import { LibraryCardView } from "@/components/card/LibraryCardView";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Keep only the string search params for the client view's initial state. */
function queryString(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
  }
  return params.toString();
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = new Date();

  // Load ALL of the user's cards once; filter/sort/search/pagination happen
  // client-side (instant) in LibraryCardView.
  const [cards, decks] = await Promise.all([
    prisma.card.findMany({
      where: { deck: { userId: user.id } },
      include: { deck: { select: { name: true } } },
    }),
    prisma.deck.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = cards.map((c) => toCardRow(c, now, c.deck.name));

  return <LibraryCardView cards={rows} decks={decks} initialQuery={queryString(sp)} />;
}
