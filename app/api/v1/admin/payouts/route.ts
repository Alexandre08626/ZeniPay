// GET /api/v1/admin/payouts
//
// Cross-merchant payouts dashboard data:
//   - merchants: every active merchant with balance + total_paid_out
//     + open_requests counts so the admin can see at a glance who
//     has cash to settle.
//   - history: most recent payout requests (zenipay_payout_requests),
//     up to 200 rows newest-first, joined with merchant business_name
//     so the table needs no follow-up lookups.
//   - summary: total_balance_held, total_paid_all_time,
//     pending_count, processing_count.
//
// Auth: x-admin-email allowlist (mirrors /api/v1/admin/agents +
// /api/v1/admin/revenue).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set([
  "zenipay@zeniva.ca",
  "info@zeniva.ca",
  "alexandreblais26@gmail.com",
]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

interface MerchantRow {
  id: string;
  business_name: string | null;
  email: string | null;
  status: string | null;
  country: string | null;
}

interface AccountRow {
  merchant_id: string;
  balance: number | string | null;
  currency: string | null;
  is_primary: boolean | null;
}

interface PayoutRequestRow {
  id: string;
  merchant_id: string;
  destination_id: string | null;
  amount_units: number | string;
  currency: string | null;
  status: string;
  finix_transfer_id: string | null;
  estimated_arrival: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  const [merchantsRes, accountsRes, requestsRes] = await Promise.all([
    db.from("zenipay_merchants")
      .select("id, business_name, email, status, country")
      .order("created_at", { ascending: false }),
    db.from("zenipay_accounts")
      .select("merchant_id, balance, currency, is_primary")
      .eq("status", "active"),
    db.from("zenipay_payout_requests")
      .select("id, merchant_id, destination_id, amount_units, currency, status, finix_transfer_id, estimated_arrival, memo, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const merchants = (merchantsRes.data ?? []) as MerchantRow[];
  const accounts  = (accountsRes.data  ?? []) as AccountRow[];
  const requests  = (requestsRes.data  ?? []) as PayoutRequestRow[];

  // Index balances by merchant_id (sum across accounts; we display the
  // primary currency separately further down).
  const balanceByMerchant = new Map<string, { total: number; primary: number; currency: string }>();
  for (const a of accounts) {
    const b = balanceByMerchant.get(a.merchant_id) ?? { total: 0, primary: 0, currency: a.currency || "CAD" };
    const amt = num(a.balance);
    b.total += amt;
    if (a.is_primary) {
      b.primary = amt;
      b.currency = a.currency || b.currency;
    }
    balanceByMerchant.set(a.merchant_id, b);
  }

  // Roll up payout-request totals per merchant.
  const paidByMerchant = new Map<string, { paid: number; pending: number; processing: number; failed: number }>();
  for (const r of requests) {
    const m = paidByMerchant.get(r.merchant_id) ?? { paid: 0, pending: 0, processing: 0, failed: 0 };
    const amt = num(r.amount_units);
    const s = (r.status || "").toLowerCase();
    if (s === "completed" || s === "succeeded") m.paid += amt;
    else if (s === "pending") m.pending += amt;
    else if (s === "processing" || s === "submitted") m.processing += amt;
    else if (s === "failed" || s === "cancelled") m.failed += amt;
    paidByMerchant.set(r.merchant_id, m);
  }

  // Build per-merchant snapshot rows.
  const merchantRows = merchants.map((m) => {
    const bal  = balanceByMerchant.get(m.id);
    const paid = paidByMerchant.get(m.id);
    return {
      id: m.id,
      business_name: m.business_name,
      email:         m.email,
      status:        m.status,
      country:       m.country,
      primary_balance:  bal?.primary  ?? 0,
      total_balance:    bal?.total    ?? 0,
      currency:         bal?.currency ?? "CAD",
      total_paid_out:   paid?.paid       ?? 0,
      pending_amount:   paid?.pending    ?? 0,
      processing_amount: paid?.processing ?? 0,
      open_requests: requests.filter((r) =>
        r.merchant_id === m.id &&
        ["pending", "processing", "submitted"].includes((r.status || "").toLowerCase())
      ).length,
    };
  });

  // Cross-merchant payout history. Lookup the merchant business_name
  // for each row so the table can render without a JS-side join.
  const nameById = new Map<string, string>();
  for (const m of merchants) if (m.business_name) nameById.set(m.id, m.business_name);
  const history = requests.map((r) => ({
    ...r,
    merchant_name: nameById.get(r.merchant_id) ?? r.merchant_id,
  }));

  // Aggregate summary.
  const totalBalanceHeld = merchantRows.reduce((s, m) => s + m.primary_balance, 0);
  const totalPaidAllTime = Array.from(paidByMerchant.values()).reduce((s, p) => s + p.paid, 0);
  const pendingCount = requests.filter((r) => (r.status || "").toLowerCase() === "pending").length;
  const processingCount = requests.filter((r) => {
    const s = (r.status || "").toLowerCase();
    return s === "processing" || s === "submitted";
  }).length;

  return NextResponse.json({
    merchants: merchantRows,
    history,
    summary: {
      total_balance_held: totalBalanceHeld,
      total_paid_all_time: totalPaidAllTime,
      pending_count: pendingCount,
      processing_count: processingCount,
      currency: "CAD",
    },
  });
}
