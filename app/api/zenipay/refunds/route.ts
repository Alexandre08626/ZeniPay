export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function POST(req: NextRequest) {
  try {
    const { payment_id, amount, reason, merchant_id } = await req.json();
    if (!payment_id || !merchant_id) {
      return NextResponse.json({ error: "payment_id and merchant_id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify payment exists and belongs to merchant
    const { data: payment } = await supabase
      .from("zenipay_payments")
      .select("*")
      .eq("id", payment_id)
      .eq("merchant_id", merchant_id)
      .single();

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status === "refunded") return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    if (payment.status !== "succeeded") return NextResponse.json({ error: "Can only refund succeeded payments" }, { status: 400 });

    const refundAmount = amount ? Math.min(Number(amount), Number(payment.amount)) : Number(payment.amount);

    // Update payment status
    await supabase.from("zenipay_payments").update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    }).eq("id", payment_id);

    // Create ledger entry for refund
    await supabase.from("zenipay_ledger").insert({
      id: `REF-${Date.now().toString(36).toUpperCase()}`,
      payment_id,
      merchant_id,
      event_type: "refund",
      wallet_type: "platform",
      direction: "debit",
      amount: refundAmount,
      currency: payment.currency || "USD",
      reference: `Refund for ${payment_id}`,
      note: reason || "Customer refund",
      created_at: new Date().toISOString(),
    });

    // Update merchant balance
    const { data: merchant } = await supabase.from("zenipay_merchants").select("balance").eq("id", merchant_id).single();
    if (merchant) {
      await supabase.from("zenipay_merchants").update({
        balance: Math.max(0, Number(merchant.balance) - refundAmount),
        updated_at: new Date().toISOString(),
      }).eq("id", merchant_id);
    }

    return NextResponse.json({ success: true, refund_amount: refundAmount, payment_id });
  } catch (err) {
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
