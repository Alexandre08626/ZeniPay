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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listOrgJournalEntries(supabase: any, orgId: string, limit: number) {
  // Pull tx_groups for the org, then the journal rows for those groups.
  const { data: groups } = await supabase.schema("zenicore").from("tx_groups")
    .select("id").eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const txIds = ((groups ?? []) as Array<{ id: string }>).map((g) => g.id);
  if (txIds.length === 0) return [];
  const { data: rows } = await supabase.schema("zenicore").from("journal")
    .select("id, tx_group, seq, posted_at, account_id, direction, amount_micro, currency, memo, ref_type, ref_id, posted_by")
    .in("tx_group", txIds)
    .order("seq", { ascending: false })
    .limit(limit * 2);   // each tx has N journal rows; cap at 2× for safety
  return (rows ?? []) as Array<{
    id: string; tx_group: string; seq: number; posted_at: string;
    account_id: string; direction: "debit" | "credit"; amount_micro: string;
    currency: string; memo: string; ref_type: string | null; ref_id: string | null;
    posted_by: string;
  }>;
}
