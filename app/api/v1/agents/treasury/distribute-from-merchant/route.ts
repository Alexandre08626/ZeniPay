// POST /api/v1/agents/treasury/distribute-from-merchant
//
// Merchant → org treasury bridge. Hotfix PR 10 architecture: funds
// ALWAYS land in the org treasury. A separate manual action, via
// POST /api/v1/agents/treasury/distribute-to-agent, moves funds from
// the treasury to a specific agent wallet.
//
// Two moves per call:
//   A. Debit the merchant's ZeniPay account + write a zenipay_ledger row.
//   B. zc_fund_treasury(org) — credit the org's ZeniCore treasury.
//
// Partial-failure protocol:
//   * A fails       → nothing happened, 500 upstream.
//   * A ok, B fails → credit the merchant back + delete the ledger row,
//                     return 502 "treasury_fund_failed".

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

const MICRO = BigInt(1_000_000);

interface Body {
  merchant_id?: string;
  from_account_id?: string;
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
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId     = r;
  const fromAccountId  = String(body.from_account_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : "";
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!fromAccountId)                        return err("bad_request", "from_account_id_required", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  // ─── 1. Account lookup + ownership + balance ─────────────────────────
  const { data: account } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency, status")
    .eq("id", fromAccountId)
    .maybeSingle();
  if (!account)                              return err("not_found", "source_account_not_found", 404);
  if (account.merchant_id !== merchantId)    return err("forbidden", "account_not_owned_by_merchant", 403);
  if (account.status && account.status !== "active") return err("unprocessable", "account_not_active", 422, { status: account.status });
  if (account.currency && account.currency.toUpperCase() !== currency)
                                             return err("unprocessable", "currency_mismatch", 422, { account_currency: account.currency, requested: currency });
  const balance = Number(account.balance) || 0;
  if (balance < amountUnits)                 return err("unprocessable", "insufficient_funds", 422, { available: balance, requested: amountUnits });

  // ─── 2. Merchant ↔ Agents org mapping ────────────────────────────────
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (!mapping?.organization_id)             return err("forbidden", "merchant_not_linked", 403);
  const organizationId = mapping.organization_id as string;

  const amountMicro   = toMicro(amountUnits);
  const fundKey       = `${idempotencyKey}:fund`;
  const ledgerId      = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now           = new Date().toISOString();

  // ─── STEP A: debit merchant account + ledger row ────────────────────
  const { data: existingLedger } = await db
    .from("zenipay_ledger")
    .select("id")
    .eq("reference", idempotencyKey)
    .maybeSingle();
  let ledgerRowId = existingLedger?.id as string | undefined;
  let newBalance = balance;

  if (!ledgerRowId) {
    newBalance = balance - amountUnits;
    const [{ error: balErr }, { error: ledErr }] = await Promise.all([
      db.from("zenipay_accounts")
        .update({ balance: newBalance, updated_at: now })
        .eq("id", fromAccountId)
        .eq("merchant_id", merchantId),
      db.from("zenipay_ledger").insert({
        id: ledgerId,
        merchant_id: merchantId,
        event_type: "fund_agent_treasury",
        wallet_type: "platform",
        direction: "debit",
        amount: amountUnits,
        currency,
        reference: idempotencyKey,
        note: memo || "Fund agent treasury",
        created_at: now,
      }),
    ]);
    if (balErr || ledErr) {
      if (!balErr) await db.from("zenipay_accounts")
        .update({ balance, updated_at: now })
        .eq("id", fromAccountId);
      if (!ledErr) await db.from("zenipay_ledger").delete().eq("id", ledgerId);
      return err("server_error", "step_a_merchant_debit_failed", 500, { bal: balErr?.message, ledger: ledErr?.message });
    }
    ledgerRowId = ledgerId;
  }

  const rollbackA = async () => {
    await db.from("zenipay_accounts")
      .update({ balance, updated_at: new Date().toISOString() })
      .eq("id", fromAccountId);
    if (ledgerRowId) await db.from("zenipay_ledger").delete().eq("id", ledgerRowId);
  };

  // ─── STEP B: zc_fund_treasury ───────────────────────────────────────
  const { data: fundData, error: fundErr } = await db.rpc("zc_fund_treasury", {
    p_organization_id:  organizationId,
    p_amount_micro:     amountMicro,
    p_currency:         currency,
    p_source_ref:       `merchant:${merchantId}`,
    p_idempotency_key:  fundKey,
    p_posted_by:        "merchant_system",
  });
  if (fundErr) {
    await rollbackA();
    return err("bad_gateway", "treasury_fund_failed", 502, { detail: fundErr.message });
  }
  const treasuryTxGroupId = fundData as string | null;

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "treasury.fund_from_merchant",
    resource_type: "org_treasury",
    resource_id: organizationId,
    new_value: { amount_units: amountUnits, currency, tx_group_id: treasuryTxGroupId },
    ip_address: req.headers.get("x-forwarded-for") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    treasury_tx_group_id: treasuryTxGroupId,
    new_merchant_balance: newBalance,
    organization_id:      organizationId,
  });
}
