// GET /api/v1/personal/accounts?merchant_id=...
// POST same path with { merchant_id, name, account_type, currency }
//
// Lists / creates personal accounts. Backed by zenipay_personal_accounts
// (table populated by Claude Web; we don't redefine its shape here).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const merchantIdResult = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (merchantIdResult instanceof NextResponse) return merchantIdResult;
  const merchantId = merchantIdResult;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_personal_accounts")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ accounts: data ?? [] });
}

interface CreateBody {
  merchant_id?: string;
  name?: string;
  account_type?: "checking" | "savings" | "investment" | "crypto";
  currency?: string;
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: CreateBody;
  try { body = await req.json() as CreateBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const merchantIdResult = resolveMerchantId(session, body.merchant_id ?? null);
  if (merchantIdResult instanceof NextResponse) return merchantIdResult;
  const merchantId = merchantIdResult;
  const name       = String(body.name ?? "").trim();
  const accountType = String(body.account_type ?? "checking").toLowerCase();
  const currency   = String(body.currency ?? "CAD").toUpperCase();

  if (name.length < 2) return NextResponse.json({ error: { code: "bad_request", message: "name_required" } }, { status: 400 });
  if (!["checking", "savings", "investment", "crypto"].includes(accountType)) {
    return NextResponse.json({ error: { code: "bad_request", message: "account_type_invalid" } }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // profile_id is NOT NULL with no default, so fetch it from the
  // merchant's personal profile (1:1 with the merchant in our model).
  const { data: profile, error: profileErr } = await db
    .from("zenipay_personal_profiles")
    .select("id, country")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (profileErr) {
    return NextResponse.json({ error: { code: "server_error", message: profileErr.message } }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json(
      { error: { code: "personal_profile_missing", message: "No personal profile linked to this account." } },
      { status: 400 },
    );
  }

  const { data: existing } = await db
    .from("zenipay_personal_accounts")
    .select("id")
    .eq("merchant_id", merchantId);
  const isFirst = !existing || existing.length === 0;

  // Normalize the user-facing account_type to the DB convention
  // (personal_checking, personal_savings, …) so it lines up with the
  // business-side pattern (business_checking) and with the row the
  // /register/personal endpoint seeds at signup.
  const dbAccountType = `personal_${accountType}`;
  const country = (profile.country as string | null)?.toUpperCase() === "US" ? "US" : "CA";
  const zpRoutingCode = country === "US" ? "ZPUS0001" : "ZPCA0001";
  // 9-digit numeric, matches the format used at signup.
  const zpAccountNumber = `ZP${Math.floor(Math.random() * 9e8 + 1e8)}`;

  const { data, error } = await db
    .from("zenipay_personal_accounts")
    .insert({
      profile_id:        profile.id,
      merchant_id:       merchantId,
      account_name:      name,
      account_type:      dbAccountType,
      balance:           0,
      currency,
      is_primary:        isFirst,
      zp_account_number: zpAccountNumber,
      zp_routing_code:   zpRoutingCode,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ account: data });
}
