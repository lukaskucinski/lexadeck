/**
 * Production smoke: sign in with E2E_EMAIL/E2E_PASSWORD (Supabase Auth),
 * verify the dashboard renders with live data, screenshot the result.
 *   npx tsx scripts/prod-smoke.ts
 */
import "dotenv/config";
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "https://lexadeck.vercel.app";

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error("E2E_EMAIL / E2E_PASSWORD not set");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  // signed-out "/" serves the public landing page (PR #9) — deep links
  // still redirect to /login; the landing's CTA is the way in
  await page.goto(BASE);
  const landing = (await page.locator("body").textContent()) ?? "";
  if (!/flashcards/i.test(landing) || !/invite only/i.test(landing)) {
    throw new Error("signed-out / did not render the landing page");
  }
  console.log("gate: signed-out / renders the landing ✓");

  await page.locator('a[href="/login"]').first().click();
  await page.waitForURL(/\/login/);
  console.log("landing → /login via Sign in ✓");

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
  console.log("login: accepted credentials ✓");

  await page.waitForSelector("h1", { timeout: 15000 });
  const heading = await page.locator("h1").first().textContent();
  const body = (await page.locator("body").textContent()) ?? "";
  console.log(`dashboard heading: "${heading?.trim().slice(0, 40)}"`);

  if (!/cards ready for review|Nothing due/i.test(body)) {
    throw new Error("dashboard did not render deck data");
  }
  console.log("dashboard: live Supabase data rendered ✓");

  await page.screenshot({ path: "design-spike/check-prod.png" });
  await browser.close();
  console.log("\nPROD SMOKE: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
