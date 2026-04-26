// POST /api/v1/bank/manual
// Body: { merchant_id, connection_type, bank_name, account_holder,
//         routing_number, account_number, account_type, currency }
//
// Manual bank entry — the Safari-safe alternative to the MX widget.
// We store ONLY the last-4 of the account number + a masked
// routing string. The full routing/account never leave this
// request; no DB column carries the raw values. Funding flows route
// through Finix on demand using the stored last-4 + the customer's
// re-entry of routing at withdrawal time, OR we re-prompt for the
// full numbers on the first fund — whichever you wire later.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  connection_type?: "business" | "personal";
  bank_name?: string;
  account_holder?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: "checking" | "savings";
  currency?: "CAD" | "USD";
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
  const connectionType = (body.connection_type ?? "business") as "business" | "personal";
  const bankName       = String(body.bank_name ?? "").trim();
  const accountHolder  = String(body.account_holder ?? "").trim();
  const routing        = String(body.routing_number ?? "").replace(/\s/g, "");
  const accountNumber  = String(body.account_number ?? "").replace(/\s/g, "");
  const accountType    = (body.account_type ?? "checking") as "checking" | "savings";
  const currency       = (body.currency ?? "CAD") as "CAD" | "USD";

  if (bankName.length < 2) return err("bad_request", "bank_name_required", 400);
  if (accountHolder.length < 2) return err("bad_request", "account_holder_required", 400);
  if (!/^\d{6,12}$/.test(routing)) return err("bad_request", "routing_number_invalid", 400);
  if (!/^\d{4,20}$/.test(accountNumber)) return err("bad_request", "account_number_invalid", 400);

  const last4 = accountNumber.slice(-4);
  const routingMasked = `•••• ${routing.slice(-3)}`;

  const db = getSupabaseAdmin();
  const id = `bank_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const { data, error } = await db.from("zenipay_bank_connections").insert({
    id,
    merchant_id: merchantId,
    connection_type: connectionType,
    provider: "manual",
    institution_name: bankName,
    institution_logo_url: null,
    account_holder: accountHolder,
    account_type: accountType,
    account_number_last4: last4,
    routing_number: routingMasked,
    currency,
    balance_synced: 0,
    balance_synced_at: null,
    verified_at: now,   // self-attested; flip to null if you want a verification step
    status: "active",
  }).select("*").single();

  if (error) {
    return err("server_error", "insert_failed", 500, error.message);
  }

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "bank.manually_added",
    resource_type: "zenipay_bank_connections",
    resource_id: id,
    new_value: { provider: "manual", institution_name: bankName, last4 },
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    connection_id: id,
    institution_name: bankName,
    last4,
    connection: data,
  });
}
