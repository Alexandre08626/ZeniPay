import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { verifyBody, newSubscription, insertSub, listSubs, orvelMerchantId, ORVEL_PLANS } from "@/lib/zenipay/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Orvel (requête signée) ouvre un abonnement pour un de ses comptes → lien vers la page de paiement.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyBody(req.headers.get("x-orvel-signature"), raw)) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  if (!orvelMerchantId()) return NextResponse.json({ error: "Abonnements non configurés (ORVEL_MERCHANT_ID)" }, { status: 503 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const plan = String(b.plan || "") as "plus" | "pro";
  const email = String(b.email || "").trim().toLowerCase();
  const returnUrl = String(b.return_url || "");
  if (b.product !== "orvel" || !(plan in ORVEL_PLANS)) return NextResponse.json({ error: "Forfait inconnu" }, { status: 400 });
  if (!b.external_ref || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return NextResponse.json({ error: "Compte ou courriel manquant" }, { status: 400 });
  if (!returnUrl.startsWith("https://orvel.zenitech.dev/")) return NextResponse.json({ error: "Adresse de retour refusée" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const subs = await listSubs(supabase);
  const ref = String(b.external_ref);
  if (subs.some((s) => s.external_ref === ref && s.status === "active" && !s.cancel_at_period_end)) {
    return NextResponse.json({ error: "Ce compte a déjà un abonnement actif." }, { status: 409 });
  }
  // Même demande dans l'heure : on réutilise la page déjà ouverte.
  const recent = subs.find((s) => s.external_ref === ref && s.plan === plan && s.status === "incomplete"
    && Date.now() - new Date(s.created_at).getTime() < 3_600_000 && s.activation_attempts === 0);
  const sub = recent || newSubscription({ plan, external_ref: ref, email, name: String(b.name || "").slice(0, 80), return_url: returnUrl });
  if (!recent) await insertSub(supabase, sub);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
  return NextResponse.json({ id: sub.id, url: `${base}/abonnement/${sub.id}` });
}
