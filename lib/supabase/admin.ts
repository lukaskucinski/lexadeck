import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged, server-only operations (deleting
 * an auth user). NEVER import this into client code — the key bypasses RLS and
 * all auth. Returns null when SUPABASE_SERVICE_ROLE_KEY isn't configured so
 * callers can fail with a clear message instead of crashing.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
