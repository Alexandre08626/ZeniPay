// GET /api/v1/agents/fraud/alerts/[id]
// Returns the alert + recent anomaly_signals for its (scope, metric) +
// last 20 card_authorizations for the scope (for UI context).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../_lib/auth";
import { errorResponse, serverError } from "../../../_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);

    const db = getAgentsDb();
    const { data: alert } = await db
      .from("fraud_alerts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();
    if (!alert) return errorResponse("not_found", "alert_not_found");

    const metric = ((alert as { details: Record<string, unknown> }).details?.metric ?? null) as string | null;
    const scope_type = (alert as { scope_type: string }).scope_type;
    const scope_ref  = (alert as { scope_ref: string }).scope_ref;

    const signalsQ = db
      .from("anomaly_signals")
      .select("value, baseline, z_score, computed_at, time_window")
      .eq("organization_id", auth.organizationId)
      .eq("scope_type", scope_type)
      .eq("scope_ref", scope_ref)
      .order("computed_at", { ascending: false })
      .limit(30);
    if (metric) signalsQ.eq("metric", metric);
    const { data: signals } = await signalsQ;

    // Recent card_authorizations for context — only if the scope is a card.
    let recent_auths: unknown[] = [];
    if (scope_type === "card") {
      const { data } = await db
        .from("card_authorizations")
        .select("id, amount_cents, currency, merchant_name, merchant_category, decision, created_at")
        .eq("card_id", scope_ref)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      recent_auths = data ?? [];
    }

    return NextResponse.json({ alert, signals: signals ?? [], recent_auths });
  } catch (e) { return serverError(e); }
}
