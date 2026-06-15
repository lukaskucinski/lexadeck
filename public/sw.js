/*
 * LexaDeck service worker — minimal, dependency-free, DENY-BY-DEFAULT.
 *
 * Purpose: (1) make the app installable (Chrome needs a registered SW with a
 * fetch handler), (2) serve the immutable static shell from cache so a cold PWA
 * launch loads JS/CSS from disk instead of the network.
 *
 * SAFETY: this caches ONLY a same-origin static allowlist. Every other request —
 * authed navigations, RSC payloads, Server Actions, Supabase/auth calls — is NOT
 * intercepted at all (no respondWith → the browser does its normal network
 * fetch). So no user-specific HTML or data can ever enter a cache on a shared
 * device. Keep the allowlist below in sync with lib/pwa/swRoutes.ts (the unit-
 * tested source of truth); because it is an allowlist, drift can only ever cause
 * a cache miss, never an authed-content leak.
 */
const STATIC_CACHE = "lexadeck-static-v1";

const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/assets/"];
const STATIC_EXACT = ["/manifest.webmanifest", "/favicon.ico"];
const STATIC_PATTERNS = [/^\/apple-icon/, /^\/opengraph-image/, /^\/twitter-image/];

function isStatic(pathname) {
  return (
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    STATIC_EXACT.includes(pathname) ||
    STATIC_PATTERNS.some((re) => re.test(pathname))
  );
}

// New SW installs but does NOT auto-activate over an old one — the page's
// registrar shows an "update available" prompt and messages SKIP_WAITING on
// the user's click, so a fresh deploy never silently masks itself.
self.addEventListener("install", () => {
  // intentionally no skipWaiting() here
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // drop caches from previous SW versions
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never touch mutations / Server Actions
  const url = new URL(req.url);
  // pass-through everything that isn't a same-origin static asset (auth-safe)
  if (url.origin !== self.location.origin || !isStatic(url.pathname)) return;

  // cache-first for immutable hashed assets — the cold-boot win
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })(),
  );
});
