/**
 * Seed / extend the beta access allowlist (model AllowedEmail). Idempotent —
 * upserts each email lower-cased, so re-running is safe.
 *
 *   npx tsx scripts/allowlist.ts
 *
 * Add one more address to the list:
 *   ALLOW_EMAIL=someone@example.com npx tsx scripts/allowlist.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";

// The existing beta users (Lukas + the two test accounts).
const EMAILS = [
  "lukaskucinski@gmail.com",
  "ari.j.herman@gmail.com",
  "lorelschmitzberger@gmail.com",
];

async function main() {
  const extra = process.env.ALLOW_EMAIL?.trim();
  const all = extra ? [...EMAILS, extra] : EMAILS;

  for (const raw of all) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    await prisma.allowedEmail.upsert({ where: { email }, create: { email }, update: {} });
    console.log(`✓ allowlisted ${email}`);
  }

  const count = await prisma.allowedEmail.count();
  console.log(`Allowlist now has ${count} email(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
