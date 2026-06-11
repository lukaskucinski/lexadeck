/**
 * E2E smoke test for study mode. Requires the app running on PORT (default 3457)
 * and E2E_EMAIL/E2E_PASSWORD in .env (the smoke signs in via Supabase Auth).
 * Verifies: login → preview → start → reveal → rate all four buttons →
 * Review rows persisted, card FSRS state mutated, Again card re-queued
 * within the session.
 *
 *   npx tsx scripts/study-smoke.ts
 */
import "dotenv/config";
import { chromium } from "playwright";
import { prisma } from "../lib/db";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL / E2E_PASSWORD not set");

  // the smoke account's first deck — queries below stay scoped to it
  const [owner] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${email}
  `;
  if (!owner) throw new Error(`No auth user for ${email}`);
  const deck = await prisma.deck.findFirst({ where: { userId: owner.id } });
  if (!deck) throw new Error("No deck in DB for the smoke account");

  const reviewsBefore = await prisma.review.count();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
  console.log("login: accepted credentials ✓");

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

  // --- assertions ---
  // server actions (auth check + transaction) settle asynchronously — poll
  let persisted = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    persisted = (await prisma.review.count()) - reviewsBefore;
    if (persisted >= 4) break;
    await page.waitForTimeout(500);
  }
  console.log(`reviews persisted: ${persisted} (expect 4)`);
  if (persisted !== 4) throw new Error("expected 4 new reviews");

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
