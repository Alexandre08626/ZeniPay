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
import { getSupabaseAdmin, pgrest } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

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

function ledgerLabel(eventType: string, note?: string | null): string {
  if (eventType === "manual_adjustment" && note) {
    if (/^to personal/i.test(note))   return "Transfer to personal";
    if (/^from personal/i.test(note)) return "Transfer from personal";
    return note;
  }
  switch (eventType) {
    case "fund_agent_treasury": return "Fund agent treasury";
    case "transfer_to_agent":   return "Transfer to agent";
    case "refund":              return "Refund";
    case "fee":                 return "Fee";
    case "payout":              return "Payout";
    case "manual_adjustment":   return "Manual adjustment";
    default:                    return capitalize(eventType);
  }
}

function ledgerCounterparty(eventType: string, note?: string | null): string {
  if (eventType === "manual_adjustment" && note && /personal/i.test(note)) {
    return "Personal account";
  }
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
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const merchantIdResult = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (merchantIdResult instanceof NextResponse) return merchantIdResult;
  const mid = merchantIdResult;
  const accountIdFilter = (req.nextUrl.searchParams.get("account_id") ?? "").trim() || null;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "200") || 200, 500);

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

  // Direct PostgREST fetches with cache:'no-store' — the Supabase JS client
  // singleton has shown stale/empty results on the transfers table under
  // some Vercel lambda reuse conditions. pgrest() is the ground truth.
  const enc = encodeURIComponent;
  const [payments, transfers, ledger, legacyPayouts, payoutRequests] = await Promise.all([
    pgrest(`zenipay_payments?select=id,amount,status,created_at,customer_name,currency,description,card_brand,card_last4&merchant_id=eq.${enc(mid)}&order=created_at.desc&limit=${limit}`)
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: [], error })),
    pgrest(`zenipay_transfers?select=*&merchant_id=eq.${enc(mid)}&order=created_at.desc&limit=${limit}`)
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: [], error })),
    pgrest(`zenipay_ledger?select=id,payment_id,event_type,direction,amount,currency,note,reference,created_at&merchant_id=eq.${enc(mid)}&event_type=neq.customer_payment&order=created_at.desc&limit=${limit}`)
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: [], error })),
    pgrest(`zenipay_payouts?select=*&merchant_id=eq.${enc(mid)}&order=created_at.desc&limit=${limit}`)
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: [], error })),
    pgrest(`zenipay_payout_requests?select=id,destination_id,amount_units,currency,status,estimated_arrival,memo,created_at&merchant_id=eq.${enc(mid)}&order=created_at.desc&limit=${limit}`)
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: [], error })),
  ]);
  const payouts = legacyPayouts;

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
      kind: ledgerKind(l.event_type, l.direction as "debit" | "credit"),
      direction: l.direction === "credit" ? "in" : "out",
      date: l.created_at,
      amount: Math.abs(Number(l.amount || 0)),
      currency: l.currency || "CAD",
      description: ledgerLabel(l.event_type, l.note) || l.note || capitalize(l.event_type),
      counterparty: ledgerCounterparty(l.event_type, l.note),
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

  // PR 15 — withdrawal requests (zenipay_payout_requests). We already
  // wrote a matching zenipay_ledger row at request time, so drop that
  // duplicate from the feed by matching on ledger.reference === payout.id.
  const payoutIds = new Set(((payoutRequests.data ?? []) as Array<{ id: string }>).map((p) => p.id));
  // Remove ledger rows that are mirrors of a payout_request (we'll emit
  // a richer row from the payout_request itself below).
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.source === "ledger") {
      const ref = (r.metadata as { reference?: string })?.reference;
      if (ref && payoutIds.has(ref)) rows.splice(i, 1);
    }
  }
  for (const p of (payoutRequests.data ?? []) as Array<{
    id: string; destination_id: string | null; amount_units: number | string;
    currency: string; status: string; estimated_arrival: string | null;
    memo: string | null; created_at: string;
  }>) {
    if (accountIdFilter && !isPrimaryAccount) continue;
    rows.push({
      id: `wd_${p.id}`,
      source: "payout",
      kind: "payout_out",
      direction: "out",
      date: p.created_at,
      amount: Math.abs(Number(p.amount_units || 0)),
      currency: p.currency || "CAD",
      description: p.memo || "Withdrawal",
      counterparty: "External bank",
      status: p.status,
      account_id: null,
      metadata: {
        payout_id: p.id,
        destination_id: p.destination_id,
        estimated_arrival: p.estimated_arrival,
      },
    });
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ activity: rows.slice(0, limit) });
}
