export const dynamic = "force-dynamic";

// ONE-SHOT (2026-09-28): move the Zenitech merchant's login email from
// info@zenitech.dev (mailbox not accessible) to zenitech@zeniva.ca, at
// Alexandre's request, then send the password-reset link there.
// Hard-coded to this single account and transition; token-protected.
// Remove this route right after it has run.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requestPasswordReset } from "@/lib/zenipay/password-reset";

const MERCHANT_ID = "745294d8-d0a1-4cc6-ba27-a5974afdff8d";
const FROM = "info@zenitech.dev";
const TO = "zenitech@zeniva.ca";

export async function POST(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const db = getSupabaseAdmin();
  const { data: all } = await db.from("zenipay_merchants").select("id, email, config");
  const taken = (all || []).find((m: any) => m.id !== MERCHANT_ID &&
    [String(m.email || ""), String(m.config?.email || "")].some((e) => e.toLowerCase() === TO));
  if (taken) return NextResponse.json({ error: `${TO} is already used by another account` }, { status: 409 });

  const m = (all || []).find((r: any) => r.id === MERCHANT_ID);
  if (!m) return NextResponse.json({ error: "merchant not found" }, { status: 404 });
  const current = String(m.email || "").toLowerCase();
  if (current !== FROM && current !== TO) return NextResponse.json({ error: `unexpected current email: ${current}` }, { status: 409 });

  const cfg = (m.config || {}) as Record<string, unknown>;
  const { error } = await db.from("zenipay_merchants")
    .update({ email: TO, config: { ...cfg, email: TO, previous_email: FROM } })
    .eq("id", MERCHANT_ID);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await requestPasswordReset(db, TO, process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca");
  return NextResponse.json({ ok: true, merchant: MERCHANT_ID, email: TO, reset_sent: true });
}
