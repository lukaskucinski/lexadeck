/**
 * One-off: mark the existing beta users as already-onboarded, so deploying the
 * onboarding gate doesn't push them through the questionnaire (they've been using
 * the app already) and so the smoke tests — which sign in as an existing user —
 * still land in the app instead of /onboarding.
 *
 * Reads auth.users over DIRECT_URL (the postgres role) to map email → uid, then
 * inserts a completed Profile per user. Idempotent: ON CONFLICT DO NOTHING.
 *
 *   npx tsx scripts/backfill-profiles.ts
 */
import "dotenv/config";
import { Client } from "pg";

const EMAILS = [
  "lukaskucinski@gmail.com",
  "ari.j.herman@gmail.com",
  "lorelschmitzberger@gmail.com",
];

const DB_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

async function main() {
  if (!DB_URL) throw new Error("Missing DIRECT_URL / DATABASE_URL in .env");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // id has no DB-level default (Prisma generates the cuid at the app layer), so
  // supply a uuid string; updatedAt likewise needs an explicit value here.
  const res = await db.query(
    `INSERT INTO "Profile"
       (id, "userId", "primarySubject", "acceptedTermsAt", "onboardingCompletedAt", "createdAt", "updatedAt")
     SELECT gen_random_uuid()::text, u.id::text, 'languages', now(), now(), now(), now()
       FROM auth.users u
      WHERE lower(u.email) = ANY($1::text[])
     ON CONFLICT ("userId") DO NOTHING`,
    [EMAILS],
  );

  console.log(`Backfilled ${res.rowCount} profile(s) as onboarded.`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
