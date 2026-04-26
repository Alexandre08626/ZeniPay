export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

// GET — load compliance data for a merchant
export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchant_id = r;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("zenipay_compliance")
    .select("*")
    .eq("merchant_id", merchant_id)
    .single();

  if (!data) {
    // Auto-create default row
    const defaults = {
      merchant_id,
      kyc_status: "pending",
      pci_status: "non_compliant",
      finix_onboarding: "PROVISIONING",
      saq_completed: false,
      saq_answers: {},
      refund_policy_days: 30,
      chargeback_alert_threshold: 1.0,
      chargeback_alert_email: "",
      documents: [],
      updated_at: new Date().toISOString(),
    };
    await supabase.from("zenipay_compliance").insert(defaults);
    return NextResponse.json({ compliance: defaults });
  }

  return NextResponse.json({ compliance: data });
}

// PUT — update compliance data
export async function PUT(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json();
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchant_id = r;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { merchant_id: _drop, ...updates } = body;

  const supabase = getSupabaseAdmin();
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("zenipay_compliance")
    .upsert({ merchant_id, ...updates }, { onConflict: "merchant_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
