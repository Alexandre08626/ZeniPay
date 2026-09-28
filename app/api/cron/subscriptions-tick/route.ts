import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { tick } from "@/lib/zenipay/subscription-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tous les jours : prélèvements mensuels des abonnements, relances, fins d'abonnement, avis à Orvel.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const out = await tick(getSupabaseAdmin());
    console.log("[subscriptions-tick]", out);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    console.error("[subscriptions-tick] failed", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "tick failed" }, { status: 500 });
  }
}
