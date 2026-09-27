import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/modules/zenipay/gateways/finix", () => ({ createReversal: vi.fn(async () => ({ id: "RV1" })) }));
import { runOrvel, parseTextToolCall } from "@/lib/orvel/agent";

// In-memory supabase stand-in (enough for the tools exercised here).
function fakeDb(tables: Record<string, any[]>) {
  const from = (table: string) => {
    const rows = (tables[table] ||= []);
    const st: any = { f: [] as Array<[string, string, any]>, op: "select" };
    const match = (r: any) => st.f.every(([op, k, v]: any) => (op === "eq" ? r[k] === v : op === "neq" ? r[k] !== v : op === "is" ? r[k] == v : true));
    const api: any = {
      select: () => api, order: () => api, limit: () => api, in: () => api, lte: () => api,
      maybeSingle: () => { st.single = true; return api; }, single: () => { st.single = true; return api; },
      eq: (k: string, v: any) => { st.f.push(["eq", k, v]); return api; },
      neq: (k: string, v: any) => { st.f.push(["neq", k, v]); return api; },
      is: (k: string, v: any) => { st.f.push(["is", k, v]); return api; },
      insert: (r: any) => { st.op = "insert"; st.rows = Array.isArray(r) ? r : [r]; return api; },
      update: (p: any) => { st.op = "update"; st.patch = p; return api; },
      upsert: (r: any) => { st.op = "insert"; st.rows = [r]; return api; },
      then: (res: any) => {
        if (st.op === "insert") {
          const added = st.rows.map((r: any) => ({ id: r.id ?? `row${rows.length + 1}`, ...r }));
          rows.push(...added);
          return res({ data: st.single ? added[0] : added, error: null });
        }
        const m = rows.filter(match);
        if (st.op === "update") { m.forEach((r) => Object.assign(r, st.patch)); return res({ data: m, error: null }); }
        return res({ data: st.single ? m[0] ?? null : m, error: null, count: m.length });
      },
    };
    return api;
  };
  return { from } as any;
}

let replies: any[] = [];
const realFetch = globalThis.fetch;
beforeEach(() => {
  replies = [];
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: replies.shift() }] }) })) as any;
});
afterEach(() => { globalThis.fetch = realFetch; });

describe("parseTextToolCall", () => {
  it("reads a JSON tool call from plain text or a code fence", () => {
    expect(parseTextToolCall('{"tool":"get_summary","args":{}}')).toEqual({ name: "get_summary", args: {} });
    expect(parseTextToolCall('```json\n{"tool": "list_invoices", "args": {"status": "sent"}}\n```')).toEqual({ name: "list_invoices", args: { status: "sent" } });
    expect(parseTextToolCall("Bonjour, voici votre solde.")).toBeNull();
  });
});

describe("runOrvel", () => {
  it("executes an allowed tool (text protocol), journals it, then answers", async () => {
    const tables: Record<string, any[]> = {
      zenipay_merchants: [{ id: "m1", business_name: "Epoxy JJ", email: "jj@x.ca" }],
      zenipay_invoices: [],
      zenipay_orvel_settings: [],
      zenipay_orvel_actions: [],
      zenipay_pay_links: [],
    };
    replies.push({ content: '{"tool":"create_pay_link","args":{"amount":250,"description":"Acompte"}}' });
    replies.push({ content: "Voici votre lien de 250 $." });
    const out = await runOrvel(fakeDb(tables), "m1", [{ role: "user", content: "Fais-moi un lien de 250$" }]);
    expect(out.reply).toContain("250");
    expect(out.actions).toHaveLength(1);
    expect(out.actions[0].status).toBe("done");
    expect(out.actions[0].undoable).toBe(true);
    expect(tables.zenipay_pay_links[0]).toMatchObject({ merchant_id: "m1", amount: 250, status: "active" });
    expect(tables.zenipay_orvel_actions[0]).toMatchObject({ merchant_id: "m1", tool: "create_pay_link", status: "done" });
  });

  it("refuses a money tool whose permission is off (native tool_calls)", async () => {
    const tables: Record<string, any[]> = {
      zenipay_merchants: [{ id: "m1" }],
      zenipay_orvel_settings: [{ merchant_id: "m1", enabled: true, permissions: { refunds: false } }],
      zenipay_orvel_actions: [],
      zenipay_payments: [{ id: "p1", merchant_id: "m1", status: "succeeded", amount: 100, metadata: { reference: "ZNV-1", gateway_transfer_id: "TR1" } }],
    };
    replies.push({ content: "", tool_calls: [{ id: "c1", function: { name: "refund_payment", arguments: '{"payment_ref":"ZNV-1"}' } }] });
    replies.push({ content: "Je ne peux pas rembourser : la permission est désactivée." });
    const out = await runOrvel(fakeDb(tables), "m1", [{ role: "user", content: "Rembourse ZNV-1" }]);
    expect(out.actions[0]).toMatchObject({ tool: "refund_payment", status: "denied" });
    expect(tables.zenipay_payments[0].status).toBe("succeeded"); // untouched
  });

  it("tools only ever see the session merchant's data", async () => {
    const tables: Record<string, any[]> = {
      zenipay_merchants: [{ id: "m1" }],
      zenipay_orvel_settings: [],
      zenipay_orvel_actions: [],
      zenipay_invoices: [
        { id: "a", merchant_id: "m1", invoice_number: "INV-2026-0001", customer_name: "Mine", total: 10, status: "sent" },
        { id: "b", merchant_id: "OTHER", invoice_number: "INV-2026-0001", customer_name: "Not mine", total: 99, status: "sent" },
      ],
    };
    replies.push({ content: '{"tool":"list_invoices","args":{"merchant_id":"OTHER"}}' });
    replies.push({ content: "ok" });
    await runOrvel(fakeDb(tables), "m1", [{ role: "user", content: "liste" }]);
    const second = (globalThis.fetch as any).mock.calls[1][1].body as string;
    expect(second).toContain("Mine");
    expect(second).not.toContain("Not mine");
  });
});
