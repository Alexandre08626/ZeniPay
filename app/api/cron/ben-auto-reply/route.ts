import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { benAutoReply } from "../../../../lib/email/ben-replies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = getSupabase();

    // Check for unprocessed ZeniPay inbox messages
    const { data: pending } = await sb
      .from("agent_inbox_messages")
      .select("id, message, source, created_at")
      .in("source", ["contact-form", "email-inbound", "zenipay-contact", "zenipay-email"])
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    let replied = 0;

    for (const msg of pending || []) {
      // Extract email from message
      const emailMatch = (msg.message || "").match(/[\w.-]+@[\w.-]+\.\w+/);
      if (!emailMatch) continue;

      const email = emailMatch[0].toLowerCase();
      // Don't auto-reply to internal emails
      if (email.includes("zeniva") || email.includes("zenipay")) continue;

      try {
        await benAutoReply(email, "Your inquiry to ZeniPay");
        // Mark as processed
        await sb.from("agent_inbox_messages").update({ status: "auto_replied" }).eq("id", msg.id);
        replied++;
      } catch (err) {
        console.error("Ben auto-reply failed for", email, err);
      }
    }

    return NextResponse.json({ ok: true, replied });
  } catch (err: any) {
    console.error("Ben cron error:", err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
