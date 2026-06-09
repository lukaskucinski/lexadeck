/**
 * E2E smoke test for study mode. Requires the app running on PORT (default 3457)
 * with SITE_PASSWORD disabled. Verifies: preview → start → reveal → rate all
 * four buttons → Review rows persisted, card FSRS state mutated, Again card
 * re-queued within the session.
 *
 *   npx tsx scripts/study-smoke.ts
 */
import "dotenv/config";
import { chromium } from "playwright";
import { prisma } from "../lib/db";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

async function main() {
  const deck = await prisma.deck.findFirst();
  if (!deck) throw new Error("No deck in DB");

  const reviewsBefore = await prisma.review.count();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/decks/${deck.id}/study`);
  await page.getByRole("button", { name: /start session/i }).click();

  // helper: reveal current card and rate it
  async function rateOnce(button: RegExp): Promise<string> {
    const term = (await page.locator("h2").first().textContent()) ?? "?";
    await page.getByRole("button", { name: /reveal answer/i }).click();
    await page.getByRole("button", { name: button }).click();
    await page.waitForTimeout(400); // exit/enter animation
    return term.trim();
  }

  const againTerm = await rateOnce(/again/i);
  console.log(`rated AGAIN: "${againTerm}"`);
  const hardTerm = await rateOnce(/hard/i);
  console.log(`rated HARD:  "${hardTerm}"`);
  const goodTerm = await rateOnce(/good/i);
  console.log(`rated GOOD:  "${goodTerm}"`);
  const easyTerm = await rateOnce(/easy/i);
  console.log(`rated EASY:  "${easyTerm}"`);

  await page.waitForTimeout(800); // let server actions settle

  // --- assertions ---
  const reviewsAfter = await prisma.review.count();
  console.log(`reviews persisted: ${reviewsAfter - reviewsBefore} (expect 4)`);
  if (reviewsAfter - reviewsBefore !== 4) throw new Error("expected 4 new reviews");

  const easyCard = await prisma.card.findFirst({
    where: { deckId: deck.id, term: easyTerm },
  });
  if (!easyCard || easyCard.state === 0 || easyCard.reps < 1) {
    throw new Error(`EASY card state not mutated: ${JSON.stringify(easyCard)}`);
  }
  console.log(
    `EASY card mutated: state=${easyCard.state} reps=${easyCard.reps} due=${easyCard.due.toISOString()}`,
  );

  const session = await prisma.session.findFirst({
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { reviews: true } } },
  });
  console.log(`session reviews: ${session?._count.reviews} (expect 4)`);

  // the Again card must come due within the requeue window (~1 min for FSRS step 1)
  const againCard = await prisma.card.findFirst({
    where: { deckId: deck.id, term: againTerm },
  });
  const dueInMs = (againCard?.due.getTime() ?? 0) - Date.now();
  console.log(`AGAIN card due in ${(dueInMs / 60000).toFixed(1)} min (expect ≤ 12)`);
  if (dueInMs > 12 * 60_000) throw new Error("Again card not scheduled for re-queue window");

  // screenshot for the record
  await page.screenshot({ path: "design-spike/check-study.png" });

  await browser.close();
  await prisma.$disconnect();
  console.log("\nSTUDY SMOKE: PASS");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
