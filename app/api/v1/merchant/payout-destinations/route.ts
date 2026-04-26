// GET  /api/v1/merchant/payout-destinations?merchant_id=X
// POST /api/v1/merchant/payout-destinations
//
// Manages the merchant's list of external bank / Interac destinations
// for Money-OUT. Service role bypasses RLS; merchant_id is provided
// by the client and the caller scopes every query on it.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

const TYPES = new Set(["ach", "wire", "interac", "internal"]);

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const mid = r;

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_payout_destinations")
    .select("*")
    .eq("merchant_id", mid)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return err("server_error", error.message, 500);
  return NextResponse.json({
    destinations: data ?? [],
    finix_payouts_ready: !!process.env.FINIX_PAYOUT_OPERATION_KEY,
  });
}

export async function POST(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({})) as {
    merchant_id?: string;
    nickname?: string;
    destination_type?: string;
    bank_name?: string;
    account_holder?: string;
    routing_number?: string;
    account_number?: string;
    swift_code?: string;
    interac_email?: string;
    currency?: string;
    set_default?: boolean;
  };

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId       = r;
  const nickname         = String(body.nickname ?? "").trim();
  const destinationType  = String(body.destination_type ?? "").trim().toLowerCase();
  const currency         = String(body.currency ?? "CAD").toUpperCase();

  if (!nickname)                             return err("bad_request", "nickname_required", 400);
  if (!TYPES.has(destinationType))           return err("bad_request", `destination_type must be one of ${Array.from(TYPES).join(", ")}`, 400);

  const bankName       = body.bank_name       ? String(body.bank_name).trim()       : null;
  const accountHolder  = body.account_holder  ? String(body.account_holder).trim()  : null;
  const routingNumber  = body.routing_number  ? String(body.routing_number).trim()  : null;
  const accountNumber  = body.account_number  ? String(body.account_number).trim()  : null;
  const swiftCode      = body.swift_code      ? String(body.swift_code).trim()      : null;
  const interacEmail   = body.interac_email   ? String(body.interac_email).trim()   : null;

  // Type-specific validation.
  if (destinationType === "ach") {
    if (!routingNumber || !accountNumber) return err("bad_request", "routing_number and account_number required for ach", 400);
  } else if (destinationType === "wire") {
    if (!accountNumber) return err("bad_request", "account_number required for wire", 400);
  } else if (destinationType === "interac") {
    if (!interacEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(interacEmail))
      return err("bad_request", "valid interac_email required", 400);
  } else if (destinationType === "internal") {
    if (!accountNumber) return err("bad_request", "account_number (ZeniPay account id) required for internal", 400);
  }

  const db = getSupabaseAdmin();
  const id = `pdest_${crypto.randomUUID()}`;

  // If caller asks for default, unset the existing default first.
  if (body.set_default === true) {
    await db.from("zenipay_payout_destinations")
      .update({ is_default: false })
      .eq("merchant_id", merchantId);
  }

  const { data, error } = await db
    .from("zenipay_payout_destinations")
    .insert({
      id,
      merchant_id:      merchantId,
      nickname,
      destination_type: destinationType,
      bank_name:        bankName,
      account_holder:   accountHolder,
      routing_number:   routingNumber,
      account_number:   accountNumber,
      swift_code:       swiftCode,
      interac_email:    interacEmail,
      currency,
      is_verified:      false,
      is_default:       !!body.set_default,
      created_at:       new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return err("server_error", error.message, 500);
  return NextResponse.json({ destination: data });
}
