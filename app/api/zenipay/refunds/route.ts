export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { validateMerchant } from "../../../../modules/zenipay/services/api-auth";

export async function POST(req: NextRequest) {
  try {
    // Auth: validate via x-merchant-id header or admin email
    const { payment_id, amount, reason, merchant_id } = await req.json();
    if (!payment_id) {
      return NextResponse.json({ error: "payment_id required" }, { status: 400 });
    }

    // Validate x-merchant-id header matches the merchant_id in body
    const authHeader = req.headers.get("x-merchant-id") || "";
    const adminEmail = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
    const isAdmin = adminEmail && ["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"].includes(adminEmail);

    if (!isAdmin) {
      if (!merchant_id) {
        return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
      }
      if (authHeader !== merchant_id) {
        return NextResponse.json({ error: "Unauthorized — x-merchant-id does not match" }, { status: 401 });
      }
      // Verify merchant exists
      const auth = await validateMerchant(req);
      if (auth instanceof NextResponse) return auth;
    }

    const supabase = getSupabaseAdmin();

    // Verify payment exists
    const paymentQuery = supabase
      .from("zenipay_payments")
      .select("*")
      .eq("id", payment_id);
    // Non-admin merchants can only refund their own payments
    if (!isAdmin && merchant_id) {
      paymentQuery.eq("merchant_id", merchant_id);
    }
    const { data: payment } = await paymentQuery.single();

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "refunded") return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    if (payment.status !== "succeeded") return NextResponse.json({ error: "Can only refund succeeded payments" }, { status: 400 });

    const refundAmount = amount ? Math.min(Number(amount), Number(payment.amount)) : Number(payment.amount);

    // Update payment status
    await supabase.from("zenipay_payments").update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    }).eq("id", payment_id);

    const resolvedMerchantId = payment.merchant_id;

    // Create ledger entry for refund
    await supabase.from("zenipay_ledger").insert({
      id: `REF-${Date.now().toString(36).toUpperCase()}`,
      payment_id,
      merchant_id: resolvedMerchantId,
      event_type: "refund",
      wallet_type: "platform",
      direction: "debit",
      amount: refundAmount,
      currency: payment.currency || "USD",
      reference: `Refund for ${payment_id}`,
      note: reason || "Customer refund",
      created_at: new Date().toISOString(),
    });

    // Update merchant balance atomically (debit = negative amount)
    if (resolvedMerchantId) {
      const { error: refundRpcErr } = await supabase.rpc("zenipay_merchant_add_stats", {
        p_merchant_id: resolvedMerchantId,
        p_balance_delta: -refundAmount,
        p_volume_delta: 0,
        p_tx_count_delta: 0,
      });
      if (refundRpcErr) console.error("[refund] merchant balance update failed:", refundRpcErr.message);
    }

    return NextResponse.json({ success: true, refund_amount: refundAmount, payment_id });
  } catch (err) {
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
