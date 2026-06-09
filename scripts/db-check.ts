import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const [decks, cards] = await Promise.all([
    prisma.deck.count(),
    prisma.card.count(),
  ]);
  console.log(`Connected via pooled DATABASE_URL — decks: ${decks}, cards: ${cards}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
