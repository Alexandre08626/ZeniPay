// POST /api/v1/personal/cards/issue
//
// Issues a virtual card against the active provider, scoped to a
// personal account. Mirrors the merchant cards flow but writes to
// zenipay_personal_cards. Returns 503 when no provider is enabled.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getCardIssuingProvider } from "@/lib/card-issuing/provider-factory";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  account_id?: string | null;
  cardholder_name?: string;
  currency?: string;
  spending_limit_daily?: number | null;
  spending_limit_monthly?: number | null;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const provider = getCardIssuingProvider();
  if (!provider) return err("coming_soon", "card_issuing_not_enabled", 503);

  let body: Body;
  try { body = (await req.json()) as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const cardholderName = String(body.cardholder_name ?? "").trim();
  const currency = String(body.currency ?? "CAD").toUpperCase();
  const accountId = body.account_id ? String(body.account_id) : null;
  const daily = body.spending_limit_daily != null ? Number(body.spending_limit_daily) : null;
  const monthly = body.spending_limit_monthly != null ? Number(body.spending_limit_monthly) : null;

  if (cardholderName.length < 2) return err("bad_request", "cardholder_name_required", 400);

  let issued: Awaited<ReturnType<typeof provider.issueVirtualCard>>;
  try {
    issued = await provider.issueVirtualCard({
      merchant_id: merchantId,
      cardholder_name: cardholderName,
      currency,
      spending_limit_daily: daily,
      spending_limit_monthly: monthly,
    });
  } catch (e) {
    return err("bad_gateway", "provider_issue_failed", 502, e instanceof Error ? e.message : String(e));
  }

  const db = getSupabaseAdmin();

  // zenipay_personal_cards has a NOT-NULL profile_id FK to
  // zenipay_personal_profiles — pull the merchant's profile id
  // (one per merchant) before insert.
  const { data: profile } = await db
    .from("zenipay_personal_profiles")
    .select("id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (!profile) {
    return err("unprocessable", "personal_profile_missing", 422);
  }

  const id = `pcard_${crypto.randomUUID()}`;
  const { data, error } = await db
    .from("zenipay_personal_cards")
    .insert({
      id,
      merchant_id: merchantId,
      profile_id: profile.id,
      account_id: accountId,
      provider: provider.name,
      provider_card_id: issued.provider_card_id,
      cardholder_name: cardholderName,
      last4: issued.last4,
      exp_month: issued.exp_month,
      exp_year: issued.exp_year,
      status: "active",
      spending_limit_daily: daily,
      spending_limit_monthly: monthly,
      currency,
    })
    .select("*")
    .single();
  if (error) {
    return err("server_error", "card_row_insert_failed", 500, error.message);
  }

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "personal_card.issued",
    resource_type: "zenipay_personal_cards",
    resource_id: id,
    new_value: { provider: provider.name, last4: issued.last4, currency },
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    card_id: id,
    last4: issued.last4,
    exp_month: issued.exp_month,
    exp_year: issued.exp_year,
    status: "active",
    card: data,
  });
}
