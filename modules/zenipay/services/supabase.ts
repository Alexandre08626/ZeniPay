/**
 * Shared Supabase client for server-side API routes.
 * Uses service_role key to bypass RLS — never expose this client-side.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mjkvkibdfteonvlahtag.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";

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
