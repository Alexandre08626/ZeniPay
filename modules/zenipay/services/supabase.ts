/**
 * Shared Supabase client for server-side API routes.
 * Uses service_role key to bypass RLS — never expose this client-side.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string, ...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing ZeniPay env: ${name} (tried ${keys.join(", ")})`);
}

const SUPABASE_URL = requireEnv("Supabase URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = requireEnv("Supabase Key", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** Direct PostgREST fetch */
export async function pgrest(path: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Prefer: "count=exact",
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST error ${res.status}: ${text}`);
  }
  return res.json();
}
