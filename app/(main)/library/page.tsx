import { toCardRow } from "@/components/card/cardRow";
import { CardListTable } from "@/components/card/CardListTable";
import { FilterPanel } from "@/components/card/FilterPanel";
import { Pagination } from "@/components/card/Pagination";
import { SearchBar } from "@/components/card/SearchBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { buildCardWhere, cardOrderBy, parseCardViewParams } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const vp = parseCardViewParams(sp);
  const now = new Date();
  const where = buildCardWhere(vp.filters, now);

  const [cards, total, decks] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: cardOrderBy(vp.sort, vp.dir),
      include: { deck: { select: { name: true } } },
      skip: (vp.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.card.count({ where }),
    prisma.deck.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = cards.map((c) => toCardRow(c, now, c.deck.name));

  return (
    <div>
      <PageHeader index="03" title="library">
        <SearchBar />
        <FilterPanel decks={decks} />
      </PageHeader>

      <p className="label-caps mb-4 text-muted">
        <b className="tnum text-ink">{total.toLocaleString()}</b> cards
      </p>

      {rows.length === 0 ? (
        <EmptyState title="nothing found">Try a different search or clear filters.</EmptyState>
      ) : (
        <>
          <CardListTable cards={rows} sort={vp.sort} dir={vp.dir} showDeck />
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={total} />
        </>
      )}
    </div>
  );
}
