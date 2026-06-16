"use client";

import { useMemo } from "react";
import { CardListTable } from "@/components/card/CardListTable";
import { CardViewProvider, useViewParams } from "@/components/card/CardViewProvider";
import type { CardRow } from "@/components/card/cardRow";
import { FilterPanel } from "@/components/card/FilterPanel";
import { Pagination } from "@/components/card/Pagination";
import { SearchBar } from "@/components/card/SearchBar";
import { SortControl } from "@/components/card/SortControl";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { compareCardRows, matchesCardRow, paginateRows } from "@/lib/cardView";

const PAGE_SIZE = 100;

function LibraryCardViewInner({
  cards,
  decks,
}: {
  cards: CardRow[];
  decks: { id: string; name: string }[];
}) {
  const { vp } = useViewParams();

  const matched = useMemo(
    () => cards.filter((row) => matchesCardRow(row, vp.filters)).sort(compareCardRows(vp.sort, vp.dir)),
    [cards, vp.filters, vp.sort, vp.dir],
  );
  const visible = paginateRows(matched, vp.page, PAGE_SIZE);

  return (
    <div>
      <PageHeader title="library">
        <SearchBar />
        <SortControl />
        <FilterPanel decks={decks} />
      </PageHeader>

      <p className="label-caps mb-4 text-muted">
        <b className="tnum text-ink">{matched.length.toLocaleString()}</b> cards
      </p>

      {matched.length === 0 ? (
        <EmptyState title="nothing found">Try a different search or clear filters.</EmptyState>
      ) : (
        <>
          <CardListTable cards={visible} sort={vp.sort} dir={vp.dir} showDeck />
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={matched.length} />
        </>
      )}
    </div>
  );
}

/** Client workspace for the cross-deck library — instant filter/sort/search/paginate. */
export function LibraryCardView({
  cards,
  decks,
  initialQuery,
}: {
  cards: CardRow[];
  decks: { id: string; name: string }[];
  initialQuery: string;
}) {
  return (
    <CardViewProvider initialQuery={initialQuery}>
      <LibraryCardViewInner cards={cards} decks={decks} />
    </CardViewProvider>
  );
}
