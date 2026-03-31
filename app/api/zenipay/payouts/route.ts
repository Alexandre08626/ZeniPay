export const dynamic = "force-dynamic";

/**
 * ZeniPay Payouts API
 *
 * GET  — list payouts from DB
 * POST — execute a payout (validates balance, creates ledger entry, records in DB)
 */

import { NextResponse } from "next/server";
import { getWalletBalances, recordPayoutExecution, writeAuditLog, checkIdempotency, saveIdempotency } from "../../../../modules/zenipay/services/ledger";
import type { WalletType } from "../../../../modules/zenipay/database/schema";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

// ── GET: list payouts ──────────────────────────────────────────────────────
export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("zenipay_payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ payouts: [], error: error.message });
  return Response.json({ payouts: data || [] });
}

// ── POST: execute a payout ─────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recipient_type,
      recipient_name,
      recipient_id,
      amount,
      currency = "USD",
      method = "ach",
      from_wallet = "platform",
      reference,
      note,
      idempotency_key,
    } = body;

    // Validate required fields
    if (!recipient_name || !amount || !from_wallet) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: "Invalid payout amount" }, { status: 400 });
    }

    // ── Idempotency ──────────────────────────────────────────────────────
    const idemKey = idempotency_key || `payout_${from_wallet}_${recipient_name}_${amount}_${Date.now()}`;
    const cached = await checkIdempotency(idemKey);
    if (cached) return Response.json({ ...cached, idempotent_replay: true });

    // ── Balance check — CRITICAL: cannot payout more than available ────────
    // Use merchant balance as source of truth (stays in sync with payments + payouts)
    const supabaseCheck = getSupabaseAdmin();
    const merchant_id_check = body.merchant_id;
    if (!merchant_id_check) return NextResponse.json({ error: "merchant_id is required" }, { status: 400 });
    let availableBalance = 0;
    const { data: mCheck } = await supabaseCheck
      .from("zenipay_merchants")
      .select("balance")
      .eq("id", merchant_id_check)
      .single();
    availableBalance = Number(mCheck?.balance) || 0;
    // Fallback to ledger if merchant balance is 0
    if (availableBalance === 0) {
      const wallets = await getWalletBalances();
      const walletBalance = wallets[from_wallet as WalletType];
      availableBalance = walletBalance?.available || 0;
    }

    if (availableBalance < parsedAmount) {
      return Response.json({
        error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
        available: availableBalance,
      }, { status: 422 });
    }

    // ── Create payout record ─────────────────────────────────────────────
    const payoutId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const supabase = getSupabaseAdmin();

    await supabase.from("zenipay_payouts").insert({
      id: payoutId,
      idempotency_key: idemKey,
      recipient_type: recipient_type || "other",
      recipient_id: recipient_id,
      recipient_name,
      from_wallet,
      amount: parsedAmount,
      currency,
      method,
      status: "processing",
      reference,
      note,
      created_at: new Date().toISOString(),
    });

    // ── Write ledger debit (reduces Platform Wallet) ──────────────────────
    await recordPayoutExecution({
      payoutId,
      fromWallet: from_wallet as WalletType,
      amount: parsedAmount,
      currency,
      recipientName: recipient_name,
      reference: reference || payoutId,
    });

    // ── Mark payout as paid ───────────────────────────────────────────────
    await supabase.from("zenipay_payouts").update({
      status: "paid",
      executed_at: new Date().toISOString(),
    }).eq("id", payoutId);

    // ── Decrement merchant balance to stay in sync ────────────────────
    const merchant_id = body.merchant_id;
    const { data: merchant } = await supabase
      .from("zenipay_merchants")
      .select("balance")
      .eq("id", merchant_id)
      .single();
    if (merchant) {
      await supabase.from("zenipay_merchants").update({
        balance: Math.max(0, (Number(merchant.balance) || 0) - parsedAmount),
        updated_at: new Date().toISOString(),
      }).eq("id", merchant_id);
    }

    // ── Audit log ────────────────────────────────────────────────────────
    await writeAuditLog({
      action: "payout_executed",
      entityType: "payout",
      entityId: payoutId,
      changes: { amount: parsedAmount, currency, recipient: recipient_name, from_wallet },
    });

    const result = {
      success: true,
      payout_id: payoutId,
      amount: parsedAmount,
      currency,
      recipient: recipient_name,
      method,
      status: "paid",
      message: `$${parsedAmount.toFixed(2)} sent to ${recipient_name}`,
    };

    await saveIdempotency(idemKey, "payout", result as Record<string, unknown>);

    return Response.json(result);

  } catch (err) {
    console.error("[ZeniPay Payouts] Error:", err);
    return Response.json({ error: "Payout execution failed" }, { status: 500 });
  }
}
