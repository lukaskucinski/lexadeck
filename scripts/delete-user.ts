/**
 * Delete a user account and ALL its data — auth user + decks/cards/reviews/
 * sessions + Profile. Built for repeated signup-flow testing.
 *
 * Inspect (read-only) — prints the Profile + data counts, deletes nothing:
 *   DRY_RUN=1 DELETE_EMAIL=kucinski.gis@gmail.com npx tsx scripts/delete-user.ts
 *
 * Delete for real:
 *   DELETE_EMAIL=kucinski.gis@gmail.com npx tsx scripts/delete-user.ts
 *
 * Email is required (no default) so this can't nuke an account by accident.
 * App rows go through Prisma (leaf→root); the auth.users row is removed over
 * DIRECT_URL (postgres role owns the auth schema), which cascades auth.identities.
 */
import "dotenv/config";
import { Client } from "pg";
import { prisma } from "../lib/db";

const email = (process.env.DELETE_EMAIL ?? process.argv[2] ?? "").trim().toLowerCase();
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const DB_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

async function main() {
  if (!email) {
    throw new Error("Set DELETE_EMAIL=<address> (use DRY_RUN=1 to inspect without deleting).");
  }
  if (!DB_URL) throw new Error("Missing DIRECT_URL / DATABASE_URL in .env");

  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  const { rows } = await db.query("SELECT id::text AS id FROM auth.users WHERE lower(email) = $1", [
    email,
  ]);
  if (rows.length === 0) {
    console.log(`No auth user for ${email} — nothing to do.`);
    await db.end();
    await prisma.$disconnect();
    return;
  }
  const userId = rows[0].id;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const [decks, cards, reviews, sessions] = await Promise.all([
    prisma.deck.count({ where: { userId } }),
    prisma.card.count({ where: { deck: { userId } } }),
    prisma.review.count({ where: { card: { deck: { userId } } } }),
    prisma.session.count({ where: { deck: { userId } } }),
  ]);

  console.log(`\n${email}  (uid ${userId})`);
  console.log("  profile:", profile
    ? {
        primarySubject: profile.primarySubject,
        primaryLanguage: profile.primaryLanguage,
        ageRange: profile.ageRange,
        cefrLevel: profile.cefrLevel,
        acceptedTermsAt: profile.acceptedTermsAt,
        onboardingCompletedAt: profile.onboardingCompletedAt,
      }
    : "(none)");
  console.log("  data:", { decks, cards, reviews, sessions });

  if (DRY_RUN) {
    console.log("\nDRY RUN — nothing deleted.");
    await db.end();
    await prisma.$disconnect();
    return;
  }

  // leaf → root so FK constraints never block
  await prisma.review.deleteMany({ where: { card: { deck: { userId } } } });
  await prisma.session.deleteMany({ where: { deck: { userId } } });
  await prisma.card.deleteMany({ where: { deck: { userId } } });
  await prisma.deck.deleteMany({ where: { userId } });
  await prisma.profile.deleteMany({ where: { userId } });
  await db.query("DELETE FROM auth.users WHERE id = $1::uuid", [userId]);

  console.log(`\nDeleted ${email}: ${decks} decks, ${cards} cards, ${reviews} reviews, ${sessions} sessions, profile + auth user.`);
  await db.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
