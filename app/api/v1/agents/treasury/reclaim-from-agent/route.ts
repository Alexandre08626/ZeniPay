// POST /api/v1/agents/treasury/reclaim-from-agent
//
// Reverse of distribute-to-agent. Debits the agent wallet and credits
// the org treasury — internal move, no fees.
//
// Body: { from_agent_id, amount_units, currency, idempotency_key, memo? }
// Returns: { success, tx_group_id, agent_name, currency, amount_units }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const MICRO = BigInt(1_000_000);

interface Body {
  from_agent_id?: string;
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

  const fromAgentId    = String(body.from_agent_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!fromAgentId)                          return err("bad_request", "from_agent_id_required", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  const { data: agent } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, organization_id, status")
    .eq("id", fromAgentId)
    .maybeSingle();
  if (!agent)                                return err("not_found", "agent_not_found", 404);
  if (agent.organization_id !== organizationId) return err("forbidden", "agent_not_in_org", 403);

  const { data: txId, error: rpcErr } = await db.rpc("zc_reclaim_from_agent", {
    p_organization_id:  organizationId,
    p_agent_id:         fromAgentId,
    p_amount_micro:     toMicro(amountUnits),
    p_currency:         currency,
    p_idempotency_key:  idempotencyKey,
    p_posted_by:        auth.userId ? `user:${auth.userId}` : "org_operator",
  });

  if (rpcErr) {
    const m = rpcErr.message || "";
    const status = /insufficient|22000/i.test(m) ? 422 : 502;
    return err(
      status === 422 ? "insufficient_agent_balance" : "reclaim_failed",
      m, status, { detail: m },
    );
  }

  return NextResponse.json({
    success: true,
    tx_group_id:   txId as string | null,
    agent_id:      fromAgentId,
    agent_name:    agent.name,
    amount_units:  amountUnits,
    currency,
  });
}
