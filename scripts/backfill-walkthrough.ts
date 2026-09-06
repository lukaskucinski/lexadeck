/**
 * One-off: mark every existing Profile's first-run walkthrough as already seen,
 * so deploying PR4 doesn't auto-pop the tour over current users — including the
 * E2E smoke account, which would otherwise block the Playwright smokes. New
 * signups get walkthroughSeenAt = null from completeOnboarding, so they still
 * see the tour. Idempotent: only touches rows where it's still null.
 *
 *   npx tsx scripts/backfill-walkthrough.ts
 */
import "dotenv/config";
import { Client } from "pg";

const DB_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

async function main() {
  if (!DB_URL) throw new Error("Missing DIRECT_URL / DATABASE_URL in .env");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  const res = await db.query(
    `UPDATE "Profile" SET "walkthroughSeenAt" = now() WHERE "walkthroughSeenAt" IS NULL`,
  );

  console.log(`Marked ${res.rowCount} profile(s) as having seen the walkthrough.`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
