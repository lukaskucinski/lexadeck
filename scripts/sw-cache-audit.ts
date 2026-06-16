/**
 * Auth-safety gate for the service worker. Signs in (creds from .env, never
 * logged), browses authed pages, then asserts Cache Storage holds ONLY static
 * allowlist assets — never authed HTML, RSC payloads, or Supabase responses.
 * Also confirms the SW is registered + controlling (installability prereq).
 *
 *   (server must be running on SMOKE_PORT) npx tsx scripts/sw-cache-audit.ts
 */
import "dotenv/config";
import { chromium } from "playwright";
import { isPrecacheable } from "../lib/pwa/swRoutes";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL / E2E_PASSWORD not set");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 15000 });
  console.log("login ✓");

  // let the SW register + take control, then browse authed pages under its control
  await page.evaluate(() => navigator.serviceWorker.ready);
  for (const path of ["/", "/decks", "/progress"]) {
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle");
  }
  await page.reload(); // ensure a controlled load populates the static cache
  await page.waitForLoadState("networkidle");

  const controlling = await page.evaluate(() => !!navigator.serviceWorker.controller);
  console.log(`SW controlling the page: ${controlling ? "✓" : "✗"}`);
  if (!controlling) throw new Error("SW is not controlling the page — registration failed");

  const cached: string[] = await page.evaluate(async () => {
    const out: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const req of await cache.keys()) out.push(req.url);
    }
    return out;
  });

  console.log(`\ncached entries: ${cached.length}`);
  const leaks = cached.filter((url) => {
    const u = new URL(url);
    return u.origin !== new URL(BASE).origin || !isPrecacheable(u.pathname);
  });

  // show a sample of what's cached for eyeballing
  for (const url of cached.slice(0, 8)) console.log(`  cached: ${new URL(url).pathname}`);
  if (cached.length > 8) console.log(`  …and ${cached.length - 8} more`);

  await browser.close();

  if (leaks.length > 0) {
    console.log("\n✗ LEAK: non-static / cross-origin responses were cached:");
    for (const l of leaks) console.log(`    ${l}`);
    process.exit(1);
  }
  console.log("\n✓ AUTH-SAFE: every cached entry is a same-origin static asset (no HTML/RSC/Supabase).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
