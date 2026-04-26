// GET /api/v1/bank/mx/accounts?merchant_id=&type=business|personal
//
// Reconcile route. Pulls every MX-linked account across every member
// for the merchant's MX user, upserts into zenipay_bank_connections
// keyed by provider_account_id (unique per MX account). Runs the
// institution lookup once per unique institution_code to fill logos.
//
// Safe to call repeatedly — won't duplicate rows thanks to the upsert
// on (merchant_id, provider, mx_account_guid).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { isMXEnabled, createOrGetUser, getAllAccounts, getInstitution } from "@/lib/mx/mx-client";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  if (!isMXEnabled()) {
    return NextResponse.json({ available: false, provider: "mx" });
  }

  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const connectionType = (req.nextUrl.searchParams.get("type") ?? "business") as "business" | "personal";

  let userGuid: string;
  try {
    userGuid = await createOrGetUser(merchantId);
  } catch (e) {
    return NextResponse.json({ error: { code: "bad_gateway", message: e instanceof Error ? e.message : String(e) } }, { status: 502 });
  }

  const accounts = await getAllAccounts(userGuid);
  if (accounts.length === 0) {
    return NextResponse.json({ accounts: [], reconciled: 0 });
  }

  // Fetch institutions in parallel, once per unique code.
  const codes = Array.from(new Set(accounts.map((a) => a.institution_code).filter(Boolean) as string[]));
  const institutions = new Map<string, { name?: string; medium_logo_url?: string }>();
  await Promise.all(codes.map(async (code) => {
    try {
      const inst = await getInstitution(code);
      if (inst) institutions.set(code, inst);
    } catch { /* best-effort */ }
  }));

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Upsert one row per MX account.
  const rows = accounts.map((a) => {
    const inst = a.institution_code ? institutions.get(a.institution_code) : undefined;
    return {
      merchant_id: merchantId,
      connection_type: connectionType,
      provider: "mx",
      mx_user_guid: userGuid,
      mx_member_guid: a.member_guid,
      mx_account_guid: a.guid,
      institution_name: inst?.name ?? a.name ?? "Bank",
      institution_logo_url: inst?.medium_logo_url ?? null,
      account_type: (a.type ?? "CHECKING").toLowerCase(),
      account_number_last4: (a.account_number ?? "").slice(-4) || null,
      routing_number: a.routing_number ?? null,
      currency: a.currency_code ?? "CAD",
      balance_synced: Number(a.balance ?? 0),
      balance_synced_at: now,
      verified_at: now,
      status: "active",
    };
  });

  // Upsert by (merchant_id, provider, mx_account_guid). The table's
  // default unique index is on `id` only, so we simulate the upsert
  // by selecting existing rows first and updating when found.
  let reconciled = 0;
  for (const r of rows) {
    const { data: existing } = await db
      .from("zenipay_bank_connections")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("provider", "mx")
      .eq("mx_account_guid", r.mx_account_guid)
      .maybeSingle();
    if (existing?.id) {
      await db.from("zenipay_bank_connections")
        .update({
          balance_synced: r.balance_synced,
          balance_synced_at: r.balance_synced_at,
          institution_name: r.institution_name,
          institution_logo_url: r.institution_logo_url,
          account_type: r.account_type,
          account_number_last4: r.account_number_last4,
          routing_number: r.routing_number,
          currency: r.currency,
          status: "active",
        })
        .eq("id", existing.id);
    } else {
      await db.from("zenipay_bank_connections")
        .insert({ id: `bank_${crypto.randomUUID()}`, ...r });
    }
    reconciled += 1;
  }

  return NextResponse.json({
    reconciled,
    user_guid: userGuid,
    accounts: rows.map((r) => ({
      institution_name: r.institution_name,
      account_type: r.account_type,
      last4: r.account_number_last4,
      balance: r.balance_synced,
      currency: r.currency,
    })),
  });
}
