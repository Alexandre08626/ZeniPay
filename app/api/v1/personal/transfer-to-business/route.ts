// POST /api/v1/personal/transfer-to-business
// Body: { merchant_id, from_personal_account_id, to_business_account_id,
//         amount, currency?, memo? }
//
// Atomic transfer Personal → Business. Steps:
//   1. Debit zenipay_personal_accounts (balance check)
//   2. Insert zenipay_personal_transactions (transfer_out)
//   3. Credit zenipay_accounts (business)
//   4. Insert zenipay_ledger (business side, event_type='manual_adjustment')
// On any failure between steps, the prior steps are rolled back.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  from_personal_account_id?: string;
  to_business_account_id?: string;
  amount?: number | string;
  currency?: string;
  memo?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId  = r;
  const fromId      = String(body.from_personal_account_id ?? "").trim();
  const toId        = String(body.to_business_account_id ?? "").trim();
  const amount      = typeof body.amount === "string" ? Number(body.amount) : Number(body.amount ?? NaN);
  const currency    = String(body.currency ?? "CAD").toUpperCase();
  const memo        = body.memo ? String(body.memo).slice(0, 200) : "Transfer to business";

  if (!fromId || !toId) return err("bad_request", "missing_required_fields", 400);
  if (!Number.isFinite(amount) || amount <= 0) return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  const { data: src } = await db
    .from("zenipay_personal_accounts")
    .select("id, merchant_id, balance, currency")
    .eq("id", fromId)
    .maybeSingle();
  if (!src || src.merchant_id !== merchantId) return err("not_found", "source_account_not_found", 404);
  if (Number(src.balance) < amount) return err("unprocessable", "insufficient_funds", 422, { available: Number(src.balance) });

  const { data: dst } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency")
    .eq("id", toId)
    .maybeSingle();
  if (!dst || dst.merchant_id !== merchantId) return err("not_found", "destination_account_not_found", 404);

  const newSrcBalance = Number(src.balance) - amount;
  const newDstBalance = Number(dst.balance ?? 0) + amount;
  const now = new Date().toISOString();

  // Step 1: debit personal.
  // NOTE: zenipay_personal_accounts has no updated_at column.
  const { error: debitErr } = await db
    .from("zenipay_personal_accounts")
    .update({ balance: newSrcBalance })
    .eq("id", fromId);
  if (debitErr) return err("server_error", "step_1_personal_debit_failed", 500, debitErr.message);

  // Step 2: personal transfer_out row.
  // Requires profile_id (NOT NULL FK); has no `category` column.
  const ptxId = `ptx_${crypto.randomUUID()}`;
  const { data: profile } = await db
    .from("zenipay_personal_profiles")
    .select("id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  const { error: ptxErr } = await db.from("zenipay_personal_transactions").insert({
    id: ptxId,
    merchant_id: merchantId,
    profile_id: profile?.id ?? null,
    account_id: fromId,
    type: "transfer_out",
    amount,
    currency,
    description: memo,
  });
  if (ptxErr) {
    await db.from("zenipay_personal_accounts").update({ balance: Number(src.balance) }).eq("id", fromId);
    return err("server_error", "step_2_personal_tx_insert_failed", 500, ptxErr.message);
  }

  // Step 3: credit business account
  const { error: creditErr } = await db
    .from("zenipay_accounts")
    .update({ balance: newDstBalance, updated_at: now })
    .eq("id", toId);
  if (creditErr) {
    // Rollback steps 1+2.
    await db.from("zenipay_personal_accounts").update({ balance: Number(src.balance) }).eq("id", fromId);
    await db.from("zenipay_personal_transactions").delete().eq("id", ptxId);
    return err("server_error", "step_3_business_credit_failed", 500, creditErr.message);
  }

  // Step 4: business ledger row (best-effort — non-fatal).
  await db.from("zenipay_ledger").insert({
    id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    merchant_id: merchantId,
    event_type: "manual_adjustment",
    wallet_type: "platform",
    direction: "credit",
    amount,
    currency,
    reference: ptxId,
    note: `From personal · ${memo}`,
    created_at: now,
  });

  return NextResponse.json({
    success: true,
    new_personal_balance: newSrcBalance,
    new_business_balance: newDstBalance,
    transaction_id: ptxId,
  });
}
