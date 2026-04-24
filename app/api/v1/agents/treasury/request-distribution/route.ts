// POST /api/v1/agents/treasury/request-distribution
//
// Smart wrapper around distribute-to-agent that respects the merchant's
// active approval rules. If a rule requires approval for this
// distribution, the request is parked in zenipay_approval_requests and
// returned as `requires_approval: true`. Otherwise the distribute runs
// immediately and the response mirrors the direct distribute-to-agent
// shape.
//
// Callers should hit this route instead of distribute-to-agent for any
// operator-initiated distribution UX — the UI no longer needs to know
// whether a rule applies.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const MICRO = BigInt(1_000_000);
const APPROVAL_WINDOW_DAYS = 7;

interface Body {
  to_agent_id?: string;
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

  const toAgentId      = String(body.to_agent_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : "";
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!toAgentId)                            return err("bad_request", "to_agent_id_required", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  const { data: agent } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, organization_id, status")
    .eq("id", toAgentId)
    .maybeSingle();
  if (!agent)                                return err("not_found", "agent_not_found", 404);
  if (agent.organization_id !== organizationId) return err("forbidden", "agent_not_in_org", 403);
  if (agent.status !== "active")             return err("unprocessable", "agent_not_active", 422, { status: agent.status });

  // Resolve the merchant linked to this org — approval rules live on
  // the merchant side (zeniva-001), not the agents-side org.
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const merchantId = mapping?.merchant_id ?? null;

  // Check for an active approval rule that matches this request.
  let matchingRule: {
    id: string; threshold_units: number; approver_email: string; approver_name: string | null;
  } | null = null;
  if (merchantId) {
    const { data: rules } = await db
      .from("zenipay_approval_rules")
      .select("id, threshold_units, approver_email, approver_name, is_active, rule_type, currency")
      .eq("merchant_id", merchantId)
      .eq("rule_type", "agent_distribution")
      .eq("is_active", true);
    for (const r of (rules ?? []) as Array<{
      id: string; threshold_units: number; approver_email: string; approver_name: string | null;
      currency: string;
    }>) {
      if ((r.currency ?? currency) !== currency) continue;
      if (Number(r.threshold_units) <= amountUnits) {
        matchingRule = { id: r.id, threshold_units: Number(r.threshold_units), approver_email: r.approver_email, approver_name: r.approver_name };
        break;
      }
    }
  }

  // No rule → execute immediately via zc_distribute_to_agent.
  if (!matchingRule) {
    const { data: txId, error: rpcErr } = await db.rpc("zc_distribute_to_agent", {
      p_organization_id:  organizationId,
      p_agent_id:         toAgentId,
      p_amount_micro:     toMicro(amountUnits),
      p_currency:         currency,
      p_idempotency_key:  idempotencyKey,
      p_posted_by:        auth.userId ? `user:${auth.userId}` : "org_operator",
    });
    if (rpcErr) {
      const m = rpcErr.message || "";
      const status = /insufficient|22000/i.test(m) ? 422 : 502;
      return err(
        status === 422 ? "insufficient_treasury_balance" : "agent_distribute_failed",
        m, status, { detail: m },
      );
    }
    return NextResponse.json({
      requires_approval: false,
      executed:          true,
      tx_group_id:       txId as string | null,
      agent_id:          toAgentId,
      agent_name:        agent.name,
      amount_units:      amountUnits,
      currency,
    });
  }

  // Rule matched → create a pending approval request.
  const now = new Date();
  const expiresAt = new Date(now.getTime() + APPROVAL_WINDOW_DAYS * 86400_000);
  const requestId = `apr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const { data: inserted, error: insErr } = await db
    .from("zenipay_approval_requests")
    .insert({
      id:             requestId,
      merchant_id:    merchantId,
      rule_id:        matchingRule.id,
      request_type:   "agent_distribution",
      status:         "pending",
      amount_units:   amountUnits,
      currency,
      agent_id:       toAgentId,
      agent_name:     agent.name,
      requested_by:   auth.userId ? `user:${auth.userId}` : "org_operator",
      approver_email: matchingRule.approver_email,
      memo,
      payload: {
        to_agent_id:     toAgentId,
        amount_units:    amountUnits,
        currency,
        idempotency_key: idempotencyKey,
        memo,
        organization_id: organizationId,
      },
      expires_at:      expiresAt.toISOString(),
      idempotency_key: idempotencyKey,
      created_at:      now.toISOString(),
    })
    .select()
    .single();
  if (insErr || !inserted) {
    return err("server_error", "approval_create_failed", 500, { detail: insErr?.message });
  }

  return NextResponse.json({
    requires_approval:   true,
    executed:            false,
    approval_request_id: inserted.id,
    approver_email:      matchingRule.approver_email,
    approver_name:       matchingRule.approver_name,
    expires_at:          inserted.expires_at,
    message:             `Awaiting approval from ${matchingRule.approver_name ?? matchingRule.approver_email}`,
  });
}
