import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getSub, ORVEL_PLANS } from "@/lib/zenipay/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ce que la page /abonnement/<id> affiche (aucune donnée de carte, courriel masqué).
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^SUB-[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  const sub = await getSub(getSupabaseAdmin(), id);
  if (!sub) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  const [u, d] = sub.customer_email.split("@");
  return NextResponse.json({
    id: sub.id, plan: sub.plan, plan_nom: ORVEL_PLANS[sub.plan].nom, status: sub.status,
    amount: sub.amount, tps: sub.tps, tvq: sub.tvq, total: sub.total, currency: sub.currency,
    name: sub.customer_name, email: `${u.slice(0, 2)}•••@${d}`, card_last4: sub.card_last4,
    current_period_end: sub.current_period_end, return_url: sub.return_url,
    locked: sub.activation_attempts >= 5,
  }, { headers: { "cache-control": "no-store" } });
}
