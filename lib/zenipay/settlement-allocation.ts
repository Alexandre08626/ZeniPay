// Settlement → bank, split per merchant.
//
// All ZeniPay merchants share ONE Finix merchant (FINIX_MERCHANT_ID). When
// Finix sweeps that account to the bank, the settlement contains transfers
// from several ZeniPay merchants. The old handler booked the whole amount
// on whichever merchant owned FINIX_MERCHANT_ID (Zeniva Travel), so e.g.
// ZeniCorp's $2,000 was debited from Zeniva Travel (2026-09-28).
//
// Allocation: ask Finix which transfers the settlement contains, map each
// transfer to its ZeniPay merchant (payment metadata or the merchant's
// config.transactions), and debit each merchant for its own share.
// Anything unmatched goes to merchants with unsettled money, oldest first.

import type { SupabaseClient } from "@supabase/supabase-js";
import { finixRequest } from "@/lib/finix/client";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Allocation { merchantId: string; amount: number; source: "transfers" | "fifo" }

interface FinixTransfer { id: string; amount: number; type?: string; subtype?: string; state?: string }

async function settlementTransfers(settlementId: string): Promise<FinixTransfer[] | null> {
  const out: FinixTransfer[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await finixRequest<{ _embedded?: { transfers?: FinixTransfer[] } }>({
      method: "GET",
      path: `/settlements/${settlementId}/transfers?limit=100&offset=${page * 100}`,
    });
    if (res.status >= 400) return null;
    const list = res.data._embedded?.transfers ?? [];
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

/** transfer id → merchant id, from payments metadata and merchants' config.transactions. */
async function transferOwners(supabase: SupabaseClient): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  const { data: pays } = await supabase.from("zenipay_payments").select("merchant_id, metadata").limit(5000);
  for (const p of pays || []) {
    const t = String((p.metadata as any)?.gateway_transfer_id || "");
    if (t && p.merchant_id) owners.set(t, String(p.merchant_id));
  }
  const { data: ms } = await supabase.from("zenipay_merchants").select("id, config");
  for (const m of ms || []) {
    for (const tx of ((m.config as any)?.transactions || []) as Array<Record<string, unknown>>) {
      const t = String(tx.transfer_id || tx.gateway_transfer_id || "");
      if (t && !owners.has(t)) owners.set(t, String(m.id));
    }
  }
  return owners;
}

/** Per merchant: customer money received minus what already went to the bank / was refunded. */
async function unsettledByMerchant(supabase: SupabaseClient, before?: string): Promise<Array<{ merchantId: string; amount: number; oldest: string }>> {
  const { data } = await supabase.from("zenipay_ledger").select("merchant_id, event_type, direction, amount, created_at");
  const acc = new Map<string, { amount: number; oldest: string }>();
  for (const r of data || []) {
    const mid = String(r.merchant_id || "");
    if (!mid) continue;
    const cur = acc.get(mid) || { amount: 0, oldest: "9999" };
    const amt = Number(r.amount) || 0;
    if (r.event_type === "customer_payment" && r.direction === "credit") {
      // A settlement can only contain money received before it was created.
      if (before && String(r.created_at) > before) { acc.set(mid, cur); continue; }
      cur.amount += amt;
      if (String(r.created_at) < cur.oldest) cur.oldest = String(r.created_at);
    } else if (["settlement_to_bank", "refund"].includes(String(r.event_type)) && r.direction === "debit") cur.amount -= amt;
    else if (r.event_type === "settlement_correction") cur.amount += r.direction === "credit" ? amt : -amt;
    acc.set(mid, cur);
  }
  return Array.from(acc.entries())
    .map(([merchantId, v]) => ({ merchantId, amount: round2(v.amount), oldest: v.oldest }))
    .filter((x) => x.amount > 0.004)
    .sort((a, b) => a.oldest.localeCompare(b.oldest));
}

export async function computeAllocation(
  supabase: SupabaseClient,
  settlement: { id: string; total_amount: number; created_at?: string },
): Promise<{ allocations: Allocation[]; matchedTransfers: number; unmatched: number }> {
  const total = round2(Number(settlement.total_amount || 0) / 100);
  const byMerchant = new Map<string, number>();
  let matched = 0;
  let matchedTransfers = 0;

  const transfers = await settlementTransfers(settlement.id);
  if (transfers) {
    const owners = await transferOwners(supabase);
    for (const t of transfers) {
      const owner = owners.get(t.id);
      if (!owner) continue;
      const type = String(t.type || "").toUpperCase();
      const sign = type === "REVERSAL" || type === "CREDIT" ? -1 : type === "DEBIT" || !type ? 1 : 0;
      if (!sign) continue;
      const amt = round2((Number(t.amount) || 0) / 100) * sign;
      byMerchant.set(owner, round2((byMerchant.get(owner) || 0) + amt));
      matched = round2(matched + amt);
      matchedTransfers++;
    }
  }

  const allocations: Allocation[] = Array.from(byMerchant.entries())
    .filter(([, a]) => a > 0)
    .map(([merchantId, amount]) => ({ merchantId, amount, source: "transfers" as const }));

  let rest = round2(total - allocations.reduce((s, a) => s + a.amount, 0));
  if (rest > 0.004) {
    const already = new Map(allocations.map((a) => [a.merchantId, a.amount]));
    for (const u of await unsettledByMerchant(supabase, settlement.created_at)) {
      const free = round2(u.amount - (already.get(u.merchantId) || 0));
      if (free <= 0) continue;
      const take = round2(Math.min(free, rest));
      allocations.push({ merchantId: u.merchantId, amount: take, source: "fifo" });
      rest = round2(rest - take);
      if (rest <= 0.004) break;
    }
  }
  return { allocations, matchedTransfers, unmatched: Math.max(0, rest) };
}

/**
 * Book the settlement: one settlement_to_bank ledger debit per merchant
 * (idempotent per settlement+merchant) and the merchant's primary account
 * debited by its share (floored at 0).
 */
export async function applySettlement(
  supabase: SupabaseClient,
  settlement: { id: string; total_amount: number; currency?: string; created_at?: string },
  now = new Date().toISOString(),
): Promise<Allocation[]> {
  const { allocations } = await computeAllocation(supabase, settlement);
  const done: Allocation[] = [];
  for (const a of allocations) {
    const ledgerId = `led_settle_${settlement.id}_${a.merchantId.slice(0, 8)}`;
    const { data: existing } = await supabase.from("zenipay_ledger").select("id").eq("id", ledgerId).maybeSingle();
    if (existing) continue;
    const { error } = await supabase.from("zenipay_ledger").insert({
      id: ledgerId, payment_id: null, merchant_id: a.merchantId,
      event_type: "settlement_to_bank", wallet_type: "platform", direction: "debit",
      amount: a.amount, currency: settlement.currency || "CAD", reference: settlement.id,
      note: `Settlement sent to bank account (Finix ${settlement.id})`, created_at: now,
    });
    if (error) { console.error("[settlement] ledger insert failed", error.message); continue; }
    const { data: acct } = await supabase.from("zenipay_accounts").select("id, balance")
      .eq("merchant_id", a.merchantId).eq("is_primary", true).maybeSingle();
    if (acct) {
      const next = round2(Math.max(0, Number(acct.balance || 0) - a.amount));
      await supabase.from("zenipay_accounts").update({ balance: next, updated_at: now }).eq("id", acct.id);
    }
    done.push(a);
  }
  return done;
}
