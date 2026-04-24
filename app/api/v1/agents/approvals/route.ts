// GET /api/v1/agents/approvals?status=pending|approved|rejected|expired|resolved|all
//
// Returns approval requests for the caller. Two sources merged:
//   1. `agents.approval_requests` (legacy TOTP signature flow for
//      agent-scoped events — ids without a prefix).
//   2. `public.zenipay_approval_requests` (PR 12 merchant-rule flow —
//      ids prefixed `apr_`). Resolved via the caller org's merchant
//      mapping; rows carry a `source: "merchant_rule"` flag.
//
// UI consumers iterate the merged array and branch on `source`.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  // ─── 1. Legacy TOTP requests from agents.approval_requests ──────────
  const agentsDb = getAgentsDb();
  let legacyQ = agentsDb
    .from("approval_requests")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status && status !== "all") legacyQ = legacyQ.eq("status", status);
  const { data: legacy, error: legacyErr } = await legacyQ;
  if (legacyErr) return NextResponse.json({ error: legacyErr.message }, { status: 500 });

  const { count } = await agentsDb
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId)
    .eq("status", "pending");

  // ─── 2. PR 12 merchant-rule requests from zenipay_approval_requests ──
  const zp = getSupabaseAdmin();
  const { data: mapping } = await zp
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", auth.organizationId)
    .maybeSingle();

  let merchantRows: Array<Record<string, unknown>> = [];
  if (mapping?.merchant_id) {
    let merchantQ = zp
      .from("zenipay_approval_requests")
      .select("*")
      .eq("merchant_id", mapping.merchant_id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status && status !== "all") merchantQ = merchantQ.eq("status", status);
    const { data: mr } = await merchantQ;
    merchantRows = (mr ?? []).map((r) => ({ ...r, source: "merchant_rule" as const }));
  }

  const legacyTagged = ((legacy ?? []) as Array<Record<string, unknown>>)
    .map((r) => ({ ...r, source: "agent_totp" as const }));

  // Merge + re-sort by created_at desc + trim to overall limit.
  const merged = ([...legacyTagged, ...merchantRows] as Array<Record<string, unknown>>)
    .sort((a, b) => new Date(String(b["created_at"])).getTime() - new Date(String(a["created_at"])).getTime())
    .slice(0, limit);

  const mergedPending = merged.filter((r) => r["status"] === "pending").length;

  return NextResponse.json({
    approvals: merged,
    pending_count: Math.max(count ?? 0, mergedPending),
  });
}
