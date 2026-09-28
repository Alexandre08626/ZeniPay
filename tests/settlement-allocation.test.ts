import { describe, it, expect, vi } from "vitest";
const finix = vi.fn();
vi.mock("@/lib/finix/client", () => ({ finixRequest: (o: any) => finix(o) }));
import { computeAllocation, applySettlement } from "@/lib/zenipay/settlement-allocation";

function db(t: Record<string, any[]>) {
  return {
    from: (table: string) => {
      const rows = (t[table] ||= []);
      const st: any = { f: [] };
      const api: any = {
        select: () => api, limit: () => api, like: () => api,
        maybeSingle: () => { st.single = true; return api; },
        eq: (k: string, v: any) => { st.f.push([k, v]); return api; },
        insert: (r: any) => { st.ins = r; return api; },
        update: (p: any) => { st.upd = p; return api; },
        then: (res: any) => {
          if (st.ins) { rows.push(st.ins); return res({ error: null }); }
          const m = rows.filter((r) => st.f.every(([k, v]: any) => r[k] === v));
          if (st.upd) { m.forEach((r) => Object.assign(r, st.upd)); return res({ error: null }); }
          return res({ data: st.single ? m[0] ?? null : m, error: null });
        },
      };
      return api;
    },
  } as any;
}

describe("settlement allocation (shared Finix merchant)", () => {
  const base = () => ({
    zenipay_merchants: [
      { id: "zeniva-travel", config: { transactions: [{ transfer_id: "TR_ZV", amount: 215.23 }] } },
      { id: "zenicorp-0001", config: { transactions: [{ transfer_id: "TR_ZC", amount: 2000 }] } },
    ],
    zenipay_payments: [],
    zenipay_ledger: [
      { id: "l1", merchant_id: "zeniva-travel", event_type: "customer_payment", direction: "credit", amount: 215.23, created_at: "2026-09-06" },
      { id: "l2", merchant_id: "zenicorp-0001", event_type: "customer_payment", direction: "credit", amount: 2000, created_at: "2026-09-27" },
    ],
    zenipay_accounts: [
      { id: "a1", merchant_id: "zeniva-travel", is_primary: true, balance: 216.23 },
      { id: "a2", merchant_id: "zenicorp-0001", is_primary: true, balance: 2000 },
    ],
  });

  it("books each merchant's own transfers", async () => {
    finix.mockResolvedValue({ status: 200, data: { _embedded: { transfers: [{ id: "TR_ZC", amount: 200000, type: "DEBIT" }] } } });
    const t = base();
    const r = await computeAllocation(db(t), { id: "ST1", total_amount: 200000, created_at: "2026-09-27T18:00" });
    expect(r.allocations).toEqual([{ merchantId: "zenicorp-0001", amount: 2000, source: "transfers" }]);
    await applySettlement(db(t), { id: "ST1", total_amount: 200000 });
    expect(t.zenipay_accounts.find((a) => a.id === "a2")!.balance).toBe(0);
    expect(t.zenipay_accounts.find((a) => a.id === "a1")!.balance).toBe(216.23); // untouched
    await applySettlement(db(t), { id: "ST1", total_amount: 200000 }); // redelivery
    expect(t.zenipay_ledger.filter((l) => l.event_type === "settlement_to_bank")).toHaveLength(1);
  });

  it("falls back to money received before the settlement, oldest first", async () => {
    finix.mockResolvedValue({ status: 404, data: {} });
    const t = base();
    // Settlement from Sept 7 can only contain Zeniva's Sept 6 payment.
    const r = await computeAllocation(db(t), { id: "ST0", total_amount: 21523, created_at: "2026-09-07" });
    expect(r.allocations).toEqual([{ merchantId: "zeniva-travel", amount: 215.23, source: "fifo" }]);
    // A settlement older than every payment is left unallocated.
    const old = await computeAllocation(db(t), { id: "STold", total_amount: 300, created_at: "2026-04-30" });
    expect(old.allocations).toEqual([]);
    expect(old.unmatched).toBe(3);
  });
});
