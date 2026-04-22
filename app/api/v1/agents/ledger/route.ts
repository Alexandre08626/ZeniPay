// GET /api/v1/agents/ledger
//
// Org-scoped ledger feed for /agents/ledger. Returns:
//   snapshot:  OrgBalanceSnapshot[] — per-currency totals (treasury /
//              agents / cards pending) from zenicore.org_balance_snapshot.
//   entries:   last 100 journal rows scoped to the org (via tx_groups.organization_id).
//   integrity: ChainIntegrityResult — walks the chain and reports whether
//              any row has been tampered with out-of-band.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../_lib/auth";
import { errorResponse, serverError } from "../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { ZeniCoreClient } from "@/lib/zenicore/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const zc = new ZeniCoreClient(supabase);

    const [snapshot, integrity, entries] = await Promise.all([
      zc.getOrgSnapshot(auth.organizationId),
      zc.verifyChainIntegrity(),
      listOrgJournalEntries(supabase, auth.organizationId, 100),
    ]);

    return NextResponse.json({
      snapshot: snapshot.map((r) => ({
        organization_id: r.organization_id,
        currency: r.currency,
        treasury_micro: String(r.treasury_micro),
        agents_allocated_micro: String(r.agents_allocated_micro),
        cards_pending_micro: String(r.cards_pending_micro),
        total_micro: String(r.total_micro),
      })),
      integrity,
      entries: entries.map((e) => ({
        id: e.id,
        tx_group: e.tx_group,
        seq: e.seq,
        posted_at: e.posted_at,
        account_id: e.account_id,
        direction: e.direction,
        amount_micro: String(e.amount_micro),
        currency: e.currency,
        memo: e.memo,
        ref_type: e.ref_type,
        ref_id: e.ref_id,
        posted_by: e.posted_by,
      })),
    });
  } catch (e) { return serverError(e); }
}

// The zenicore schema isn't exposed to PostgREST, so we route through the
// public.zc_get_tx_groups / public.zc_get_journal SECURITY DEFINER wrappers
// (migration 20260422184457_zenicore_zenicards_public_wrappers). Same data
// shape; the wrappers do the org scoping internally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listOrgJournalEntries(supabase: any, orgId: string, limit: number) {
  const { data: groups } = await supabase.rpc("zc_get_tx_groups", {
    p_organization_id: orgId,
    p_limit: limit,
  });
  const txIds = ((groups ?? []) as Array<{ id: string }>).map((g) => g.id);
  if (txIds.length === 0) return [];

  // zc_get_journal doesn't accept a tx_group filter; pull the most recent
  // `limit*2` entries for the org and filter client-side to rows that
  // belong to our tx_groups. Cheap at MVP volumes (hundreds of rows).
  const { data: rows } = await supabase.rpc("zc_get_journal", {
    p_organization_id: orgId,
    p_limit: limit * 2,
  });
  const txIdSet = new Set(txIds);
  return ((rows ?? []) as Array<{
    id: string; tx_group: string; seq: number | string; posted_at: string;
    account_id: string; direction: "debit" | "credit"; amount_micro: number | string;
    currency: string; memo: string; ref_type: string | null; ref_id: string | null;
    posted_by: string;
  }>).filter((r) => txIdSet.has(r.tx_group));
}
