/**
 * Proves the deck card workspace is INSTANT: view toggles / search update the UI
 * with ZERO server navigations (no RSC fetch, no document load) and the URL stays
 * shareable. Requires the app running on SMOKE_PORT.
 *
 *   npx tsx scripts/cardview-smoke.ts
 */
import "dotenv/config";
import { chromium, type Page } from "playwright";
import { prisma } from "../lib/db";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL / E2E_PASSWORD not set");

  const [user] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${email}`;
  const grouped = await prisma.card.groupBy({
    by: ["deckId"],
    where: { deck: { userId: user.id } },
    _count: { _all: true },
  });
  const deckId = grouped.sort((a, b) => b._count._all - a._count._all)[0]?.deckId;
  if (!deckId) throw new Error("no deck with cards for the E2E user");

  const browser = await chromium.launch();
  const page: Page = await browser.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 15000 });

  await page.goto(`${BASE}/decks/${deckId}`);
  await page.waitForLoadState("networkidle");
  console.log("deck open ✓");

  // count re-renders of the DECK PAGE ITSELF (pathname exactly /decks/<id>) — a
  // view toggle that round-tripped would refetch it. Child-route prefetches
  // (/decks/<id>/cards/<cardId>) are expected and good, so exclude them.
  let serverHits = 0;
  const prefetches: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    const path = new URL(u).pathname;
    const isServerNav = u.includes("_rsc") || req.resourceType() === "document";
    if (!isServerNav) return;
    if (path === `/decks/${deckId}`) {
      serverHits++;
      console.log(`  [deck re-render] ${req.resourceType()} ${u.replace(BASE, "")}`);
    } else if (path.startsWith(`/decks/${deckId}/`)) prefetches.push(path);
  });

  const toggle = async (name: RegExp, expectView: string) => {
    await page.getByRole("button", { name }).first().click();
    await page.waitForFunction((v) => location.search.includes(`view=${v}`), expectView, { timeout: 4000 });
    const active = await page
      .getByRole("button", { name })
      .first()
      .evaluate((el) => el.className.includes("bg-ink"));
    console.log(`  view=${expectView}: url ✓, button active=${active}`);
    if (!active) throw new Error(`${expectView} toggle did not show active instantly`);
  };

  await toggle(/grid/i, "grid");
  await toggle(/list/i, "list");
  await toggle(/kanban/i, "kanban");

  // search filters in place
  await page.fill('input[placeholder*="Search"]', "a");
  await page.waitForTimeout(450); // debounce
  await page.waitForFunction(() => location.search.includes("q=a"), undefined, { timeout: 4000 });
  console.log("  search q=a: url ✓");

  await page.waitForTimeout(450); // let any stray request from the interactions land
  const interactionHits = serverHits;

  // view/filter use replaceState, so Back correctly LEAVES the deck (you don't
  // want every filter tweak to become a back-button step)
  await page.goBack();
  await page.waitForFunction((id) => !location.pathname.endsWith(id), deckId, { timeout: 4000 });
  console.log("  back leaves the deck ✓ (replaceState, not history spam)");

  await browser.close();
  await prisma.$disconnect();

  console.log(`\ndeck-page re-renders during view/search interactions: ${interactionHits} (expect 0)`);
  console.log(`child-route prefetches (good — make opening a card instant): ${prefetches.length}`);
  if (interactionHits > 0) {
    console.log("✗ view toggle / search still re-renders the deck on the server");
    process.exit(1);
  }
  console.log("✓ INSTANT: view toggles + search ran entirely client-side (no deck re-render)");
}

main().catch((e) => { console.error(e); process.exit(1); });
