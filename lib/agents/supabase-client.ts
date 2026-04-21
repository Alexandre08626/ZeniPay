// Supabase admin client for the `agents` schema.
// We reuse the existing getSupabaseAdmin() credentials (SUPABASE_URL +
// SERVICE_ROLE_KEY) but scope the client to `agents`. Service role bypasses
// RLS, so API routes using this client must enforce org scoping themselves.

import { createClient } from "@supabase/supabase-js";

// The `agents` schema is not typed — we cast to any so the db-scoped client
// compiles against the default "public"-typed SupabaseClient generic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

let _client: AnyClient = null;

export function getAgentsDb(): AnyClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "lib/agents: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "agents" },
  });
  return _client;
}

// Test helper — lets unit tests inject a mocked SupabaseClient without env vars.
export function __setAgentsDbForTests(client: AnyClient): void {
  _client = client;
}
