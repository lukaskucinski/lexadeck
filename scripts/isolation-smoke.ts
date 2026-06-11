/**
 * Cross-tenant isolation smoke. The standing regression test for multi-user
 * scoping: Prisma connects as the table owner (RLS doesn't apply to it), so
 * the app layer is the enforcement boundary — this script proves it holds.
 *
 * Signs in as a secondary account and asserts it sees ONLY its own decks,
 * and that a direct URL to another tenant's deck 404s.
 *
 * Requires the app running on SMOKE_PORT (default 3457) and credentials in
 * the gitignored .env.credentials ("Name: email / password" lines, written
 * by scripts/create-users.ts). Picks the first account that differs from
 * E2E_EMAIL; override with ISOLATION_USER=<email>.
 *
 *   npx tsx scripts/isolation-smoke.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { prisma } from "../lib/db";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

function pickAccount(): { email: string; password: string } {
  const lines = readFileSync(".env.credentials", "utf8")
    .split("\n")
    .map((line) => line.match(/^\w+:\s*(\S+@\S+)\s*\/\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ email: m[1], password: m[2].trim() }));

  const wanted = process.env.ISOLATION_USER;
  const account = wanted
    ? lines.find((l) => l.email === wanted)
    : lines.find((l) => l.email !== process.env.E2E_EMAIL);
  if (!account) throw new Error("No suitable account in .env.credentials");
  return account;
}

async function main() {
  const { email, password } = pickAccount();
  console.log(`isolation account: ${email}`);

  const [user] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${email}
  `;
  if (!user) throw new Error(`No auth user for ${email}`);

  const ownDecks = await prisma.deck.findMany({ where: { userId: user.id } });
  const foreignDeck = await prisma.deck.findFirst({
    where: { userId: { not: user.id } },
  });
  if (ownDecks.length === 0) throw new Error("Account has no decks to assert on");
  if (!foreignDeck) throw new Error("No foreign deck in DB — need a second tenant");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
  console.log("login ✓");

  await page.goto(`${BASE}/`);
  const body = (await page.locator("body").textContent()) ?? "";
  for (const deck of ownDecks) {
    if (!body.includes(deck.name)) throw new Error(`own deck "${deck.name}" missing from dashboard`);
  }
  console.log(`own deck${ownDecks.length === 1 ? "" : "s"} visible ✓`);
  if (body.includes(foreignDeck.name)) {
    throw new Error(`LEAK: foreign deck "${foreignDeck.name}" visible on dashboard`);
  }
  console.log(`foreign deck "${foreignDeck.name}" not visible ✓`);

  const resp = await page.goto(`${BASE}/decks/${foreignDeck.id}`);
  if (resp?.status() !== 404) {
    throw new Error(`LEAK: foreign deck URL returned ${resp?.status()}, expected 404`);
  }
  console.log("direct URL to foreign deck → 404 ✓");

  await browser.close();
  await prisma.$disconnect();
  console.log("\nISOLATION SMOKE: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
