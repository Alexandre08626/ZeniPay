// POST /api/v1/agents/treasury/return-to-merchant
//
// Reverse of distribute-from-merchant. Debits the org treasury and
// credits the merchant's ZeniPay account — internal move, no fees.
//
// Two moves:
//   A. zc_return_to_merchant(org, merchant_ref, amt) — ZeniCore side.
//      Debits org_treasury, credits external_outbound(merchant_ref).
//   B. Credit merchant's zenipay_accounts + write zenipay_ledger row
//      (event_type='return_from_agent_treasury', direction='credit').
//
// If Step A succeeds but Step B fails we surface the tx_group id and
// an advisory — ZeniCore has already recorded the outbound; the merchant
// UI can be reconciled by retrying Step B with the same idempotency key.
//
// Body: { to_account_id, amount_units, currency, idempotency_key, memo? }
// Returns: { success, tx_group_id, new_merchant_balance, to_account_id }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const MICRO = BigInt(1_000_000);

interface Body {
  to_account_id?: string;
  amount_units?: number | string;
  currency?: string;
  idempotency_key?: string;
  memo?: string;
}

function toMicro(units: number): string {
  const cents = Math.round(units * 100);
  return (BigInt(cents) * (MICRO / BigInt(100))).toString();
}

function err(code: string, message: string, status: number, detail?: unknown) {
  const body: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) body.error.detail = detail;
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const toAccountId    = String(body.to_account_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : "";
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!toAccountId)                          return err("bad_request", "to_account_id_required", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  // Resolve the merchant who owns the destination account and confirm the
  // org is linked to them via zenipay_merchant_agent_org_map.
  const { data: account } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency, status")
    .eq("id", toAccountId)
    .maybeSingle();
  if (!account)                              return err("not_found", "destination_account_not_found", 404);
  if (account.status && account.status !== "active") return err("unprocessable", "account_not_active", 422, { status: account.status });
  if (account.currency && account.currency.toUpperCase() !== currency)
                                             return err("unprocessable", "currency_mismatch", 422, { account_currency: account.currency, requested: currency });

  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", account.merchant_id)
    .maybeSingle();
  if (!mapping || mapping.organization_id !== organizationId)
    return err("forbidden", "account_not_linked_to_org", 403);

  const merchantRef = `merchant:${account.merchant_id}`;

  // ─── STEP A: zc_return_to_merchant ──────────────────────────────────
  const { data: txId, error: rpcErr } = await db.rpc("zc_return_to_merchant", {
    p_organization_id:  organizationId,
    p_merchant_ref:     merchantRef,
    p_amount_micro:     toMicro(amountUnits),
    p_currency:         currency,
    p_idempotency_key:  `${idempotencyKey}:return`,
    p_posted_by:        auth.userId ? `user:${auth.userId}` : "org_operator",
  });
  if (rpcErr) {
    const m = rpcErr.message || "";
    const status = /insufficient|22000/i.test(m) ? 422 : 502;
    return err(
      status === 422 ? "insufficient_treasury_balance" : "return_failed",
      m, status, { detail: m },
    );
  }

  // ─── STEP B: credit merchant account + zenipay_ledger ──────────────
  // Idempotency: if a ledger row with this reference already exists we
  // don't re-credit. This matches the forward bridge's pattern.
  const { data: existingLedger } = await db
    .from("zenipay_ledger")
    .select("id")
    .eq("reference", idempotencyKey)
    .maybeSingle();

  const balance   = Number(account.balance) || 0;
  const newBalance = balance + amountUnits;
  const now       = new Date().toISOString();

  if (!existingLedger) {
    const ledgerId = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const [{ error: balErr }, { error: ledErr }] = await Promise.all([
      db.from("zenipay_accounts")
        .update({ balance: newBalance, updated_at: now })
        .eq("id", toAccountId)
        .eq("merchant_id", account.merchant_id),
      db.from("zenipay_ledger").insert({
        id: ledgerId,
        merchant_id: account.merchant_id,
        event_type: "return_from_agent_treasury",
        wallet_type: "platform",
        direction: "credit",
        amount: amountUnits,
        currency,
        reference: idempotencyKey,
        note: memo || "Returned from agent treasury",
        created_at: now,
      }),
    ]);
    if (balErr || ledErr) {
      return err("server_error", "step_b_merchant_credit_failed", 500, {
        bal: balErr?.message, ledger: ledErr?.message,
        tx_group_id: txId,
        advisory: "ZeniCore recorded the outbound but the merchant credit failed — retry with the same idempotency_key.",
      });
    }
  }

  return NextResponse.json({
    success: true,
    tx_group_id:          txId as string | null,
    to_account_id:        toAccountId,
    new_merchant_balance: newBalance,
    amount_units:         amountUnits,
    currency,
  });
}
