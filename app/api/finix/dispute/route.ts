export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/finix/config";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/finix/dispute — Webhook handler for Finix dispute events
 * In sandbox, creating a transfer for $8,888.88 (888888 cents) auto-creates a dispute.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.type || body.event_type || "unknown";
    console.log("[finix/dispute] Received event:", eventType, JSON.stringify(body).slice(0, 500));

    const dispute = body._embedded?.disputes?.[0] || body.entity || body;

    const supabase = getSupabase();
    const { error } = await supabase.from("finix_dispute_logs").insert({
      event_type: eventType,
      dispute_id: dispute.id || null,
      transfer_id: dispute.transfer || null,
      state: dispute.state || null,
      reason: dispute.reason || null,
      amount_cents: dispute.amount || null,
      respond_by: dispute.respond_by || null,
      raw_payload: body,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("[finix/dispute] Supabase log error:", error.message);

    return NextResponse.json({ received: true, event_type: eventType, dispute_id: dispute.id || null });
  } catch (err) {
    console.error("[finix/dispute] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
