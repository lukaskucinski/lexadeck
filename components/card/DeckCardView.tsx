"use client";

import { useMemo } from "react";
import { CardListTable } from "@/components/card/CardListTable";
import { CardViewProvider, useViewParams } from "@/components/card/CardViewProvider";
import type { CardRow } from "@/components/card/cardRow";
import { FilterPanel } from "@/components/card/FilterPanel";
import { FlashCardPreview } from "@/components/card/FlashCardPreview";
import { Pagination } from "@/components/card/Pagination";
import { SearchBar } from "@/components/card/SearchBar";
import { SortControl } from "@/components/card/SortControl";
import { KanbanBoard } from "@/components/deck/KanbanBoard";
import { SelectHint } from "@/components/deck/SelectHint";
import { ViewToggle } from "@/components/deck/ViewToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { compareCardRows, matchesCardRow, paginateRows } from "@/lib/cardView";

const PAGE_SIZE = 60;

function DeckCardViewInner({ cards, deckId }: { cards: CardRow[]; deckId: string }) {
  const { vp } = useViewParams();

  // filter + sort the already-loaded cards — instant, no server round-trip
  const matched = useMemo(
    () => cards.filter((row) => matchesCardRow(row, vp.filters)).sort(compareCardRows(vp.sort, vp.dir)),
    [cards, vp.filters, vp.sort, vp.dir],
  );

  let content: React.ReactNode;
  if (matched.length === 0) {
    content = <EmptyState title="no cards match">Adjust filters or add a card.</EmptyState>;
  } else if (vp.view === "kanban") {
    content = <KanbanBoard cards={matched} deckId={deckId} />;
  } else {
    const visible = paginateRows(matched, vp.page, PAGE_SIZE);
    content =
      vp.view === "list" ? (
        <>
          <CardListTable cards={visible} sort={vp.sort} dir={vp.dir} selectionKey={deckId} />
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={matched.length} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((card) => (
              <FlashCardPreview key={card.id} card={card} selectionKey={deckId} />
            ))}
          </div>
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={matched.length} />
        </>
      );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ViewToggle active={vp.view} />
          <SelectHint />
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
          <SortControl />
          <FilterPanel />
        </div>
      </div>
      {content}
    </>
  );
}

/**
 * Client workspace for a deck's cards. The server hands it ALL the deck's cards
 * once; every view/sort/filter/search/pagination interaction is then computed
 * client-side and instant. `initialQuery` seeds the params so SSR matches the URL.
 */
export function DeckCardView({
  cards,
  deckId,
  initialQuery,
}: {
  cards: CardRow[];
  deckId: string;
  initialQuery: string;
}) {
  return (
    <CardViewProvider initialQuery={initialQuery}>
      <DeckCardViewInner cards={cards} deckId={deckId} />
    </CardViewProvider>
  );
}
