// GET /api/v1/agents/audit-log
//
// Scopes to the caller org's merchant via zenipay_merchant_agent_org_map.
// Query params: severity, actor_type, action, since, until, limit.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const db = getSupabaseAdmin();
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!mapping?.merchant_id) return NextResponse.json({ events: [] });

  const sp = req.nextUrl.searchParams;
  const severity = sp.get("severity");
  const actorType = sp.get("actor_type");
  const action = sp.get("action");
  const since = sp.get("since");
  const until = sp.get("until");
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? "100") || 100, 1), 500);

  let q = db.from("zenipay_audit_log")
    .select("*")
    .eq("merchant_id", mapping.merchant_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (severity)  q = q.eq("severity", severity);
  if (actorType) q = q.eq("actor_type", actorType);
  if (action)    q = q.eq("action", action);
  if (since)     q = q.gte("created_at", since);
  if (until)     q = q.lte("created_at", until);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = await db.from("zenipay_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", mapping.merchant_id);
  const critical = await db.from("zenipay_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", mapping.merchant_id)
    .eq("severity", "critical");

  return NextResponse.json({
    events: data ?? [],
    total_count: totals.count ?? 0,
    critical_count: critical.count ?? 0,
  });
}
