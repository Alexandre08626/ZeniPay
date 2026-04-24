// GET /api/zenipay/merchant-activity?merchant_id=X[&account_id=Y][&limit=200]
//
// Canonical money-movement feed for every merchant-side UI. Aggregates
// the four sources of truth (zenipay_payments, zenipay_transfers,
// zenipay_ledger, zenipay_payouts) into one normalized array so pages
// like /app/transactions, /app/accounts/[id], /app/overview never have
// to reason about table names again.
//
// Architectural rule: any new money event MUST land in zenipay_ledger
// (the backbone). Enriched tables (payments/transfers/payouts) are
// optional and only add richer metadata to a subset of ledger events.
// This endpoint dedupes them so the same dollar isn't double-counted.
//
// Response shape:
//   { activity: ActivityRow[] }
//
// ActivityRow fields are stable — downstream UIs rely on them.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export type ActivityKind =
  | "payment_in"
  | "transfer_out"
  | "transfer_in"
  | "transfer_fee"
  | "payout_out"
  | "agent_treasury_fund"
  | "transfer_to_agent"
  | "refund"
  | "fee"
  | "generic_debit"
  | "generic_credit";

interface ActivityRow {
  id: string;
  source: "payment" | "transfer" | "ledger" | "payout";
  kind: ActivityKind;
  direction: "in" | "out";
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  status: string;
  account_id: string | null;
  metadata: Record<string, unknown>;
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function ledgerLabel(eventType: string): string {
  switch (eventType) {
    case "fund_agent_treasury": return "Fund agent treasury";
    case "transfer_to_agent":   return "Transfer to agent";
    case "refund":              return "Refund";
    case "fee":                 return "Fee";
    case "payout":              return "Payout";
    default:                    return capitalize(eventType);
  }
}

function ledgerCounterparty(eventType: string): string {
  switch (eventType) {
    case "fund_agent_treasury":
    case "transfer_to_agent":
      return "Agent treasury";
    default:
      return "—";
  }
}

function ledgerKind(eventType: string, direction: "debit" | "credit"): ActivityKind {
  if (eventType === "fund_agent_treasury") return "agent_treasury_fund";
  if (eventType === "transfer_to_agent")   return "transfer_to_agent";
  if (eventType === "refund")              return "refund";
  if (eventType === "fee")                 return "fee";
  if (eventType === "payout")              return "payout_out";
  return direction === "credit" ? "generic_credit" : "generic_debit";
}

export async function GET(req: NextRequest) {
  const mid = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  const accountIdFilter = (req.nextUrl.searchParams.get("account_id") ?? "").trim() || null;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200") || 200, 500);
  if (!mid) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Resolve whether account_id (if provided) is the primary account — payments,
  // ledger, and payouts don't carry account_id, so we attribute them there.
  let isPrimaryAccount = false;
  if (accountIdFilter) {
    const { data: acc } = await db
      .from("zenipay_accounts")
      .select("id, is_primary")
      .eq("id", accountIdFilter)
      .eq("merchant_id", mid)
      .maybeSingle();
    isPrimaryAccount = !!acc?.is_primary;
    if (!acc) return NextResponse.json({ activity: [] });
  }

  const [payments, transfers, ledger, payouts] = await Promise.all([
    db.from("zenipay_payments")
      .select("id,amount,status,created_at,customer_name,currency,description,card_brand,card_last4")
      .eq("merchant_id", mid)
      .order("created_at", { ascending: false })
      .limit(limit),
    db.from("zenipay_transfers")
      .select("*")
      .eq("merchant_id", mid)
      .order("created_at", { ascending: false })
      .limit(limit),
    db.from("zenipay_ledger")
      .select("id,payment_id,event_type,direction,amount,currency,note,reference,created_at")
      .eq("merchant_id", mid)
      .neq("event_type", "customer_payment")
      .order("created_at", { ascending: false })
      .limit(limit),
    db.from("zenipay_payouts")
      .select("*")
      .eq("merchant_id", mid)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const rows: ActivityRow[] = [];

  // Payments (income from Finix gateway). Attributed to the primary
  // account — the only place ZeniPay deposits card revenue today.
  for (const p of (payments.data ?? []) as Array<{
    id: string; amount: number | string; status: string; created_at: string;
    customer_name: string | null; currency: string | null; description: string | null;
    card_brand: string | null; card_last4: string | null;
  }>) {
    if (accountIdFilter && !isPrimaryAccount) continue;
    rows.push({
      id: `pay_${p.id}`,
      source: "payment",
      kind: "payment_in",
      direction: "in",
      date: p.created_at,
      amount: Math.abs(Number(p.amount || 0)),
      currency: p.currency || "CAD",
      description: p.description || "Payment received",
      counterparty: p.customer_name || "—",
      status: p.status || "succeeded",
      account_id: null,
      metadata: { payment_id: p.id, card_brand: p.card_brand, card_last4: p.card_last4 },
    });
  }

  // Transfers: user-initiated ACH/wire/internal with its own metadata
  // (recipient, account numbers). Emit one row per leg + one fee row.
  for (const t of (transfers.data ?? []) as Array<{
    id: string; transfer_type: string; recipient_name: string | null;
    amount: number | string; fee: number | string; status: string;
    memo: string | null; created_at: string;
    from_account_id: string | null; to_account_id: string | null;
  }>) {
    const isInternal = t.transfer_type === "internal";
    const matchesFilter = !accountIdFilter ||
      t.from_account_id === accountIdFilter ||
      t.to_account_id === accountIdFilter;
    if (!matchesFilter) continue;

    // The outgoing leg (debits from_account).
    const outgoing: ActivityRow = {
      id: `trf_${t.id}`,
      source: "transfer",
      kind: isInternal ? "transfer_out" : "transfer_out",
      direction: "out",
      date: t.created_at,
      amount: Math.abs(Number(t.amount || 0)),
      currency: "CAD",
      description: t.memo || capitalize(t.transfer_type),
      counterparty: t.recipient_name || (isInternal ? "Internal" : "—"),
      status: t.status || "completed",
      account_id: t.from_account_id,
      metadata: { transfer_type: t.transfer_type, to_account_id: t.to_account_id },
    };
    rows.push(outgoing);

    // Internal transfers also credit the to_account. Surface that side
    // so the destination account's Activity tab sees the incoming leg.
    if (isInternal && t.to_account_id) {
      rows.push({
        id: `trf_${t.id}_in`,
        source: "transfer",
        kind: "transfer_in",
        direction: "in",
        date: t.created_at,
        amount: Math.abs(Number(t.amount || 0)),
        currency: "CAD",
        description: t.memo || "Internal transfer",
        counterparty: "Internal",
        status: t.status || "completed",
        account_id: t.to_account_id,
        metadata: { transfer_type: t.transfer_type, from_account_id: t.from_account_id },
      });
    }

    const fee = Number(t.fee || 0);
    if (fee > 0) {
      rows.push({
        id: `trf_${t.id}_fee`,
        source: "transfer",
        kind: "transfer_fee",
        direction: "out",
        date: t.created_at,
        amount: fee,
        currency: "CAD",
        description: `Fee · ${capitalize(t.transfer_type)}`,
        counterparty: t.recipient_name || "—",
        status: t.status || "completed",
        account_id: t.from_account_id,
        metadata: { transfer_id: t.id },
      });
    }
  }

  // Ledger: everything that isn't already covered above. `customer_payment`
  // was filtered at query time; skip any row whose payment_id is also in the
  // payments array (belt-and-suspenders dedup).
  const paymentIds = new Set(((payments.data ?? []) as Array<{ id: string }>).map((p) => p.id));
  for (const l of (ledger.data ?? []) as Array<{
    id: string; payment_id: string | null; event_type: string;
    direction: "debit" | "credit"; amount: number | string;
    currency: string | null; note: string | null; reference: string | null;
    created_at: string;
  }>) {
    if (l.payment_id && paymentIds.has(l.payment_id)) continue;
    if (accountIdFilter && !isPrimaryAccount) continue;
    rows.push({
      id: `led_${l.id}`,
      source: "ledger",
      kind: ledgerKind(l.event_type, l.direction),
      direction: l.direction === "credit" ? "in" : "out",
      date: l.created_at,
      amount: Math.abs(Number(l.amount || 0)),
      currency: l.currency || "CAD",
      description: l.note || ledgerLabel(l.event_type),
      counterparty: ledgerCounterparty(l.event_type),
      status: "completed",
      account_id: null,
      metadata: { event_type: l.event_type, reference: l.reference },
    });
  }

  // Payouts: explicit external pay-outs with their own lifecycle.
  for (const p of (payouts.data ?? []) as Array<{
    id: string; amount: number | string; method: string | null;
    recipient_name: string | null; status: string | null; created_at: string | null;
    currency: string | null;
  }>) {
    if (accountIdFilter && !isPrimaryAccount) continue;
    rows.push({
      id: `out_${p.id}`,
      source: "payout",
      kind: "payout_out",
      direction: "out",
      date: p.created_at || new Date().toISOString(),
      amount: Math.abs(Number(p.amount || 0)),
      currency: p.currency || "CAD",
      description: `Payout · ${p.method || "external"}`,
      counterparty: p.recipient_name || "—",
      status: p.status || "processing",
      account_id: null,
      metadata: { method: p.method },
    });
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ activity: rows.slice(0, limit) });
}
