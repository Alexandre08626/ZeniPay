// POST /api/v1/agents/fraud/alerts/[id]/ack
// Moves status open → investigating. Idempotent. Records ack actor in
// the audit log. Does NOT take any card action (that's resolve/confirmed_fraud).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../_lib/auth";
import { errorResponse, serverError } from "../../../../_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);

    const db = getAgentsDb();
    const { data: existing } = await db
      .from("fraud_alerts").select("id, status")
      .eq("id", id).eq("organization_id", auth.organizationId)
      .maybeSingle();
    if (!existing) return errorResponse("not_found", "alert_not_found");

    const current = (existing as { status: string }).status;
    if (current !== "open" && current !== "investigating") {
      return errorResponse("unprocessable", `cannot ack from status=${current}`);
    }

    const { data, error } = await db
      .from("fraud_alerts")
      .update({ status: "investigating" })
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select().maybeSingle();
    if (error) return errorResponse("server_error", error.message);

    await logEvent({
      organizationId: auth.organizationId,
      actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "fraud_alert.acked",
      payload: { alert_id: id },
    });
    return NextResponse.json({ alert: data });
  } catch (e) { return serverError(e); }
}
