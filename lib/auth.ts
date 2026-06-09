export const AUTH_COOKIE = "ld_auth";

/**
 * SHA-256 hex digest via Web Crypto — runs in both the Node and Edge
 * runtimes, so middleware and server actions share one implementation.
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`lexadeck:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
