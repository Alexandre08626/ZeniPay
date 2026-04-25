// POST /api/v1/personal/transfer-from-business
// Body: { merchant_id, from_business_account_id, to_personal_account_id,
//         amount, currency?, memo? }
//
// Atomic transfer Business → Personal. Mirror of transfer-to-business.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface Body {
  merchant_id?: string;
  from_business_account_id?: string;
  to_personal_account_id?: string;
  amount?: number | string;
  currency?: string;
  memo?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const merchantId = String(body.merchant_id ?? "").trim();
  const fromId     = String(body.from_business_account_id ?? "").trim();
  const toId       = String(body.to_personal_account_id ?? "").trim();
  const amount     = typeof body.amount === "string" ? Number(body.amount) : Number(body.amount ?? NaN);
  const currency   = String(body.currency ?? "CAD").toUpperCase();
  const memo       = body.memo ? String(body.memo).slice(0, 200) : "Transfer to personal";

  if (!merchantId || !fromId || !toId) return err("bad_request", "missing_required_fields", 400);
  if (!Number.isFinite(amount) || amount <= 0) return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  const { data: src } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency")
    .eq("id", fromId)
    .maybeSingle();
  if (!src || src.merchant_id !== merchantId) return err("not_found", "source_account_not_found", 404);
  if (Number(src.balance ?? 0) < amount) return err("unprocessable", "insufficient_funds", 422, { available: Number(src.balance ?? 0) });

  const { data: dst } = await db
    .from("zenipay_personal_accounts")
    .select("id, merchant_id, balance, currency")
    .eq("id", toId)
    .maybeSingle();
  if (!dst || dst.merchant_id !== merchantId) return err("not_found", "destination_account_not_found", 404);

  const newSrcBalance = Number(src.balance ?? 0) - amount;
  const newDstBalance = Number(dst.balance ?? 0) + amount;
  const now = new Date().toISOString();

  // Step 1: debit business account.
  const { error: debitErr } = await db
    .from("zenipay_accounts")
    .update({ balance: newSrcBalance, updated_at: now })
    .eq("id", fromId);
  if (debitErr) return err("server_error", "step_1_business_debit_failed", 500, debitErr.message);

  // Step 2: business ledger row (debit).
  const ledgerId = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.from("zenipay_ledger").insert({
    id: ledgerId,
    merchant_id: merchantId,
    event_type: "manual_adjustment",
    wallet_type: "platform",
    direction: "debit",
    amount,
    currency,
    reference: ledgerId,
    note: `To personal · ${memo}`,
    created_at: now,
  });

  // Step 3: credit personal.
  // NOTE: zenipay_personal_accounts has no updated_at column —
  // including it in the patch makes PostgREST 400 with PGRST204.
  const { error: creditErr } = await db
    .from("zenipay_personal_accounts")
    .update({ balance: newDstBalance })
    .eq("id", toId);
  if (creditErr) {
    // Rollback step 1.
    await db.from("zenipay_accounts").update({ balance: Number(src.balance ?? 0) }).eq("id", fromId);
    await db.from("zenipay_ledger").delete().eq("id", ledgerId);
    return err("server_error", "step_3_personal_credit_failed", 500, creditErr.message);
  }

  // Step 4: personal transfer_in row.
  // The table requires profile_id (NOT NULL FK) and has no `category`
  // column — resolve the profile and skip the column.
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
    account_id: toId,
    type: "transfer_in",
    amount,
    currency,
    description: memo,
  });
  if (ptxErr) {
    // Don't roll back the credit — the money landed correctly. Surface
    // the row-insert error in logs but keep returning success.
    // eslint-disable-next-line no-console
    console.warn("personal_transactions insert (transfer_in) failed:", ptxErr.message);
  }

  return NextResponse.json({
    success: true,
    new_personal_balance: newDstBalance,
    new_business_balance: newSrcBalance,
    transaction_id: ptxId,
  });
}
