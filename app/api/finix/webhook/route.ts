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
 * POST /api/finix/webhook — General Finix webhook handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.type || body.event_type || "unknown";
    console.log("[finix/webhook] Event:", eventType);

    const supabase = getSupabase();
    await supabase.from("finix_webhook_events").insert({
      event_type: eventType,
      entity_id: body.entity?.id || body.id || null,
      raw_payload: body,
      created_at: new Date().toISOString(),
    });

    if (eventType.includes("dispute")) {
      const disputeUrl = new URL("/api/finix/dispute", req.url);
      await fetch(disputeUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    return NextResponse.json({ received: true, event_type: eventType });
  } catch (err) {
    console.error("[finix/webhook] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
