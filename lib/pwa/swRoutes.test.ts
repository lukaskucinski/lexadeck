import { describe, expect, it } from "vitest";
import { cacheStrategyFor, isPrecacheable } from "./swRoutes";

const ORIGIN = "https://lexadeck.vercel.app";

describe("isPrecacheable", () => {
  it("caches immutable build assets and public icons/manifest", () => {
    expect(isPrecacheable("/_next/static/chunks/abc123.js")).toBe(true);
    expect(isPrecacheable("/_next/static/media/font.woff2")).toBe(true);
    expect(isPrecacheable("/_next/static/css/app.css")).toBe(true);
    expect(isPrecacheable("/icons/icon-192.png")).toBe(true);
    expect(isPrecacheable("/manifest.webmanifest")).toBe(true);
    expect(isPrecacheable("/favicon.ico")).toBe(true);
    expect(isPrecacheable("/apple-icon.png")).toBe(true);
  });

  it("never treats authed app routes / RSC / Server Actions as cacheable", () => {
    expect(isPrecacheable("/")).toBe(false);
    expect(isPrecacheable("/decks/123")).toBe(false);
    expect(isPrecacheable("/decks/123/study")).toBe(false);
    expect(isPrecacheable("/progress")).toBe(false);
    expect(isPrecacheable("/library")).toBe(false);
    expect(isPrecacheable("/settings")).toBe(false);
    expect(isPrecacheable("/login")).toBe(false);
    // the SW worker itself must never be cached by the runtime layer
    expect(isPrecacheable("/sw.js")).toBe(false);
  });
});

describe("cacheStrategyFor", () => {
  it("static same-origin assets → static; everything else (authed pages/RSC) → network", () => {
    expect(cacheStrategyFor(new URL(`${ORIGIN}/_next/static/x.js`), ORIGIN)).toBe("static");
    expect(cacheStrategyFor(new URL(`${ORIGIN}/icons/icon-512.png`), ORIGIN)).toBe("static");
    expect(cacheStrategyFor(new URL(`${ORIGIN}/`), ORIGIN)).toBe("network");
    expect(cacheStrategyFor(new URL(`${ORIGIN}/decks/1`), ORIGIN)).toBe("network");
    // an RSC payload rides the same pathname with a ?_rsc= query — still network
    expect(cacheStrategyFor(new URL(`${ORIGIN}/decks/1?_rsc=abc`), ORIGIN)).toBe("network");
  });

  it("cross-origin (e.g. Supabase) is always network-only, even if the path looks static", () => {
    expect(cacheStrategyFor(new URL("https://abc.supabase.co/auth/v1/token"), ORIGIN)).toBe("network");
    expect(cacheStrategyFor(new URL("https://evil.example/_next/static/x.js"), ORIGIN)).toBe("network");
  });
});
