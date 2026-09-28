export const dynamic = "force-dynamic";

// ONE-SHOT (2026-09-28): move the ZeniCorp merchant's login email from
// info@zenicorp.ca to zenicorp@zeniva.ca (Alexandre's request) and send the
// password-reset link there. Hard-coded to this account; token-protected.
// Remove right after use.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, pgrest } from "@/modules/zenipay/services/supabase";
import { requestPasswordReset } from "@/lib/zenipay/password-reset";

const MERCHANT_ID = "44e58231-170a-4904-b94f-eb3c791af4f3";
const FROM = "info@zenicorp.ca";
const TO = "zenicorp@zeniva.ca";

export async function POST(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const db = getSupabaseAdmin();
  const all = (await pgrest("zenipay_merchants?select=id,email,config")) as any[];
  const taken = all.find((m) => m.id !== MERCHANT_ID &&
    [String(m.email || ""), String(m.config?.email || "")].some((e) => e.toLowerCase() === TO));
  if (taken) return NextResponse.json({ error: `${TO} already used by another account` }, { status: 409 });
  const m = all.find((r) => r.id === MERCHANT_ID);
  if (!m) return NextResponse.json({ error: "merchant not found" }, { status: 404 });
  const current = String(m.email || "").toLowerCase();
  if (current !== FROM && current !== TO) return NextResponse.json({ error: `unexpected current email: ${current}` }, { status: 409 });

  const { pw_reset: _old, ...cfg } = (m.config || {}) as Record<string, unknown>; // invalidate the link sent to the old address
  const upd = await db.from("zenipay_merchants")
    .update({ email: TO, config: { ...cfg, email: TO, previous_email: FROM } })
    .eq("id", MERCHANT_ID).select("id, email");
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  await requestPasswordReset(db, TO, process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca");
  const after = ((await pgrest(`zenipay_merchants?id=eq.${MERCHANT_ID}&select=email,config`)) as any[])[0];
  return NextResponse.json({ ok: true, email: after?.email, reset_pending: !!after?.config?.pw_reset });
}
