// Production-shaped DB: no installments/Orvel tables, legacy invoice columns
// only (id, merchant_id, client_name, client_email, amount, currency,
// description, status, due_date, paid_at, created_at). Everything must
// still work through the config-JSONB fallback + tolerant writes.
import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => {}) }));
import { createMerchantInvoice } from "@/lib/zenipay/invoices";
import { findInstallmentByToken, markInstallmentPaid, listMerchantInstallments, listDueInstallments } from "@/lib/zenipay/installments";
import { resolvePayTarget } from "@/lib/zenipay/pay-target";
import { getOrvelSettings, saveOrvelSettings } from "@/lib/orvel/permissions";
import { recordAction, listActions, claimUndo } from "@/lib/orvel/journal";

const LEGACY_INVOICE_COLS = new Set(["id", "merchant_id", "client_name", "client_email", "amount", "currency", "description", "status", "due_date", "paid_at", "created_at", "updated_at"]);
const MISSING_TABLES = new Set(["zenipay_invoice_installments", "zenipay_orvel_settings", "zenipay_orvel_actions"]);

function legacyDb(tables: Record<string, any[]>) {
  const from = (table: string) => {
    const rows = (tables[table] ||= []);
    const st: any = { f: [], op: "select" };
    const missingTable = { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` }, count: null };
    const badCol = (obj: any) => table === "zenipay_invoices" ? Object.keys(obj).find((k) => !LEGACY_INVOICE_COLS.has(k)) : undefined;
    const match = (r: any) => st.f.every(([op, k, v]: any) =>
      op === "eq" ? r[k] === v : op === "neq" ? r[k] !== v : op === "is" ? r[k] == v : op === "in" ? v.includes(r[k]) : op === "lte" ? r[k] <= v
      : op === "ilike" ? String(r[k] || "").toLowerCase().startsWith(String(v).replace(/%$/, "").toLowerCase()) : true);
    const api: any = {
      select: (_c?: string, o?: any) => { st.head = o?.head; return api; },
      order: () => api, limit: () => api,
      maybeSingle: () => { st.single = true; return api; }, single: () => { st.single = true; return api; },
      eq: (k: string, v: any) => { st.f.push(["eq", k, v]); return api; },
      neq: (k: string, v: any) => { st.f.push(["neq", k, v]); return api; },
      is: (k: string, v: any) => { st.f.push(["is", k, v]); return api; },
      in: (k: string, v: any) => { st.f.push(["in", k, v]); return api; },
      lte: (k: string, v: any) => { st.f.push(["lte", k, v]); return api; },
      ilike: (k: string, v: any) => { st.f.push(["ilike", k, v]); return api; },
      insert: (r: any) => { st.op = "insert"; st.rows = Array.isArray(r) ? r : [r]; return api; },
      update: (p: any) => { st.op = "update"; st.patch = p; return api; },
      upsert: (r: any) => { st.op = "insert"; st.rows = [r]; return api; },
      delete: () => { st.op = "delete"; return api; },
      then: (res: any) => {
        if (MISSING_TABLES.has(table)) return res(missingTable);
        if (st.op === "insert") {
          const bad = st.rows.map(badCol).find(Boolean);
          if (bad) return res({ data: null, error: { code: "PGRST204", message: `Could not find the '${bad}' column of '${table}' in the schema cache` } });
          rows.push(...st.rows.map((r: any) => ({ ...r })));
          return res({ data: st.rows, error: null });
        }
        if (st.op === "update") {
          const bad = badCol(st.patch);
          if (bad) return res({ data: null, error: { code: "PGRST204", message: `Could not find the '${bad}' column of '${table}' in the schema cache` } });
          const m = rows.filter(match); m.forEach((r) => Object.assign(r, st.patch));
          return res({ data: m.map((r) => ({ id: r.id })), error: null });
        }
        const filterCol = st.f.map((x: any) => x[1]).find((k: string) => table === "zenipay_invoices" && !LEGACY_INVOICE_COLS.has(k));
        if (filterCol) return res({ data: null, error: { code: "42703", message: `column ${table}.${filterCol} does not exist` } });
        const m = rows.filter(match);
        return res({ data: st.single ? m[0] ?? null : m, error: null, count: m.length });
      },
    };
    return api;
  };
  return { from } as any;
}

describe("production (legacy) schema", () => {
  it("creates an installment invoice, pays it, and Orvel settings/journal persist — no new tables", async () => {
    const tables: Record<string, any[]> = {
      zenipay_merchants: [{ id: "m1", email: "jj@x.ca", config: { businessName: "Epoxy JJ", other: 1 } }],
      zenipay_invoices: [],
      zenipay_payments: [],
    };
    const db = legacyDb(tables);

    const r = await createMerchantInvoice(db, "m1", {
      customer_name: "Jean", customer_email: "jean@x.ca", description: "Plancher", amount: 1000, tax: 0,
      installments: [
        { label: "Dépôt", percent: 40, due_date: "2000-01-01" },
        { label: "Solde", due_date: "2099-01-01" },
      ],
    });
    // Legacy row: number in the description, rich columns dropped.
    const inv = tables.zenipay_invoices[0];
    expect(inv.description).toMatch(/^INV-\d{4}-0001 — Plancher$/);
    expect(inv.client_email).toBe("jean@x.ca");
    expect(inv).not.toHaveProperty("invoice_number");
    // Installments stored in the merchant config; other config keys kept.
    expect(tables.zenipay_merchants[0].config.zp_installments).toHaveLength(2);
    expect(tables.zenipay_merchants[0].config.other).toBe(1);
    expect(r.emailed).toEqual(["Dépôt"]); // due date in the past → sent now

    // Pay token resolves from config; amount is server-side.
    const tok = r.installments[0].pay_token;
    const target = await resolvePayTarget(db, tok);
    expect(target).toMatchObject({ kind: "installment", merchantId: "m1", amount: 400 });
    expect(target!.description).toMatch(/^Facture INV-\d{4}-0001 — Dépôt$/);

    const inst = (await findInstallmentByToken(db, tok))!;
    expect(await markInstallmentPaid(db, inst, { paymentId: "p1", paymentRef: "ZNV-1" })).toBe(true);
    expect(await markInstallmentPaid(db, inst, { paymentId: "p1", paymentRef: "ZNV-1" })).toBe(false); // webhook retry
    expect(inv.status).toBe("partial");
    const all = await listMerchantInstallments(db, "m1");
    expect(all.find((i) => i.seq === 1)!.status).toBe("paid");
    expect((await listDueInstallments(db, "2098-01-01")).length).toBe(0); // solde not due yet

    // Orvel permissions + journal via config.
    await saveOrvelSettings(db, "m1", { permissions: { refunds: true } });
    expect((await getOrvelSettings(db, "m1")).permissions.refunds).toBe(true);
    const id = await recordAction(db, { merchant_id: "m1", tool: "create_pay_link", args: {}, status: "done", result: { summary: "x" }, undo: { type: "deactivate_pay_link", id: "L" }, prompt: "p" });
    expect((await listActions(db, "m1"))[0].id).toBe(id);
    expect(await claimUndo(db, "m1", id!)).toBe(true);
    expect(await claimUndo(db, "m1", id!)).toBe(false);
    expect(tables.zenipay_merchants[0].config.zp_installments).toHaveLength(2); // untouched by other keys
  });
});
