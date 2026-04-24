// GET /api/v1/personal/transactions?merchant_id=&account_id=&type=&from=&to=&limit=
// POST same path: { merchant_id, account_id, type, amount, currency, description?, category? }
//
// Personal-side transactions (zenipay_personal_transactions). POST also
// debits/credits the account balance atomically (single mutation).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const merchantId = sp.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  const accountId = sp.get("account_id")?.trim();
  const type = sp.get("type")?.trim();
  const from = sp.get("from")?.trim();
  const to   = sp.get("to")?.trim();
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")));

  const db = getSupabaseAdmin();
  let q = db.from("zenipay_personal_transactions").select("*").eq("merchant_id", merchantId);
  if (accountId) q = q.eq("account_id", accountId);
  if (type)      q = q.eq("type", type);
  if (from)      q = q.gte("created_at", from);
  if (to)        q = q.lte("created_at", to);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ transactions: data ?? [] });
}

interface CreateBody {
  merchant_id?: string;
  account_id?: string;
  type?: string;        // 'income' | 'expense' | 'transfer_in' | 'transfer_out'
  amount?: number;
  currency?: string;
  description?: string;
  category?: string;
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try { body = await req.json() as CreateBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const merchantId = String(body.merchant_id ?? "").trim();
  const accountId  = String(body.account_id  ?? "").trim();
  const type       = String(body.type ?? "").trim().toLowerCase();
  const amount     = Number(body.amount ?? NaN);
  const currency   = String(body.currency ?? "CAD").toUpperCase();
  const description = body.description ? String(body.description).slice(0, 200) : null;
  const category   = body.category ? String(body.category).slice(0, 64) : null;

  if (!merchantId || !accountId) return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_and_account_id_required" } }, { status: 400 });
  if (!["income", "expense", "transfer_in", "transfer_out"].includes(type)) {
    return NextResponse.json({ error: { code: "bad_request", message: "type_invalid" } }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: { code: "bad_request", message: "amount_must_be_positive" } }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: account } = await db
    .from("zenipay_personal_accounts")
    .select("id, merchant_id, balance, currency")
    .eq("id", accountId)
    .maybeSingle();
  if (!account || account.merchant_id !== merchantId) {
    return NextResponse.json({ error: { code: "not_found", message: "account_not_found" } }, { status: 404 });
  }

  const isCredit = type === "income" || type === "transfer_in";
  const newBalance = Number(account.balance ?? 0) + (isCredit ? amount : -amount);
  if (!isCredit && newBalance < 0) {
    return NextResponse.json({ error: { code: "unprocessable", message: "insufficient_funds" } }, { status: 422 });
  }

  const txId = `ptx_${crypto.randomUUID()}`;
  const { error: insErr } = await db.from("zenipay_personal_transactions").insert({
    id: txId,
    merchant_id: merchantId,
    account_id: accountId,
    type,
    amount,
    currency,
    description,
    category,
  });
  if (insErr) {
    return NextResponse.json({ error: { code: "server_error", message: insErr.message } }, { status: 500 });
  }
  await db.from("zenipay_personal_accounts").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("id", accountId);

  return NextResponse.json({
    transaction_id: txId,
    new_balance: newBalance,
    success: true,
  });
}
