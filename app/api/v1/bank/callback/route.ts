// POST /api/v1/bank/callback
// Body: { merchant_id, user_guid, member_guid, connection_type? }
//
// Called by the frontend once MX's widget fires
// `mx/connect/memberConnected`. We pull the connected accounts,
// take the primary checking/savings, look up the institution, and
// insert a zenipay_bank_connections row.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getMemberAccounts, getInstitution } from "@/lib/mx/mx-client";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  user_guid?: string;
  member_guid?: string;
  connection_type?: "business" | "personal";
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
  const merchantId = r;
  const userGuid   = String(body.user_guid ?? "").trim();
  const memberGuid = String(body.member_guid ?? "").trim();
  const connectionType = (body.connection_type ?? "business") as "business" | "personal";

  if (!userGuid || !memberGuid) {
    return err("bad_request", "missing_required_fields", 400);
  }

  let accounts;
  try {
    accounts = await getMemberAccounts(userGuid, memberGuid);
  } catch (e) {
    return err("bad_gateway", "mx_fetch_accounts_failed", 502, e instanceof Error ? e.message : String(e));
  }
  if (accounts.length === 0) {
    return err("unprocessable", "no_accounts_on_member", 422);
  }

  // Prefer checking, then savings, then whatever's first.
  const primary =
    accounts.find((a) => a.type === "CHECKING") ??
    accounts.find((a) => a.type === "SAVINGS") ??
    accounts[0];

  let institutionName = primary.name ?? "Bank";
  let institutionLogoUrl: string | null = null;
  if (primary.institution_code) {
    try {
      const inst = await getInstitution(primary.institution_code);
      if (inst?.name) institutionName = inst.name;
      if (inst?.medium_logo_url) institutionLogoUrl = inst.medium_logo_url;
    } catch { /* best-effort */ }
  }

  const last4 = (primary.account_number ?? "").slice(-4) || null;
  const currency = primary.currency_code ?? "CAD";

  const db = getSupabaseAdmin();
  const connectionId = `bank_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const { data, error } = await db.from("zenipay_bank_connections").insert({
    id: connectionId,
    merchant_id: merchantId,
    connection_type: connectionType,
    provider: "mx",
    mx_user_guid: userGuid,
    mx_member_guid: memberGuid,
    mx_account_guid: primary.guid,
    institution_name: institutionName,
    institution_logo_url: institutionLogoUrl,
    account_type: (primary.type ?? "CHECKING").toLowerCase(),
    account_number_last4: last4,
    routing_number: primary.routing_number ?? null,
    currency,
    balance_synced: Number(primary.balance ?? 0),
    balance_synced_at: now,
    verified_at: now,
    status: "active",
  }).select("*").single();

  if (error) {
    return err("server_error", "connection_insert_failed", 500, error.message);
  }

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "bank.connected",
    resource_type: "zenipay_bank_connections",
    resource_id: connectionId,
    new_value: { provider: "mx", institution_name: institutionName, last4 },
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    connection_id: connectionId,
    institution_name: institutionName,
    last4,
    balance: Number(primary.balance ?? 0),
    currency,
    connection: data,
  });
}
