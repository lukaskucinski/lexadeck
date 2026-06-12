/**
 * One-off cleanup: null out Card.emoji values that aren't genuine emoji
 * (older enrichment runs stored symbols like "✦" that render as tofu).
 *
 * Usage:
 *   npx tsx scripts/clean-emoji.ts            # report only
 *   npx tsx scripts/clean-emoji.ts --apply    # report and null the values
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "../lib/db";
import { sanitizeEmoji } from "../lib/emoji";

const { values: args } = parseArgs({
  options: { apply: { type: "boolean", default: false } },
});

async function main() {
  const cards = await prisma.card.findMany({
    where: { emoji: { not: null } },
    select: { id: true, term: true, emoji: true, deck: { select: { name: true } } },
  });

  const invalid = cards.filter((c) => sanitizeEmoji(c.emoji) === null);
  console.log(`${cards.length} cards have an emoji; ${invalid.length} invalid`);

  for (const c of invalid) {
    const codepoints = [...c.emoji!]
      .map((ch) => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))
      .join(" ");
    console.log(`  [${c.deck.name}] "${c.term}" — ${JSON.stringify(c.emoji)} (${codepoints})`);
  }

  if (invalid.length === 0) return;
  if (!args.apply) {
    console.log("\nDry run — re-run with --apply to null these values.");
    return;
  }

  const { count } = await prisma.card.updateMany({
    where: { id: { in: invalid.map((c) => c.id) } },
    data: { emoji: null },
  });
  console.log(`\nNulled emoji on ${count} cards.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
