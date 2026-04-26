// POST /api/v1/yield/enroll
// Body: { merchant_id, account_id, account_type, currency? }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  account_id?: string;
  account_type?: "merchant" | "personal" | "treasury" | "agent_wallet";
  currency?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const accountId  = String(body.account_id ?? "").trim();
  const accountType = (body.account_type ?? "merchant") as Required<Body>["account_type"];
  const currency   = String(body.currency ?? "CAD").toUpperCase();

  if (!accountId) return err("bad_request", "account_id_required", 400);

  const db = getSupabaseAdmin();

  const { data: cfg } = await db
    .from("zenipay_yield_config")
    .select("id, rate_annual_pct, client_share_pct, min_balance")
    .eq("currency", currency)
    .eq("is_active", true)
    .maybeSingle();
  if (!cfg) return err("unprocessable", `no_active_config_for_${currency}`, 422);

  // Balance check.
  let balance = 0;
  if (accountType === "merchant") {
    const { data } = await db.from("zenipay_accounts").select("balance, merchant_id").eq("id", accountId).maybeSingle();
    if (!data || data.merchant_id !== merchantId) return err("not_found", "account_not_found", 404);
    balance = Number(data.balance ?? 0);
  } else if (accountType === "personal") {
    const { data } = await db.from("zenipay_personal_accounts").select("balance, merchant_id").eq("id", accountId).maybeSingle();
    if (!data || data.merchant_id !== merchantId) return err("not_found", "account_not_found", 404);
    balance = Number(data.balance ?? 0);
  }
  // treasury + agent_wallet — accept the enrollment without a live balance check.

  if (balance < Number(cfg.min_balance) && (accountType === "merchant" || accountType === "personal")) {
    return err("unprocessable", "below_min_balance", 422, { min_balance: Number(cfg.min_balance), balance });
  }

  // Reactivate existing enrollment for this account if present.
  const { data: existing } = await db
    .from("zenipay_yield_enrollments")
    .select("id, status")
    .eq("merchant_id", merchantId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (existing) {
    await db.from("zenipay_yield_enrollments").update({ status: "active", config_id: cfg.id }).eq("id", existing.id);
    auditAsync({
      merchant_id: merchantId, actor_type: "merchant_user", actor_id: merchantId,
      action: "yield.enrolled", resource_type: "zenipay_yield_enrollments", resource_id: existing.id,
      new_value: { account_id: accountId, currency, reactivated: true }, severity: "info",
    });
    return NextResponse.json({
      enrollment_id: existing.id,
      reactivated: true,
      rate_client: round((Number(cfg.rate_annual_pct) * Number(cfg.client_share_pct)) / 100),
    });
  }

  const id = `yenr_${crypto.randomUUID()}`;
  const { error: insErr } = await db.from("zenipay_yield_enrollments").insert({
    id,
    merchant_id: merchantId,
    account_id: accountId,
    account_type: accountType,
    config_id: cfg.id,
    status: "active",
    total_earned: 0,
  });
  if (insErr) return err("server_error", "enrollment_insert_failed", 500, insErr.message);

  auditAsync({
    merchant_id: merchantId, actor_type: "merchant_user", actor_id: merchantId,
    action: "yield.enrolled", resource_type: "zenipay_yield_enrollments", resource_id: id,
    new_value: { account_id: accountId, account_type: accountType, currency }, severity: "info",
  });

  return NextResponse.json({
    enrollment_id: id,
    rate_client: round((Number(cfg.rate_annual_pct) * Number(cfg.client_share_pct)) / 100),
    next_accrual: "tomorrow",
  });
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
