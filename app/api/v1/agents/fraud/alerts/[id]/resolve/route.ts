// POST /api/v1/agents/fraud/alerts/[id]/resolve
// Body: { resolution: 'false_positive'|'confirmed_fraud'|'legitimate_anomaly', note? }
//
// Decision (DECISION 4): on 'confirmed_fraud', if the alert's scope is a
// card OR if a card_id is supplied in the body, set that card's status to
// 'paused' atomically. Never cancels (cancel is a separate explicit user
// action with intent).
//
// The route does NOT call the Stripe Issuing provider here — the UI card
// detail page already exposes /pause which fires the provider call. This
// route only flips the agents.issued_cards.status so the dashboard
// reflects the fraud-driven freeze immediately; an out-of-band reconcile
// syncs the provider side (or the operator can trigger it from the card
// page).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../_lib/auth";
import { errorResponse, serverError } from "../../../../_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const VALID = ["false_positive", "confirmed_fraud", "legitimate_anomaly"] as const;
type Resolution = typeof VALID[number];

const RESOLUTION_TO_STATUS: Record<Resolution, "dismissed" | "confirmed_fraud"> = {
  false_positive: "dismissed",
  legitimate_anomaly: "dismissed",
  confirmed_fraud: "confirmed_fraud",
};

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);
    const body = await req.json().catch(() => ({}));
    const resolution = String(body?.resolution ?? "") as Resolution;
    if (!VALID.includes(resolution)) {
      return errorResponse("bad_request", `resolution must be one of ${VALID.join(", ")}`);
    }
    const note = body?.note ? String(body.note) : null;
    const explicitCardId = body?.card_id ? String(body.card_id) : null;

    const db = getAgentsDb();
    const { data: alert } = await db
      .from("fraud_alerts").select("*")
      .eq("id", id).eq("organization_id", auth.organizationId)
      .maybeSingle();
    if (!alert) return errorResponse("not_found", "alert_not_found");

    const current = (alert as { status: string }).status;
    if (current === "dismissed" || current === "confirmed_fraud") {
      return errorResponse("unprocessable", `alert already resolved (status=${current})`);
    }

    // Decide the card to pause, if any.
    const scopeType = (alert as { scope_type: string }).scope_type;
    const scopeRef = (alert as { scope_ref: string }).scope_ref;
    const cardIdToPause =
      resolution === "confirmed_fraud"
        ? (explicitCardId ?? (scopeType === "card" ? scopeRef : null))
        : null;

    // Flip the alert row first.
    const patch: Record<string, unknown> = {
      status: RESOLUTION_TO_STATUS[resolution],
      resolved_by: auth.userId ?? null,
      resolved_at: new Date().toISOString(),
    };
    if (cardIdToPause) {
      patch.auto_action_taken = "paused_card";
      patch.card_id = cardIdToPause;
    }
    if (note) {
      // Merge note into details JSONB without clobbering.
      const current = (alert as { details: Record<string, unknown> }).details ?? {};
      patch.details = { ...current, resolution, resolution_note: note };
    } else {
      const current = (alert as { details: Record<string, unknown> }).details ?? {};
      patch.details = { ...current, resolution };
    }

    const { data: updatedAlert, error: aerr } = await db
      .from("fraud_alerts").update(patch)
      .eq("id", id).eq("organization_id", auth.organizationId)
      .select().maybeSingle();
    if (aerr) return errorResponse("server_error", aerr.message);

    // Atomically pause the card if required.
    let pausedCard: unknown = null;
    if (cardIdToPause) {
      const { data: cardRow, error: cerr } = await db
        .from("issued_cards")
        .update({ status: "paused" })
        .eq("id", cardIdToPause)
        .eq("organization_id", auth.organizationId)
        .is("deleted_at", null)
        .in("status", ["active", "paused"])   // refuse to pause a canceled card
        .select("id, status").maybeSingle();
      if (cerr) return errorResponse("server_error", `card pause failed: ${cerr.message}`);
      pausedCard = cardRow;

      await logEvent({
        organizationId: auth.organizationId,
        actorType: "user",
        actorId: auth.userId ?? null,
        eventType: "card.paused_due_to_fraud_alert",
        payload: { alert_id: id, card_id: cardIdToPause, resolution },
      });
    }

    await logEvent({
      organizationId: auth.organizationId,
      actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "fraud_alert.resolved",
      payload: { alert_id: id, resolution, note, card_id_paused: cardIdToPause },
    });
    return NextResponse.json({ alert: updatedAlert, paused_card: pausedCard });
  } catch (e) { return serverError(e); }
}
