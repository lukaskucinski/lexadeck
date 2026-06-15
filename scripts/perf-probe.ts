/**
 * Load-time probe. Measures the two cold-load critical paths — the public
 * landing (/welcome, signed out) and the authenticated dashboard (/, signed in)
 * — and prints Navigation Timing + transferred JS per route. Run it against a
 * PRODUCTION build before and after a change to quantify the win:
 *
 *   npm run build
 *   npx next start -p 3457        # in one shell
 *   npx tsx scripts/perf-probe.ts # in another
 *
 * Each route loads in a FRESH browser context (empty cache) so the numbers are
 * first-visit, not warm. Dashboard sign-in uses E2E_EMAIL / E2E_PASSWORD.
 * Local numbers are best for bundle size + relative TTFB; real mobile/cold-start
 * figures come from Lighthouse against the Vercel preview deploy.
 */
import "dotenv/config";
import { type Browser, chromium } from "playwright";

const BASE = `http://localhost:${process.env.SMOKE_PORT ?? 3457}`;

interface RouteTiming {
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  jsTransferKb: number;
  jsRequestCount: number;
}

/** Read Navigation Timing + summed script transfer size from the loaded page. */
async function measure(browser: Browser, url: string, signIn = false): Promise<RouteTiming> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  if (signIn) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', process.env.E2E_EMAIL ?? "");
    await page.fill('input[name="password"]', process.env.E2E_PASSWORD ?? "");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 15000 });
  }

  await page.goto(url, { waitUntil: "load" });

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"));
    const jsBytes = scripts.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0);
    return {
      ttfbMs: Math.round(nav.responseStart),
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      jsTransferKb: Math.round(jsBytes / 1024),
      jsRequestCount: scripts.length,
    };
  });

  await context.close();
  return timing;
}

function report(label: string, t: RouteTiming) {
  console.log(
    `${label.padEnd(22)} TTFB ${String(t.ttfbMs).padStart(5)}ms | ` +
      `DCL ${String(t.domContentLoadedMs).padStart(5)}ms | ` +
      `load ${String(t.loadMs).padStart(5)}ms | ` +
      `JS ${String(t.jsTransferKb).padStart(4)}KB (${t.jsRequestCount} files)`,
  );
}

async function main() {
  const browser = await chromium.launch();
  try {
    console.log(`PERF PROBE → ${BASE} (mobile viewport, cold context per route)\n`);
    report("/welcome (signed out)", await measure(browser, `${BASE}/welcome`));
    if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
      report("/ (dashboard, signed in)", await measure(browser, `${BASE}/`, true));
    } else {
      console.log("(skipped dashboard — set E2E_EMAIL / E2E_PASSWORD to include it)");
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
