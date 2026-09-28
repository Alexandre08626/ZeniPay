export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// ONE-SHOT (2026-09-28), second attempt: move the Zenitech merchant's login
// email from info@zenitech.dev to zenitech@zeniva.ca (Alexandre's request)
// and report exactly what the database returns. Token-protected, hard-coded
// to this one account. Remove after use.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, pgrest } from "@/modules/zenipay/services/supabase";
import { requestPasswordReset } from "@/lib/zenipay/password-reset";

const MERCHANT_ID = "745294d8-d0a1-4cc6-ba27-a5974afdff8d";
const FROM = "info@zenitech.dev";
const TO = "zenitech@zeniva.ca";

async function readRow() {
  const rows = (await pgrest(`zenipay_merchants?id=eq.${MERCHANT_ID}&select=id,email,config`)) as any[];
  const r = rows?.[0];
  return r ? { email: r.email, cfg_email: r.config?.email, previous_email: r.config?.previous_email, has_reset: !!r.config?.pw_reset } : null;
}

export async function POST(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const db = getSupabaseAdmin();
  const before = await readRow();
  if (!before) return NextResponse.json({ error: "merchant not found", before }, { status: 404 });
  if (![FROM, TO].includes(String(before.email || "").toLowerCase())) return NextResponse.json({ error: "unexpected email", before }, { status: 409 });

  const rows = (await pgrest(`zenipay_merchants?id=eq.${MERCHANT_ID}&select=config`)) as any[];
  const cfg = (rows?.[0]?.config || {}) as Record<string, unknown>;
  const upd = await db.from("zenipay_merchants")
    .update({ email: TO, config: { ...cfg, email: TO, previous_email: FROM } })
    .eq("id", MERCHANT_ID)
    .select("id, email");
  const after = await readRow();

  let reset: string = "skipped";
  if (String(after?.email || "").toLowerCase() === TO) {
    try { await requestPasswordReset(db, TO, process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca"); reset = "sent"; }
    catch (e) { reset = `error: ${e instanceof Error ? e.message : String(e)}`; }
  }
  const afterReset = await readRow();
  return NextResponse.json({
    before,
    update: { error: upd.error, status: upd.status, rows: upd.data },
    after,
    reset,
    afterReset,
  });
}
