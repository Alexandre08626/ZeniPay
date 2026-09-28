import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { verifyBody, getSub } from "@/lib/zenipay/subscriptions";
import { cancel } from "@/lib/zenipay/subscription-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Orvel (requête signée) annule l'abonnement d'un de ses comptes : fin à l'échéance, sans autre prélèvement.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyBody(req.headers.get("x-orvel-signature"), raw)) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const supabase = getSupabaseAdmin();
  const sub = await getSub(supabase, String(b.id || ""));
  if (!sub || sub.external_ref !== String(b.external_ref || "")) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  const next = await cancel(supabase, sub);
  return NextResponse.json({ ok: true, status: next.status, current_period_end: next.current_period_end });
}
