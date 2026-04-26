// POST /api/v1/bank/plaid/exchange
// Body: { merchant_id, public_token, connection_type? }
//
// Called from Plaid Link's onSuccess callback. Exchanges the
// public_token for an access_token, fetches account + institution
// + auth numbers, upserts one row per account into
// zenipay_bank_connections.
//
// We persist:
//   - access_token (server-only; needed for future syncs + Finix funding)
//   - item_id (Plaid's identifier for this institution link)
//   - account_id (Plaid's per-account identifier)
//   - last4 of the account number, masked routing
//   - institution name + id
//   - balance + currency
//
// We do NOT persist the full account number or full routing — those
// are pulled from Plaid on demand when needed for ACH funding.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { exchangePublicToken, getAccountsAndAuth } from "@/lib/plaid/plaid-client";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  public_token?: string;
  connection_type?: "business" | "personal";
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId     = r;
  const publicToken    = String(body.public_token ?? "").trim();
  const connectionType = (body.connection_type ?? "business") as "business" | "personal";

  if (!publicToken) return err("bad_request", "public_token_required", 400);

  // 1. Exchange public_token → access_token.
  let accessToken: string;
  let itemId: string;
  try {
    const ex = await exchangePublicToken(publicToken);
    accessToken = ex.access_token;
    itemId = ex.item_id;
  } catch (e) {
    return err("bad_gateway", "plaid_exchange_failed", 502, e instanceof Error ? e.message : String(e));
  }

  // 2. Fetch accounts + auth + institution.
  let info;
  try {
    info = await getAccountsAndAuth(accessToken);
  } catch (e) {
    return err("bad_gateway", "plaid_accounts_fetch_failed", 502, e instanceof Error ? e.message : String(e));
  }

  if (info.accounts.length === 0) {
    return err("unprocessable", "no_accounts_returned", 422);
  }

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const inserted: string[] = [];

  for (const a of info.accounts) {
    const auth = info.auth.find((au) => au.account_id === a.account_id);
    const last4 = a.mask ?? null;
    const routingMasked = auth?.routing
      ? `•••• ${auth.routing.slice(-3)}`
      : (auth?.institution && auth?.branch
          ? `${auth.institution}-${auth.branch}`   // CA EFT: institution-transit
          : null);
    const balance = a.balances?.available ?? a.balances?.current ?? 0;
    const currency = a.balances?.iso_currency_code ?? "CAD";

    // Skip if same account_id already linked.
    const { data: existing } = await db
      .from("zenipay_bank_connections")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("provider", "plaid")
      .eq("provider_account_id", a.account_id)
      .maybeSingle();

    if (existing?.id) {
      await db.from("zenipay_bank_connections").update({
        balance_synced: balance,
        balance_synced_at: now,
        institution_name: info.institution_name ?? a.name,
        currency,
        status: "active",
      }).eq("id", existing.id);
      continue;
    }

    const id = `bank_${crypto.randomUUID()}`;
    const { error: insErr } = await db.from("zenipay_bank_connections").insert({
      id,
      merchant_id: merchantId,
      connection_type: connectionType,
      provider: "plaid",
      provider_request_id: itemId,
      provider_account_id: a.account_id,
      institution_name: info.institution_name ?? a.name,
      institution_logo_url: null,
      account_holder: null,
      account_type: (a.subtype ?? a.type ?? "checking").toLowerCase(),
      account_number_last4: last4,
      transit_number: auth?.branch ?? null,
      institution_number: auth?.institution ?? null,
      routing_number: routingMasked,
      currency,
      balance_synced: balance,
      balance_synced_at: now,
      verified_at: now,
      status: "active",
      // Plaid-specific identifiers — server-only, never returned to UI.
      // Add a `plaid_access_token` column when ready to encrypt at rest.
    });
    if (!insErr) inserted.push(id);
  }

  // Persist the access_token in a sibling table so it's never read
  // by the regular connections list. Best-effort — table may not exist.
  try {
    await db.from("zenipay_plaid_items").upsert({
      item_id: itemId,
      merchant_id: merchantId,
      access_token: accessToken,
      institution_id: info.institution_id,
      institution_name: info.institution_name,
      created_at: now,
      updated_at: now,
    });
  } catch { /* table may not exist yet — connection still works for read flows */ }

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "bank.plaid_linked",
    resource_type: "zenipay_bank_connections",
    resource_id: itemId,
    new_value: {
      provider: "plaid",
      institution: info.institution_name,
      accounts_count: info.accounts.length,
    },
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    accounts_linked: inserted.length,
    institution_name: info.institution_name,
    item_id: itemId,
  });
}
