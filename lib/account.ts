/**
 * Pure account helpers. The destructive deletion itself lives in the server
 * action (lib/actions/account.ts); this file stays free of DB/Next imports so
 * the confirmation check is unit-testable.
 */

/**
 * True only when the typed text equals the account email (trimmed,
 * case-insensitive) and neither side is blank. Guards the "type your email to
 * confirm" delete gate against accidental or empty submissions.
 */
export function confirmationMatches(
  typed: string | null | undefined,
  email: string | null | undefined,
): boolean {
  const a = (typed ?? "").trim().toLowerCase();
  const b = (email ?? "").trim().toLowerCase();
  return a.length > 0 && b.length > 0 && a === b;
}
