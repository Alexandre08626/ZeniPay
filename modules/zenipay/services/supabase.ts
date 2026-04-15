/**
 * Shared Supabase client for server-side API routes.
 * Uses service_role key to bypass RLS — never expose this client-side.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getEnv(name: string, ...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing ZeniPay env: ${name} (tried ${keys.join(", ")})`);
}

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url = getEnv("Supabase URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
    const key = getEnv("Supabase Key", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** Direct PostgREST fetch */
export async function pgrest(path: string): Promise<unknown[]> {
  const url = getEnv("Supabase URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("Supabase Key", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
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

/** Direct PostgREST INSERT (bypasses Supabase JS client cache) */
export async function pgrestInsert(table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const url = getEnv("Supabase URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("Supabase Key", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const body = Array.isArray(rows) ? rows : [rows];
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST insert error ${res.status}: ${text}`);
  }
}
