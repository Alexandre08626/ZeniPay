import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getSub, withCurrentPrice } from "@/lib/zenipay/subscriptions";
import { payWithNewCard } from "@/lib/zenipay/subscription-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Page /abonnement/<id> : 1er paiement (ou nouvelle carte d'un abonnement en retard).
// La personne doit consentir au prélèvement mensuel ; la carte arrive en jeton Finix.js (TK…), jamais en clair.
export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch {}
  const id = String(b.id || ""), token = String(b.token || "");
  if (b.consent !== true) return NextResponse.json({ error: "Tu dois accepter le prélèvement mensuel pour t'abonner." }, { status: 400 });
  if (!/^SUB-[0-9a-f-]{36}$/.test(id) || !token.startsWith("TK")) return NextResponse.json({ error: "Demande invalide" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const found = await getSub(supabase, id);
  if (!found) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  const sub = await withCurrentPrice(supabase, found);
  const r = await payWithNewCard(supabase, sub, token, b.fraud_session_id ? String(b.fraud_session_id) : undefined);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 402 });
  return NextResponse.json({ success: true, return_url: sub.return_url, current_period_end: r.sub.current_period_end, card_last4: r.sub.card_last4 });
}
