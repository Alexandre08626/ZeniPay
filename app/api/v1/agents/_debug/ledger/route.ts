// Temporary diagnostic — compares raw RPC results to what the production
// /api/v1/agents/ledger route returns. Will be removed once the ZeniCore
// read-path bug is isolated.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const orgId = req.headers.get("x-zp-agents-org") ?? "org_1707cddd-147e-4ab1-a454-3571ed551603";
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "env_missing", url: !!url, key: !!key }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [integrity, groups, journalOrg, journalAll, accounts] = await Promise.all([
    supabase.rpc("zc_verify_chain_integrity", { p_start_at: null }),
    supabase.rpc("zc_get_tx_groups", { p_organization_id: orgId, p_limit: 10 }),
    supabase.rpc("zc_get_journal", { p_organization_id: orgId, p_limit: 20 }),
    supabase.rpc("zc_get_journal", { p_limit: 20 }),
    supabase.rpc("zc_get_accounts", { p_organization_id: orgId }),
  ]);

  return NextResponse.json({
    supabase_url_hint: url.slice(0, 40),
    org_id: orgId,
    integrity: { data: integrity.data, error: integrity.error?.message ?? null },
    groups_for_org: { count: (groups.data as unknown[])?.length ?? 0, data: groups.data, error: groups.error?.message ?? null },
    journal_for_org: { count: (journalOrg.data as unknown[])?.length ?? 0, data: journalOrg.data, error: journalOrg.error?.message ?? null },
    journal_all: { count: (journalAll.data as unknown[])?.length ?? 0, error: journalAll.error?.message ?? null },
    accounts_for_org: { count: (accounts.data as unknown[])?.length ?? 0, data: accounts.data, error: accounts.error?.message ?? null },
  });
}
