import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => {}) }));
import { resolvePlan, markInstallmentPaid, newPayToken, renderInstallmentEmail, type Installment } from "@/lib/zenipay/installments";
import { chargeableAmount, type PayTarget } from "@/lib/zenipay/pay-target";
import { sendEmail } from "@/lib/email/send";

// Minimal in-memory stand-in for the supabase-js query builder.
function fakeDb(tables: Record<string, any[]>) {
  const from = (table: string) => {
    const rows = (tables[table] ||= []);
    const st: { f: Array<[string, string, any]>; op?: string; patch?: any } = { f: [] };
    const match = (r: any) => st.f.every(([op, k, v]) => (op === "eq" ? r[k] === v : r[k] !== v));
    const api: any = {
      select: () => api, order: () => api, limit: () => api, maybeSingle: () => { st.op = st.op || "single"; return api; },
      eq: (k: string, v: any) => { st.f.push(["eq", k, v]); return api; },
      neq: (k: string, v: any) => { st.f.push(["neq", k, v]); return api; },
      update: (patch: any) => { st.op = "update"; st.patch = patch; return api; },
      then: (res: any) => {
        const m = rows.filter(match);
        if (st.op === "update") { m.forEach((r) => Object.assign(r, st.patch)); return res({ data: m.map((r) => ({ id: r.id })), error: null }); }
        if (st.op === "single") return res({ data: m[0] ?? null, error: null });
        return res({ data: m, error: null });
      },
    };
    return api;
  };
  return { from } as any;
}

const inst = (seq: number, amount: number, status = "sent"): Installment => ({
  id: `i${seq}`, invoice_id: "inv1", merchant_id: "m1", seq, label: seq === 3 ? "Solde" : `Dépôt ${seq}`,
  amount, currency: "CAD", due_date: `2026-10-0${seq}`, status: status as Installment["status"],
  pay_token: `INS-TOKEN000${seq}`, payment_id: null, payment_ref: null, paid_at: null, sent_at: null, reminder_count: 0,
});

describe("resolvePlan", () => {
  it("splits by percent, last line absorbs rounding", () => {
    const out = resolvePlan(1000.01, [
      { label: "Dépôt 1", percent: 33.33, due_date: "2026-10-01" },
      { label: "Dépôt 2", percent: 33.33, due_date: "2026-11-01" },
      { label: "Solde", due_date: "2026-12-01" },
    ]);
    expect(out.map((l) => l.amount)).toEqual([333.3, 333.3, 333.41]);
    expect(out.reduce((s, l) => s + l.amount, 0)).toBeCloseTo(1000.01, 2);
  });
  it("mixes fixed amounts and rejects overshoot, bad dates, single line", () => {
    expect(resolvePlan(500, [{ label: "D", amount: 100, due_date: "2026-10-01" }, { label: "S", due_date: "2026-10-02" }]).map((l) => l.amount)).toEqual([100, 400]);
    expect(() => resolvePlan(500, [{ label: "D", amount: 600, due_date: "2026-10-01" }, { label: "S", due_date: "2026-10-02" }])).toThrow();
    expect(() => resolvePlan(500, [{ label: "D", amount: 100, due_date: "2026-10-05" }, { label: "S", due_date: "2026-10-02" }])).toThrow(/ordre/);
    expect(() => resolvePlan(500, [{ label: "D", amount: 100, due_date: "nope" }, { label: "S", due_date: "2026-10-02" }])).toThrow(/date/);
    expect(() => resolvePlan(500, [{ label: "S", due_date: "2026-10-02" }])).toThrow(/2 versements/);
  });
});

describe("markInstallmentPaid", () => {
  beforeEach(() => (sendEmail as any).mockClear());
  it("partial then paid, idempotent, receipt with remaining balance", async () => {
    const tables = {
      zenipay_invoice_installments: [inst(1, 300), inst(2, 300), inst(3, 400)],
      zenipay_invoices: [{ id: "inv1", invoice_number: "INV-2026-0007", merchant_id: "m1", customer_name: "Jean", customer_email: "jean@x.ca", merchant_name: "Epoxy JJ", merchant_email: "jj@x.ca", total: 1000, currency: "CAD", status: "sent" }],
    };
    const db = fakeDb(tables);
    expect(await markInstallmentPaid(db, tables.zenipay_invoice_installments[0], { paymentId: "p1", paymentRef: "ZNV-1" })).toBe(true);
    expect(tables.zenipay_invoices[0].status).toBe("partial");
    expect((tables.zenipay_invoices[0] as any).amount_paid).toBe(300);
    const receipt = (sendEmail as any).mock.calls[0][0];
    expect(receipt.to).toBe("jean@x.ca");
    expect(receipt.html).toContain("700,00");  // remaining, fr-CA format

    // Same payment delivered twice (webhook retry) → no double processing.
    expect(await markInstallmentPaid(db, tables.zenipay_invoice_installments[0], { paymentId: "p1", paymentRef: "ZNV-1" })).toBe(false);

    await markInstallmentPaid(db, tables.zenipay_invoice_installments[1], { paymentId: "p2", paymentRef: "ZNV-2" });
    await markInstallmentPaid(db, tables.zenipay_invoice_installments[2], { paymentId: "p3", paymentRef: "ZNV-3" });
    expect(tables.zenipay_invoices[0].status).toBe("paid");
    expect((tables.zenipay_invoices[0] as any).amount_paid).toBe(1000);
  });
});

describe("pay target amount", () => {
  it("fixed amount always wins over the client's amount", () => {
    const t = { amount: 300 } as PayTarget;
    expect(chargeableAmount(t, 1)).toBe(300);
    expect(chargeableAmount({ amount: null } as PayTarget, "42.5")).toBe(42.5);
    expect(chargeableAmount({ amount: null } as PayTarget, "-1")).toBeNull();
  });
});

describe("misc", () => {
  it("tokens are unique and well-formed; emails escape HTML", () => {
    const a = newPayToken(), b = newPayToken();
    expect(a).toMatch(/^INS-[A-Z0-9]{8,32}$/);
    expect(a).not.toBe(b);
    const { html, subject } = renderInstallmentEmail(
      { id: "x", invoice_number: "INV-1", customer_name: "<script>", customer_email: "a@b.c", merchant_name: "M", merchant_email: "", total: 10, currency: "CAD", description: "" },
      inst(1, 5), "request",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("/pay/INS-TOKEN0001");
    expect(subject).toContain("Dépôt 1");
  });
});
