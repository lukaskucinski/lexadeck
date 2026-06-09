/**
 * One-off population script: imports the Notion export (CSV + MD pages)
 * into the LexaDeck database.
 *
 * Usage:
 *   npx tsx scripts/import-notion.ts --dir "<path-to-export-folder>" [--deck "Español"] [--force]
 *
 * --force deletes the target deck (and all its cards/reviews) first.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { prisma } from "../lib/db";
import { parseNotionExport } from "../lib/import/notion";
import { emptySchedulerFields } from "../lib/srs";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string" },
    deck: { type: "string", default: "Español" },
    force: { type: "boolean", default: false },
  },
});

async function main() {
  const dir = args.dir;
  if (!dir) {
    console.error('Missing --dir "<path-to-notion-export-folder>"');
    process.exit(1);
  }

  const entries = await readdir(dir);
  const csvName = entries.find((f) => f.toLowerCase().endsWith("_all.csv"));
  if (!csvName) {
    console.error(`No *_all.csv found in ${dir}`);
    process.exit(1);
  }

  const csvText = await readFile(path.join(dir, csvName), "utf8");
  const mdNames = entries.filter((f) => f.toLowerCase().endsWith(".md"));
  const mdContents = await Promise.all(
    mdNames.map((f) => readFile(path.join(dir, f), "utf8")),
  );

  console.log(`Parsing ${csvName} + ${mdNames.length} MD pages…`);
  const { cards, report } = parseNotionExport({ csvText, mdContents });

  const existing = await prisma.deck.findFirst({
    where: { name: args.deck },
    include: { _count: { select: { cards: true } } },
  });

  if (existing && existing._count.cards > 0) {
    if (!args.force) {
      console.error(
        `Deck "${args.deck}" already has ${existing._count.cards} cards. Re-run with --force to wipe and reimport.`,
      );
      process.exit(1);
    }
    console.log(`--force: deleting deck "${args.deck}" and its cards…`);
    await prisma.deck.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.deck.delete({ where: { id: existing.id } });
  }

  const deck = await prisma.deck.create({
    data: {
      name: args.deck,
      language: "es",
      description: "Imported from Notion flashcard database",
      accentColor: "coral",
    },
  });

  const now = new Date();
  const CHUNK = 250;
  for (let i = 0; i < cards.length; i += CHUNK) {
    const chunk = cards.slice(i, i + CHUNK).map((card) => ({
      deckId: deck.id,
      term: card.term,
      translation: card.translation,
      language: "es",
      cardType: card.cardType,
      wordType: card.wordType,
      gender: card.gender,
      notes: card.notes,
      conjugation: card.conjugation,
      ...emptySchedulerFields(now),
    }));
    await prisma.card.createMany({ data: chunk });
    console.log(`  inserted ${Math.min(i + CHUNK, cards.length)}/${cards.length}`);
  }

  console.log("\n=== Import report ===");
  console.log(`CSV rows:            ${report.csvRows}`);
  console.log(`Cards imported:      ${report.imported}`);
  console.log(`Duplicates merged:   ${report.duplicatesMerged}`);
  console.log(`With translation:    ${report.withTranslation}`);
  console.log(`MD files parsed:     ${report.mdFilesParsed}`);
  console.log(`MD answers found:    ${report.mdAnswersFound}`);
  console.log(`MD answers matched:  ${report.mdAnswersMatched}`);
  if (report.unknownStages.length > 0) {
    console.log(`Unknown stages:      ${report.unknownStages.join(", ")}`);
  }
  console.log(`By word type:`);
  for (const [type, count] of Object.entries(report.byWordType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(12)} ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
