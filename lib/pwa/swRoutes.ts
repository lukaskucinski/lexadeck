/**
 * Service-worker caching policy — pure so it's unit-tested and shared verbatim
 * by the SW runtime config. The rule is an ALLOWLIST: cache ONLY known-immutable,
 * non-user-specific static assets; everything else is network-only. This makes it
 * impossible to accidentally cache authed HTML / RSC payloads / Server Actions /
 * Supabase responses on a shared device (multi-user safety).
 */

/** Same-origin path prefixes that are safe to cache (immutable / public). */
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/assets/"];

/** Same-origin exact public files. */
const STATIC_EXACT = new Set(["/manifest.webmanifest", "/favicon.ico"]);

/** Same-origin public metadata routes (Next file-convention images). */
const STATIC_PATTERNS = [/^\/apple-icon/, /^\/opengraph-image/, /^\/twitter-image/];

/** Is this same-origin pathname a static asset safe for cache-first? */
export function isPrecacheable(pathname: string): boolean {
  return (
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    STATIC_EXACT.has(pathname) ||
    STATIC_PATTERNS.some((re) => re.test(pathname))
  );
}

export type SwCacheStrategy = "static" | "network";

/**
 * Pick a strategy for a request URL. `static` (cache-first) only for same-origin
 * precacheable assets; `network` (network-only, never cached) for everything else
 * — authed navigations, RSC, and all cross-origin calls (e.g. Supabase).
 */
export function cacheStrategyFor(url: URL, selfOrigin: string): SwCacheStrategy {
  if (url.origin === selfOrigin && isPrecacheable(url.pathname)) return "static";
  return "network";
}
