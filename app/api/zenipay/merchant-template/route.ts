export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  try {
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");
    if (!merchant_id) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("merchant_invoice_templates")
      .select("*")
      .eq("merchant_id", merchant_id)
      .single();

    if (!data) {
      return NextResponse.json({
        template: {
          merchant_id,
          logo_url: "",
          brand_color: "#15B8C9",
          accent_color: "#2DBE60",
          footer_text: "Powered by ZeniPay · zenipay.ca",
          terms_text: "",
          quote_validity_days: 30,
          show_logo: true,
          show_brand_color: true,
        },
      });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("[Merchant Template]", err);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, ...fields } = body;

    if (!merchant_id) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const payload = {
      ...fields,
      merchant_id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("merchant_invoice_templates")
      .upsert(payload, { onConflict: "merchant_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Merchant Template PUT]", err);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
