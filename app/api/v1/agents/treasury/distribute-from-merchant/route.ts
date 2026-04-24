// POST /api/v1/agents/treasury/distribute-from-merchant
//
// The merchant → AI-agent bridge. One request, three moves:
//   A. Debit the merchant's ZeniPay account + write a zenipay_ledger row.
//   B. zc_fund_treasury(org) — credit the org's ZeniCore treasury.
//   C. zc_distribute_to_agent(org, agent) — credit the agent wallet.
//
// All three steps run with a shared `idempotency_key`: `<key>:fund` for B
// and `<key>:dist` for C so repeat calls resolve to the same ledger row.
// Partial-failure protocol (documented on the function):
//   * A fails          → nothing happened, 500 upstream.
//   * A ok, B fails    → credit the merchant back + delete the ledger row,
//                        return 502 "treasury_fund_failed".
//   * A + B ok, C fails→ treasury holds the money; we do NOT roll A back
//                        (that would create a phantom merchant credit with
//                        no matching debit in the ZeniCore ledger). We
//                        surface the treasury tx_group so the caller can
//                        retry the distribute step with the same key.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const MICRO = BigInt(1_000_000);

interface Body {
  merchant_id?: string;
  from_account_id?: string;
  to_agent_id?: string;
  amount_units?: number | string;
  currency?: string;
  idempotency_key?: string;
  memo?: string;
}

function toMicro(units: number): string {
  // Round to cents first so bankers' rounding on $0.665 doesn't drift.
  const cents = Math.round(units * 100);
  return (BigInt(cents) * (MICRO / BigInt(100))).toString();
}

function err(code: string, message: string, status: number, detail?: unknown) {
  const body: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) body.error.detail = detail;
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const merchantId     = String(body.merchant_id ?? "").trim();
  const fromAccountId  = String(body.from_account_id ?? "").trim();
  const toAgentId      = String(body.to_agent_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : "";
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!merchantId)                           return err("bad_request", "merchant_id_required", 400);
  if (!fromAccountId)                        return err("bad_request", "from_account_id_required", 400);
  if (!toAgentId)                            return err("bad_request", "to_agent_id_required", 400);
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

  // ─── 3. Agent must belong to the mapped org ──────────────────────────
  const { data: agent } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, organization_id, status")
    .eq("id", toAgentId)
    .maybeSingle();
  if (!agent)                                return err("not_found", "agent_not_found", 404);
  if (agent.organization_id !== organizationId) return err("forbidden", "agent_not_in_merchant_org", 403);
  if (agent.status !== "active")             return err("unprocessable", "agent_not_active", 422, { status: agent.status });
  const agentName = String(agent.name ?? "Agent");

  const amountMicro   = toMicro(amountUnits);
  const fundKey       = `${idempotencyKey}:fund`;
  const distKey       = `${idempotencyKey}:dist`;
  const ledgerId      = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now           = new Date().toISOString();

  // ─── STEP A: debit merchant account + ledger row ────────────────────
  // Check idempotency: if a ledger row already exists for this reference,
  // we've already done step A.
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
        event_type: "transfer_to_agent",
        wallet_type: "platform",
        direction: "debit",
        amount: amountUnits,
        currency,
        reference: idempotencyKey,
        note: memo || `Transfer to agent ${agentName}`,
        created_at: now,
      }),
    ]);
    if (balErr || ledErr) {
      // Best-effort rollback of whichever half succeeded.
      if (!balErr) await db.from("zenipay_accounts")
        .update({ balance, updated_at: now })
        .eq("id", fromAccountId);
      if (!ledErr) await db.from("zenipay_ledger").delete().eq("id", ledgerId);
      return err("server_error", "step_a_merchant_debit_failed", 500, { bal: balErr?.message, ledger: ledErr?.message });
    }
    ledgerRowId = ledgerId;
  }

  const rollbackA = async () => {
    // Undo debit: restore balance AND drop ledger row. Only safe BEFORE
    // step B succeeds; after that the ZeniCore ledger already references
    // the transfer, so we leave A intact.
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

  // ─── STEP C: zc_distribute_to_agent ─────────────────────────────────
  const { data: distData, error: distErr } = await db.rpc("zc_distribute_to_agent", {
    p_organization_id:  organizationId,
    p_agent_id:         toAgentId,
    p_amount_micro:     amountMicro,
    p_currency:         currency,
    p_idempotency_key:  distKey,
    p_posted_by:        `merchant:${merchantId}`,
  });
  if (distErr) {
    // Treasury has the funds now; do NOT roll A back — that would create
    // a phantom credit. Surface both the treasury tx_group and the error
    // so the caller can retry the distribute step idempotently.
    return err("bad_gateway", "agent_distribute_failed", 502, {
      detail: distErr.message,
      treasury_tx_group_id: treasuryTxGroupId,
      advisory: "Funds landed in treasury. Retry the same request with the same idempotency_key to complete the distribute step.",
    });
  }
  const agentTxGroupId = distData as string | null;

  return NextResponse.json({
    success: true,
    treasury_tx_group_id: treasuryTxGroupId,
    agent_tx_group_id:    agentTxGroupId,
    new_merchant_balance: newBalance,
    agent_name:           agentName,
    organization_id:      organizationId,
  });
}
