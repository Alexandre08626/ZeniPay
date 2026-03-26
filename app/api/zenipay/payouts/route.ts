export const dynamic = "force-dynamic";

/**
 * ZeniPay Payouts API
 *
 * GET  — list payouts from DB
 * POST — execute a payout (validates balance, creates ledger entry, records in DB)
 */

import { createClient } from "@supabase/supabase-js";
import { getWalletBalances, recordPayoutExecution, writeAuditLog, checkIdempotency, saveIdempotency } from "../../../../modules/zenipay/services/ledger";
import type { WalletType } from "../../../../modules/zenipay/database/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkdX9RdJPGYV_ZJBeG7DD4";
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── GET: list payouts ──────────────────────────────────────────────────────
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return Response.json({ payouts: [] });

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
    const wallets = await getWalletBalances();
    const walletBalance = wallets[from_wallet as WalletType];

    if (!walletBalance || walletBalance.available < parsedAmount) {
      return Response.json({
        error: `Insufficient balance. Available: $${walletBalance?.available?.toFixed(2) || "0.00"}`,
        available: walletBalance?.available || 0,
      }, { status: 422 });
    }

    // ── Create payout record ─────────────────────────────────────────────
    const payoutId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const supabase = getSupabase();

    if (supabase) {
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
    }

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
    if (supabase) {
      await supabase.from("zenipay_payouts").update({
        status: "paid",
        executed_at: new Date().toISOString(),
      }).eq("id", payoutId);
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
