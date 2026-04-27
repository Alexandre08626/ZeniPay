// GET /api/v1/agents/accounting/company-overview
//
// Aggregates the merchant's actual accounting picture for the
// Accounting overview page in the agents shell. Resolves the org →
// merchant via zenipay_merchant_agent_org_map (the same scope guard
// the chat tools use), then returns:
//
//   - summary  : revenue / outstanding / expenses / net by period
//   - accounts : current ZeniPay account balances
//   - invoices : every invoice for this merchant, newest-first
//   - ledger   : last 50 ledger entries (canonical money movements)
//
// All reads are scoped by merchant_id derived from the session — the
// caller can't escape their org's boundary.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  currency: string | null;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface LedgerRow {
  id: string;
  payment_id: string | null;
  event_type: string | null;
  direction: "debit" | "credit" | null;
  amount: number | string | null;
  currency: string | null;
  note: string | null;
  created_at: string;
}

interface AccountRow {
  id: string;
  account_name: string | null;
  account_type: string | null;
  balance: number | string | null;
  currency: string | null;
  is_primary: boolean | null;
  status: string | null;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// MTD = current calendar month (UTC), YTD = current calendar year (UTC).
function periodStarts(now: Date): { mtd: string; ytd: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const mtd = new Date(Date.UTC(y, m, 1)).toISOString();
  const ytd = new Date(Date.UTC(y, 0, 1)).toISOString();
  return { mtd, ytd };
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getSupabaseAdmin();

  // Resolve org → merchant using the same join the chat tools rely on.
  const { data: link } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!link?.merchant_id) {
    return NextResponse.json(
      {
        error: "no_merchant_linked",
        message: "This agent organization isn't linked to a ZeniPay merchant yet.",
      },
      { status: 400 },
    );
  }
  const merchantId = link.merchant_id as string;

  const [accountsRes, invoicesRes, ledgerRes] = await Promise.all([
    db.from("zenipay_accounts")
      .select("id, account_name, account_type, balance, currency, is_primary, status")
      .eq("merchant_id", merchantId)
      .order("is_primary", { ascending: false }),
    db.from("zenipay_invoices")
      .select("id, invoice_number, customer_name, customer_email, subtotal, tax, total, currency, status, due_date, paid_at, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }),
    db.from("zenipay_ledger")
      .select("id, payment_id, event_type, direction, amount, currency, note, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const accounts = (accountsRes.data ?? []) as AccountRow[];
  const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
  const ledger   = (ledgerRes.data ?? [])   as LedgerRow[];

  const now = new Date();
  const { mtd, ytd } = periodStarts(now);

  // Revenue from PAID invoices only (status='paid' or paid_at set).
  const paidInvoices = invoices.filter((i) => (i.status ?? "").toLowerCase() === "paid" || !!i.paid_at);
  const sumInvoices = (rows: InvoiceRow[], from?: string) =>
    rows
      .filter((i) => !from || (i.paid_at ?? i.created_at) >= from)
      .reduce((s, i) => s + num(i.total), 0);

  // Outstanding = invoices NOT paid (draft, sent, overdue, …).
  const outstandingInvoices = invoices.filter((i) => {
    const s = (i.status ?? "").toLowerCase();
    return s !== "paid" && s !== "void" && s !== "cancelled" && !i.paid_at;
  });

  // Expenses from ledger debits, grouped by event_type so the merchant
  // sees fees vs transfers vs payouts at a glance.
  const debits = ledger.filter((l) => l.direction === "debit");
  const credits = ledger.filter((l) => l.direction === "credit");
  const sumLedger = (rows: LedgerRow[], from?: string) =>
    rows.filter((l) => !from || l.created_at >= from).reduce((s, l) => s + num(l.amount), 0);

  const expensesByCategory: Record<string, number> = {};
  for (const d of debits) {
    const k = d.event_type || "other";
    expensesByCategory[k] = (expensesByCategory[k] ?? 0) + num(d.amount);
  }

  const totalAccountBalance = accounts.reduce((s, a) => s + num(a.balance), 0);
  const primaryCurrency = accounts.find((a) => a.is_primary)?.currency
    || accounts[0]?.currency
    || "CAD";

  const summary = {
    revenue: {
      total:    sumInvoices(paidInvoices),
      mtd:      sumInvoices(paidInvoices, mtd),
      ytd:      sumInvoices(paidInvoices, ytd),
      currency: primaryCurrency,
    },
    outstanding: {
      total:    outstandingInvoices.reduce((s, i) => s + num(i.total), 0),
      count:    outstandingInvoices.length,
      currency: primaryCurrency,
    },
    expenses: {
      total:      sumLedger(debits),
      mtd:        sumLedger(debits, mtd),
      ytd:        sumLedger(debits, ytd),
      by_category: expensesByCategory,
      currency:   primaryCurrency,
    },
    cashflow: {
      // Ledger-based: credits - debits (matches what's actually in the wallet).
      net_total: sumLedger(credits) - sumLedger(debits),
      net_mtd:   sumLedger(credits, mtd) - sumLedger(debits, mtd),
      net_ytd:   sumLedger(credits, ytd) - sumLedger(debits, ytd),
      currency:  primaryCurrency,
    },
    counts: {
      invoices_total: invoices.length,
      invoices_paid:  paidInvoices.length,
      invoices_open:  outstandingInvoices.length,
      ledger_entries: ledger.length,
      accounts:       accounts.length,
    },
    balances: {
      total_across_accounts: totalAccountBalance,
      currency: primaryCurrency,
    },
  };

  return NextResponse.json({
    merchant_id: merchantId,
    summary,
    accounts,
    invoices,
    ledger,
  });
}
