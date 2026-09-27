export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
export async function POST(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const { step, data } = await req.json();
    const merchant_id = session.merchant_id;
    if (!merchant_id || !step) return NextResponse.json({ error: "merchant_id and step required" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchant_id).single();
    const md = m?.merchant_data || {};
    const updated = { ...md, ["setup_" + step]: data };
    const top: Record<string, unknown> = { merchant_data: updated, updated_at: new Date().toISOString() };
    if (step === "business" && data) { if (data.business_name) top.business_name = data.business_name; if (data.phone) top.phone = data.phone; if (data.website) top.website = data.website; if (data.business_type) top.business_type = data.business_type; if (data.country) top.country = data.country; }
    await supabase.from("zenipay_merchants").update(top).eq("id", merchant_id);
    return NextResponse.json({ ok: true, step });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
