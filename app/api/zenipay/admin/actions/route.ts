export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, merchant_id, ...params } = body;
    if (!action || !merchant_id) return NextResponse.json({ error: "action and merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    if (action === "suspend") {
      const { error } = await supabase.from("zenipay_merchants").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("id", merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, status: "suspended" });
    }

    if (action === "activate") {
      const { error } = await supabase.from("zenipay_merchants").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, status: "active" });
    }

    if (action === "upgrade_plan") {
      const plan = params.plan || "Business";
      const { error } = await supabase.from("zenipay_merchants").update({ plan, updated_at: new Date().toISOString() }).eq("id", merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Also update merchant_data JSONB
      const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchant_id).single();
      if (m) {
        const md = { ...(m.merchant_data || {}), plan };
        await supabase.from("zenipay_merchants").update({ merchant_data: md }).eq("id", merchant_id);
      }
      return NextResponse.json({ success: true, plan });
    }

    if (action === "send_payout") {
      const { amount, method, note } = params;
      if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      const payoutId = `PO-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("zenipay_payouts").insert({
        id: payoutId, merchant_id, amount: Number(amount), currency: "USD",
        status: "processing", destination_type: method || "ach", method: method || "ach",
        recipient_name: params.recipient_name || "", notes: note || "Admin payout",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Debit merchant balance
      const { data: merchant } = await supabase.from("zenipay_merchants").select("balance").eq("id", merchant_id).single();
      if (merchant) {
        await supabase.from("zenipay_merchants").update({
          balance: Math.max(0, Number(merchant.balance) - Number(amount)),
          updated_at: new Date().toISOString(),
        }).eq("id", merchant_id);
      }
      return NextResponse.json({ success: true, payout_id: payoutId });
    }

    if (action === "save_settings") {
      // Save admin platform settings to a special merchant_data key
      const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", "zeniva-001").single();
      const md = { ...(m?.merchant_data || {}), admin_settings: params.settings };
      await supabase.from("zenipay_merchants").update({ merchant_data: md }).eq("id", "zeniva-001");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
