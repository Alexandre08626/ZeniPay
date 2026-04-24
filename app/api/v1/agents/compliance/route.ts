// GET /api/v1/agents/compliance
//
// Returns the merchant's compliance checks (for the SOC2 readiness
// dashboard) + the last 10 warning/critical audit events as recent
// security events.

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
  if (!mapping?.merchant_id) return NextResponse.json({ checks: [], recent_events: [], score: 0, total: 0 });

  const { data: checks } = await db
    .from("zenipay_compliance_checks")
    .select("*")
    .eq("merchant_id", mapping.merchant_id)
    .order("check_type", { ascending: true });

  const { data: events } = await db
    .from("zenipay_audit_log")
    .select("id, action, severity, resource_type, resource_id, created_at, actor_type, actor_email")
    .eq("merchant_id", mapping.merchant_id)
    .in("severity", ["warning", "critical"])
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (checks ?? []) as Array<{ status: string }>;
  const total = rows.length;
  const passing = rows.filter((c) => c.status === "pass").length;

  return NextResponse.json({
    checks: checks ?? [],
    recent_events: events ?? [],
    score: passing,
    total,
  });
}
