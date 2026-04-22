// GET /api/v1/agents/fraud/alerts
// Filters: status, severity, scope_type, since, until (all optional)
// Returns the most recent 200 rows matching.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "../../_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const scope_type = searchParams.get("scope_type");
    const since = searchParams.get("since");
    const until = searchParams.get("until");

    const db = getAgentsDb();
    let q = db
      .from("fraud_alerts")
      .select("id, organization_id, scope_type, scope_ref, alert_type, severity, details, status, auto_action_taken, card_id, resolved_by, resolved_at, created_at, updated_at")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (status)     q = q.eq("status", status);
    if (severity)   q = q.eq("severity", severity);
    if (scope_type) q = q.eq("scope_type", scope_type);
    if (since)      q = q.gte("created_at", since);
    if (until)      q = q.lte("created_at", until);

    const { data, error } = await q;
    if (error) return errorResponse("server_error", error.message);
    const alerts = (data ?? []) as Array<{ status: string; severity: string }>;
    const counts = {
      total: alerts.length,
      by_status: bucket(alerts, (a) => a.status),
      by_severity: bucket(alerts, (a) => a.severity),
    };
    return NextResponse.json({ alerts: data ?? [], counts });
  } catch (e) { return serverError(e); }
}

function bucket<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
