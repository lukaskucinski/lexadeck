/**
 * Pure helpers for deck-level batch AI enrichment ("Enrich all").
 *
 * The run is orchestrated on the client: it fetches the target card ids, slices
 * them into chunks, and calls the `enrichCards` server action per chunk so each
 * request stays short (no Vercel timeout, no job queue) and progress is live.
 * Kept dependency-free so the bucket/slice/quota logic is unit-testable without
 * a DB or network.
 */

/** The three card populations the deck enrich panel can target. */
export type EnrichTargetBucket = "neverEnriched" | "stale" | "enriched";

/** Cards enriched per `enrichCards` chunk — one Gemini request covers the slice. */
export const ENRICH_BATCH_SIZE = 15;

/** Verbs conjugated per `conjugateVerbs` chunk (one Gemini request EACH, so small). */
export const CONJ_BATCH_SIZE = 3;

/** Split ids into fixed-size chunks, preserving order. Throws on a non-positive size. */
export function chunkIds(ids: string[], size: number): string[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`chunkIds: size must be a positive integer, got ${size}`);
  }
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/**
 * True when a provider error means the daily quota / rate limit is spent, so the
 * run should stop gracefully and resume later — rather than a transient overload
 * (5xx), which the provider layer already retries on the fallback model.
 */
export function isQuotaError(message: string): boolean {
  if (!message) return false;
  return /\b429\b|quota|resource_exhausted|rate.?limit|too many requests|exceeded/i.test(
    message,
  );
}
