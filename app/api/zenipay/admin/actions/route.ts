export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

export async function POST(req: NextRequest) {
  try {
    // Auth: require valid admin email in x-admin-email header
    const adminEmail = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
    if (!adminEmail || !ADMIN_EMAILS.has(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized — admin access required" }, { status: 401 });
    }

    const body = await req.json();
    const { action, merchant_id, ...params } = body;
    if (!action || !merchant_id) return NextResponse.json({ error: "action and merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Verify target merchant exists before performing any action
    if (action !== "save_settings") {
      const { data: target } = await supabase.from("zenipay_merchants").select("id").eq("id", merchant_id).single();
      if (!target) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

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
      // Debit merchant balance atomically
      const { error: rpcError } = await supabase.rpc("zenipay_merchant_add_stats", {
        p_merchant_id: merchant_id,
        p_balance_delta: -Number(amount),
        p_volume_delta: 0,
        p_tx_count_delta: 0,
      });
      if (rpcError) console.error("[admin/actions] balance debit failed:", rpcError.message);
      return NextResponse.json({ success: true, payout_id: payoutId });
    }

    if (action === "save_settings") {
      // Save admin platform settings to a special merchant_data key
      const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", "zeniva-001").single();
      const md = { ...(m?.merchant_data || {}), admin_settings: params.settings };
      await supabase.from("zenipay_merchants").update({ merchant_data: md }).eq("id", "zeniva-001");
      return NextResponse.json({ success: true });
    }

    if (action === "approve_merchant") {
      const { error } = await supabase.from("zenipay_merchants").update({
        onboarding_state: "approved",
        updated_at: new Date().toISOString()
      }).eq("id", merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Also update merchant_data to mark as reviewed
      const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchant_id).single();
      if (m) {
        const md = { ...(m.merchant_data || {}), pending_review: false, approved_at: new Date().toISOString(), approved_by: "admin" };
        await supabase.from("zenipay_merchants").update({ merchant_data: md }).eq("id", merchant_id);
      }
      return NextResponse.json({ success: true, onboarding_state: "approved" });
    }

    if (action === "reject_merchant") {
      const reason = params.reason || "Application not approved";
      const { error } = await supabase.from("zenipay_merchants").update({
        onboarding_state: "rejected",
        updated_at: new Date().toISOString()
      }).eq("id", merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchant_id).single();
      if (m) {
        const md = { ...(m.merchant_data || {}), pending_review: false, rejected_at: new Date().toISOString(), rejection_reason: reason };
        await supabase.from("zenipay_merchants").update({ merchant_data: md }).eq("id", merchant_id);
      }
      return NextResponse.json({ success: true, onboarding_state: "rejected" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
