import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Upload } from "lucide-react";
import { toCardRow } from "@/components/card/cardRow";
import { CardListTable } from "@/components/card/CardListTable";
import { FilterPanel } from "@/components/card/FilterPanel";
import { FlashCardPreview } from "@/components/card/FlashCardPreview";
import { Pagination } from "@/components/card/Pagination";
import { SearchBar } from "@/components/card/SearchBar";
import { DeckSelectionBar } from "@/components/deck/DeckSelectionBar";
import { EnrichPanel } from "@/components/deck/EnrichPanel";
import { KanbanBoard } from "@/components/deck/KanbanBoard";
import { LastDeckCookie } from "@/components/deck/LastDeckCookie";
import { SelectHint } from "@/components/deck/SelectHint";
import { ViewToggle } from "@/components/deck/ViewToggle";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  buildCardWhere,
  cardOrderBy,
  getStudySessionCounts,
  parseCardViewParams,
} from "@/lib/queries";
import { parseStudyExclude, STUDY_EXCLUDE_COOKIE } from "@/lib/study";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

const CARD_SELECT = {
  id: true,
  deckId: true,
  term: true,
  translation: true,
  wordType: true,
  gender: true,
  cardType: true,
  emoji: true,
  due: true,
  state: true,
  stability: true,
  masteredAt: true,
} as const;

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const vp = parseCardViewParams(sp);
  const now = new Date();

  const user = await requireUser();
  const deck = await prisma.deck.findFirst({ where: { id, userId: user.id } });
  if (!deck) notFound();

  const studyExclude = parseStudyExclude((await cookies()).get(STUDY_EXCLUDE_COOKIE)?.value);
  const where = { deckId: id, ...buildCardWhere(vp.filters, now) };
  const [total, ready, session] = await Promise.all([
    prisma.card.count({ where: { deckId: id } }),
    prisma.card.count({ where: { deckId: id, due: { lte: now }, masteredAt: null } }),
    getStudySessionCounts(id, now, studyExclude),
  ]);

  let content: React.ReactNode;

  if (vp.view === "kanban") {
    const cards = await prisma.card.findMany({
      where,
      orderBy: [{ due: "asc" }, { term: "asc" }],
      select: CARD_SELECT,
    });
    const rows = cards.map((c) => toCardRow(c, now));
    content =
      rows.length === 0 ? (
        <EmptyState title="no cards match">Adjust filters or add a card.</EmptyState>
      ) : (
        <KanbanBoard cards={rows} deckId={id} />
      );
  } else {
    const [cards, filteredTotal] = await Promise.all([
      prisma.card.findMany({
        where,
        orderBy: cardOrderBy(vp.sort, vp.dir),
        select: CARD_SELECT,
        skip: (vp.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.card.count({ where }),
    ]);
    const rows = cards.map((c) => toCardRow(c, now));

    if (rows.length === 0) {
      content = <EmptyState title="no cards match">Adjust filters or add a card.</EmptyState>;
    } else if (vp.view === "list") {
      content = (
        <>
          <CardListTable cards={rows} sort={vp.sort} dir={vp.dir} selectionKey={id} />
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={filteredTotal} />
        </>
      );
    } else {
      content = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((card) => (
              <FlashCardPreview key={card.id} card={card} selectionKey={id} />
            ))}
          </div>
          <Pagination page={vp.page} pageSize={PAGE_SIZE} total={filteredTotal} />
        </>
      );
    }
  }

  return (
    <div>
      <LastDeckCookie deckId={id} />
      <DeckSelectionBar deckId={id} enrichEnabled={deck.language === "es"} />
      {/* /decks auto-opens this deck again — ?all=1 suppresses the redirect */}
      <nav className="label-caps mb-4">
        <Link href="/decks?all=1" className="text-muted hover:text-ink">
          ← all decks
        </Link>
      </nav>
      <header className="mb-6 border-b-[3px] border-line pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps mb-1.5 flex items-center gap-3 text-muted">
              <span style={{ color: `var(--c-${deck.accentColor ?? "coral"})` }}>
                {deck.language}
              </span>
              <span className="tnum">{total.toLocaleString()} cards</span>
              <span className="tnum text-coral">{ready.toLocaleString()} ready</span>
              <Link href={`/decks/${id}/edit`} className="hover:text-ink" title="Edit deck">
                <Pencil size={13} />
              </Link>
              <Link
                href={`/decks/import?deck=${id}`}
                className="hover:text-ink"
                title="Import cards from CSV"
              >
                <Upload size={13} />
              </Link>
            </div>
            <h1 className="type-display text-4xl md:text-5xl">{deck.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {deck.language === "es" && <EnrichPanel deckId={id} />}
            <ButtonLink href={`/decks/${id}/cards/new`} variant="outline">
              + Card
            </ButtonLink>
            <ButtonLink href={`/decks/${id}/study`} variant="primary">
              Study {session.total > 0 ? `(${session.total})` : ""} →
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ViewToggle active={vp.view} />
          <SelectHint />
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
          <FilterPanel />
        </div>
      </div>

      {content}
    </div>
  );
}
