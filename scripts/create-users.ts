/**
 * One-off: create the Supabase Auth users with random passwords.
 *
 * - Parameterized SQL over DIRECT_URL (the postgres role owns the auth schema),
 *   so no password ever appears in SQL text, logs, or terminal output.
 * - Credentials are written ONLY to .env.credentials (gitignored via .env*);
 *   the first user's are also appended to .env as E2E_EMAIL/E2E_PASSWORD for
 *   the smoke tests.
 * - Each new account is verified with a real signInWithPassword before the
 *   script reports success.
 *
 *   npx tsx scripts/create-users.ts
 *
 * To rotate an existing user's password (e.g. the credentials file was lost):
 *   RESET_EXISTING=ari.j.herman@gmail.com npx tsx scripts/create-users.ts
 */
import "dotenv/config";
import { randomBytes, randomInt } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const USERS = [
  { email: "lukaskucinski@gmail.com", displayName: "Lukas", e2e: true },
  { email: "ari.j.herman@gmail.com", displayName: "Ari", e2e: false },
] as const;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DB_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

/** Readable but random, e.g. "Ari-k3f9c2-4817". */
function generatePassword(name: string): string {
  return `${name}-${randomBytes(3).toString("hex")}-${randomInt(1000, 10_000)}`;
}

const CREATE_USER_SQL = `
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', $1,
    extensions.crypt($2, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', $3::text),
    now(), now(), '', '', '', '', ''
  ) RETURNING id`;

const CREATE_IDENTITY_SQL = `
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), ($1::text)::uuid, $1::text,
    jsonb_build_object('sub', $1::text, 'email', $2::text,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  )`;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !DB_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / DIRECT_URL in .env");
  }

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const credentialLines: string[] = ["# LexaDeck logins — local only, never commit", ""];

  for (const user of USERS) {
    const existing = await db.query("SELECT id FROM auth.users WHERE email = $1", [user.email]);
    if (existing.rowCount) {
      if (process.env.RESET_EXISTING?.includes(user.email)) {
        const password = generatePassword(user.displayName);
        await db.query(
          `UPDATE auth.users
             SET encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
                 updated_at = now()
           WHERE email = $1`,
          [user.email, password],
        );
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (error) throw new Error(`Login verification failed for ${user.email}: ${error.message}`);
        await supabase.auth.signOut();
        credentialLines.push(`${user.displayName}: ${user.email} / ${password}`);
        console.log(`~ ${user.email} password rotated, login verified`);
      } else {
        console.log(`= ${user.email} already exists — skipped (password unchanged)`);
      }
      continue;
    }

    const password = generatePassword(user.displayName);
    // user + identity must land together — a lone auth.users row can't log in
    await db.query("BEGIN");
    let userId: string;
    try {
      const created = await db.query(CREATE_USER_SQL, [user.email, password, user.displayName]);
      userId = created.rows[0].id;
      await db.query(CREATE_IDENTITY_SQL, [userId, user.email]);
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) throw new Error(`Login verification failed for ${user.email}: ${error.message}`);
    await supabase.auth.signOut();

    credentialLines.push(`${user.displayName}: ${user.email} / ${password}`);
    if (user.e2e) {
      appendFileSync(".env", `\n# smoke-test login\nE2E_EMAIL=${user.email}\nE2E_PASSWORD=${password}\n`);
    }
    console.log(`+ ${user.email} created, login verified (id ${userId})`);
  }

  if (credentialLines.length > 2) {
    appendFileSync(".env.credentials", `${credentialLines.join("\n")}\n`);
    console.log("Credentials appended to .env.credentials (gitignored).");
  }

  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
