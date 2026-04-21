// POST /api/v1/agents/org-wallet/topup
//   Body: { amount_cents, note? }
//   Adds funds to the org's master wallet. Phase 1: demo-level — no real
//   money moves. Phase 2 will replace with a Finix charge + webhook.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount_cents);
  const note: string | null = body?.note ?? null;

  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount_cents must be a positive integer" }, { status: 400 });
  }

  const db = getAgentsDb();
  const { data, error } = await db.rpc("top_up_org_wallet", {
    p_organization_id: auth.organizationId,
    p_amount_cents: amount,
    p_note: note,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : data;
  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "org_wallet.topped_up",
    payload: { amount_cents: amount, transfer_id: row?.transfer_id },
  });

  return NextResponse.json({
    transfer_id: row?.transfer_id,
    org_balance_cents: row?.org_balance_cents,
  });
}
