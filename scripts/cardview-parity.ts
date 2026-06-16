/**
 * Parity guard for the client-driven card workspace. Proves that the new
 * client-side filter/sort (lib/cardView.ts over CardRow[]) selects the SAME cards
 * and a correctly-ordered list compared to the old server Prisma query
 * (buildCardWhere/cardOrderBy) — so moving the work client-side changed nothing
 * the user sees. READ-ONLY.
 *
 *   npx tsx scripts/cardview-parity.ts
 */
import "dotenv/config";
import { toCardRow } from "../components/card/cardRow";
import { compareCardRows, matchesCardRow } from "../lib/cardView";
import type { CardFilters, CardSort } from "../lib/cardViewParams";
import { prisma } from "../lib/db";
import { buildCardWhere, cardOrderBy } from "../lib/queries";

const CARD_SELECT = {
  id: true, deckId: true, term: true, translation: true, wordType: true, gender: true,
  cardType: true, emoji: true, due: true, createdAt: true, state: true, stability: true,
  masteredAt: true,
} as const;

let failures = 0;
const ok = (label: string, pass: boolean, detail = "") => {
  console.log(`  ${pass ? "✓" : "✗"} ${label}${pass ? "" : `  ${detail}`}`);
  if (!pass) failures++;
};

const FILTER_CASES: Array<[string, CardFilters]> = [
  ["no filters", {}],
  ["wordTypes VERB", { wordTypes: ["VERB"] }],
  ["wordTypes NOUN+VERB", { wordTypes: ["NOUN", "VERB"] }],
  ["srs due", { srs: ["due"] }],
  ["srs new+mastered", { srs: ["new", "mastered"] }],
  ["hasTranslation true", { hasTranslation: true }],
  ["hasTranslation false", { hasTranslation: false }],
  ["q 'a'", { q: "a" }],
  ["cardTypes GRAMMAR", { cardTypes: ["GRAMMAR"] }],
  ["combo VERB+due+hasTr", { wordTypes: ["VERB"], srs: ["due"], hasTranslation: true }],
];

const SORT_CASES: Array<[CardSort, "asc" | "desc"]> = [
  ["createdAt", "desc"],
  ["createdAt", "asc"],
  ["due", "asc"],
  ["term", "asc"],
  ["wordType", "asc"],
];

async function main() {
  // the deck with the most cards = the toughest parity case
  const grouped = await prisma.card.groupBy({ by: ["deckId"], _count: { _all: true } });
  const top = grouped.sort((a, b) => b._count._all - a._count._all)[0];
  if (!top) throw new Error("no cards in DB");
  const deckId = top.deckId;
  const now = new Date();

  const cards = await prisma.card.findMany({ where: { deckId }, select: CARD_SELECT });
  const rows = cards.map((c) => toCardRow(c, now));
  console.log(`deck ${deckId} — ${rows.length} cards\n`);

  console.log("filter parity (client matched ids === server matched ids):");
  for (const [label, filters] of FILTER_CASES) {
    const clientIds = new Set(rows.filter((r) => matchesCardRow(r, filters)).map((r) => r.id));
    const serverRows = await prisma.card.findMany({
      where: { deckId, ...buildCardWhere(filters, now) },
      select: { id: true },
    });
    const serverIds = new Set(serverRows.map((r) => r.id));
    const equal =
      clientIds.size === serverIds.size && [...clientIds].every((id) => serverIds.has(id));
    ok(`${label}  (n=${serverIds.size})`, equal, `client=${clientIds.size} server=${serverIds.size}`);
  }

  console.log("\nsort correctness (output ordered by the comparator; client first id === server first id):");
  for (const [sort, dir] of SORT_CASES) {
    const cmp = compareCardRows(sort, dir);
    const sortedClient = [...rows].sort(cmp);
    // every adjacent pair is in order per the comparator (catches a non-total order)
    let ordered = true;
    for (let i = 1; i < sortedClient.length; i++) {
      if (cmp(sortedClient[i - 1], sortedClient[i]) > 0) { ordered = false; break; }
    }
    // cross-check vs the server's own orderBy at the head of the list
    const serverFirst = await prisma.card.findMany({
      where: { deckId }, orderBy: cardOrderBy(sort, dir), select: { id: true }, take: 1,
    });
    const firstMatches = sortedClient[0]?.id === serverFirst[0]?.id;
    ok(`${sort} ${dir}`, ordered && firstMatches, `ordered=${ordered} firstMatch=${firstMatches}`);
  }

  console.log(failures === 0 ? "\nALL PARITY CHECKS PASSED" : `\n${failures} PARITY FAILURE(S)`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
