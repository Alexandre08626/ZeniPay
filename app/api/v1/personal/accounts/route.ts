// GET /api/v1/personal/accounts?merchant_id=...
// POST same path with { merchant_id, name, account_type, currency }
//
// Lists / creates personal accounts. Backed by zenipay_personal_accounts
// (table populated by Claude Web; we don't redefine its shape here).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
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
  let body: CreateBody;
  try { body = await req.json() as CreateBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const merchantId = String(body.merchant_id ?? "").trim();
  const name       = String(body.name ?? "").trim();
  const accountType = String(body.account_type ?? "checking").toLowerCase();
  const currency   = String(body.currency ?? "CAD").toUpperCase();

  if (!merchantId) return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: { code: "bad_request", message: "name_required" } }, { status: 400 });
  if (!["checking", "savings", "investment", "crypto"].includes(accountType)) {
    return NextResponse.json({ error: { code: "bad_request", message: "account_type_invalid" } }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("zenipay_personal_accounts")
    .select("id")
    .eq("merchant_id", merchantId);
  const isFirst = !existing || existing.length === 0;
  const accountNumber = `PA${Math.random().toString(36).toUpperCase().slice(2, 12)}`;

  const id = `pa_${crypto.randomUUID()}`;
  const { data, error } = await db
    .from("zenipay_personal_accounts")
    .insert({
      id,
      merchant_id: merchantId,
      name,
      account_type: accountType,
      account_number: accountNumber,
      balance: 0,
      currency,
      status: "active",
      is_primary: isFirst,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ account: data });
}
