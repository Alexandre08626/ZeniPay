import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/modules/zenipay/gateways/finix", () => ({
  processFinixPaymentWithInstrument: vi.fn(),
  createTransfer: vi.fn(),
}));
import { processFinixPaymentWithInstrument, createTransfer } from "@/modules/zenipay/gateways/finix";
import { sendEmail } from "@/lib/email/send";
import {
  signBody, verifyBody, orvelPrice, addMonth, newSubscription, insertSub, getSub, type Subscription,
} from "@/lib/zenipay/subscriptions";
import { payWithNewCard, renew, cancel, tick } from "@/lib/zenipay/subscription-billing";

// Faux supabase-js en mémoire (select/eq/neq/maybeSingle/single/insert/upsert/update). `missing` = tables absentes.
function fakeDb(tables: Record<string, any[]>, missing: string[] = []) {
  const from = (table: string) => {
    const rows = (tables[table] ||= []);
    const st: any = { f: [], op: "select", single: false };
    const match = (r: any) => st.f.every(([op, k, v]: any) => (op === "eq" ? r[k] === v : r[k] !== v));
    const api: any = {
      select: () => api, order: () => api, limit: () => api,
      eq: (k: string, v: any) => { st.f.push(["eq", k, v]); return api; },
      neq: (k: string, v: any) => { st.f.push(["neq", k, v]); return api; },
      maybeSingle: () => { st.single = true; return api; }, single: () => { st.single = true; return api; },
      insert: (r: any) => { st.op = "insert"; st.ins = Array.isArray(r) ? r : [r]; return api; },
      upsert: (r: any) => { st.op = "upsert"; st.ins = [r]; return api; },
      update: (p: any) => { st.op = "update"; st.patch = p; return api; },
      then: (res: any) => {
        if (missing.includes(table)) return res({ data: null, error: { code: "PGRST205", message: "Could not find the table" } });
        let data: any[];
        if (st.op === "insert" || st.op === "upsert") {
          for (const r of st.ins) { const i = rows.findIndex((x) => x.id === r.id); if (i >= 0) rows[i] = { ...rows[i], ...r }; else rows.push({ ...r }); }
          data = st.ins;
        } else if (st.op === "update") { data = rows.filter(match); data.forEach((r) => Object.assign(r, st.patch)); }
        else data = rows.filter(match);
        return res({ data: st.single ? (data[0] ? { ...data[0] } : null) : data.map((x) => ({ ...x })), error: null });
      },
    };
    return api;
  };
  return { from } as any;
}

const SECRET = "s".repeat(48);
let hooks: Array<{ url: string; body: any; sig: string }>;
let hookOk = true;
let tables: Record<string, any[]>;
let db: any;

beforeEach(() => {
  process.env.ORVEL_ZENIPAY_SECRET = SECRET;
  process.env.ORVEL_MERCHANT_ID = "m-orvel";
  process.env.FINIX_MERCHANT_ID = "MU1";
  delete process.env.ORVEL_TPS_NO; delete process.env.ORVEL_TVQ_NO;
  hooks = []; hookOk = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => { hooks.push({ url, body: JSON.parse(init.body), sig: init.headers["x-zenipay-signature"] }); return { ok: hookOk } as any; }));
  tables = {
    zenipay_merchants: [{ id: "m-orvel", config: {} }],
    zenipay_accounts: [{ id: "acct1", merchant_id: "m-orvel", is_primary: true, balance: 0 }, { id: "corp", merchant_id: "acc_1774740862294", is_primary: true, balance: 0 }],
  };
  db = fakeDb(tables);
  vi.mocked(processFinixPaymentWithInstrument).mockReset();
  vi.mocked(createTransfer).mockReset();
  vi.mocked(sendEmail).mockClear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const fresh = async (plan: "plus" | "pro" = "plus") => {
  const s = newSubscription({ plan, external_ref: "uid-1", email: "julie@exemple.ca", name: "Julie", return_url: "https://orvel.zenitech.dev/?abonnement=ok" });
  await insertSub(db, s);
  return s;
};
const approved = { success: true, transferId: "TR1", instrumentId: "PI123", brand: "VISA", last4: "4242", state: "SUCCEEDED", threeDSRedirectUrl: null };

describe("signature Orvel ↔ ZeniPay", () => {
  it("accepte une signature valide et récente", () => { const b = '{"a":1}'; expect(verifyBody(signBody(b), b)).toBe(true); });
  it("refuse un corps modifié, une signature trop vieille, un autre secret, une absence de signature", () => {
    const b = '{"a":1}';
    expect(verifyBody(signBody(b), b + " ")).toBe(false);
    expect(verifyBody(signBody(b, Math.floor(Date.now() / 1000) - 600), b)).toBe(false);
    expect(verifyBody(null, b)).toBe(false);
    const sig = signBody(b); process.env.ORVEL_ZENIPAY_SECRET = "t".repeat(48);
    expect(verifyBody(sig, b)).toBe(false);
  });
  it("refuse tout si le secret n'est pas configuré", () => { const b = "{}"; const sig = signBody(b); process.env.ORVEL_ZENIPAY_SECRET = ""; expect(verifyBody(sig, b)).toBe(false); });
});

describe("prix et dates", () => {
  it("sans numéros de taxes : prix du forfait seulement", () => { expect(orvelPrice("plus")).toMatchObject({ amount: 39, tps: 0, tvq: 0, total: 39 }); });
  it("avec numéros TPS/TVQ : taxes du Québec calculées au cent près", () => {
    process.env.ORVEL_TPS_NO = "123456789RT0001"; process.env.ORVEL_TVQ_NO = "1234567890TQ0001";
    expect(orvelPrice("plus")).toMatchObject({ tps: 1.95, tvq: 3.89, total: 44.84 });
    expect(orvelPrice("pro")).toMatchObject({ tps: 13.75, tvq: 27.43, total: 316.18 });
  });
  it("même jour le mois suivant, fin de mois respectée", () => {
    expect(addMonth("2026-09-28T14:00:00.000Z")).toBe("2026-10-28T14:00:00.000Z");
    expect(addMonth("2026-01-31T14:00:00.000Z")).toBe("2026-02-28T14:00:00.000Z");
    expect(addMonth("2026-12-15T14:00:00.000Z")).toBe("2027-01-15T14:00:00.000Z");
  });
});

describe("1er paiement", () => {
  it("carte acceptée : actif, carte enregistrée, paiement inscrit aux livres, reçu, avis signé à Orvel", async () => {
    const s = await fresh();
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue(approved as any);
    const r = await payWithNewCard(db, s, "TKabc");
    expect(r.ok).toBe(true);
    const saved = (await getSub(db, s.id))!;
    expect(saved).toMatchObject({ status: "active", instrument_id: "PI123", card_last4: "4242", periods: 1, failed_attempts: 0 });
    expect(new Date(saved.current_period_end!).getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);
    expect(tables.zenipay_payments[0]).toMatchObject({ amount: 39, status: "succeeded", merchant_id: "m-orvel" });
    expect(tables.zenipay_accounts.find((a) => a.id === "acct1")!.balance).toBe(39);
    expect(tables.zenipay_ledger.some((l) => l.event_type === "customer_payment" && l.amount === 39)).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(hooks).toHaveLength(1);
    expect(hooks[0].body).toMatchObject({ type: "subscription.activated", subscription: { plan: "plus", external_ref: "uid-1", status: "active" } });
    expect(verifyBody(hooks[0].sig, JSON.stringify(hooks[0].body))).toBe(true);
  });
  it("carte refusée : reste en attente, essai compté, aucun avis, rien aux livres", async () => {
    const s = await fresh();
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue({ success: false, failureMessage: "INSUFFICIENT_FUNDS" } as any);
    const r = await payWithNewCard(db, s, "TKabc");
    expect(r.ok).toBe(false);
    expect((await getSub(db, s.id))!).toMatchObject({ status: "incomplete", activation_attempts: 1 });
    expect(hooks).toHaveLength(0);
    expect(tables.zenipay_ledger || []).toHaveLength(0);
  });
  it("vérification 3-D Secure demandée : refusé proprement (pas d'activation)", async () => {
    const s = await fresh();
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue({ ...approved, threeDSRedirectUrl: "https://3ds" } as any);
    expect((await payWithNewCard(db, s, "TKabc")).ok).toBe(false);
    expect((await getSub(db, s.id))!.status).toBe("incomplete");
  });
  it("après 5 cartes refusées, la page est bloquée sans appeler Finix (anti « card testing »)", async () => {
    const s = await fresh();
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue({ success: false } as any);
    for (let i = 0; i < 5; i++) await payWithNewCard(db, (await getSub(db, s.id))!, "TKabc");
    vi.mocked(processFinixPaymentWithInstrument).mockClear();
    const r = await payWithNewCard(db, (await getSub(db, s.id))!, "TKabc");
    expect(r.ok).toBe(false);
    expect(processFinixPaymentWithInstrument).not.toHaveBeenCalled();
  });
  it("un abonnement déjà actif ne peut pas être repayé", async () => {
    const s = await fresh();
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue(approved as any);
    await payWithNewCard(db, s, "TKabc");
    expect((await payWithNewCard(db, (await getSub(db, s.id))!, "TKxyz")).ok).toBe(false);
    expect(processFinixPaymentWithInstrument).toHaveBeenCalledTimes(1);
  });
});

async function activeSub(): Promise<Subscription> {
  const s = await fresh();
  vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue(approved as any);
  await payWithNewCard(db, s, "TKabc");
  hooks.length = 0; vi.mocked(sendEmail).mockClear();
  return (await getSub(db, s.id))!;
}

describe("prélèvements mensuels (cron)", () => {
  it("échéance : prélève la carte enregistrée, la nouvelle période suit l'ancienne, clé d'idempotence par période", async () => {
    const s = await activeSub();
    vi.mocked(createTransfer).mockResolvedValue({ transferId: "TR2", state: "SUCCEEDED", raw: {} } as any);
    const out = await tick(db, new Date(new Date(s.next_charge_at!).getTime() + 1000));
    expect(out.renewed).toBe(1);
    const call = vi.mocked(createTransfer).mock.calls[0][0];
    expect(call).toMatchObject({ instrumentId: "PI123", amountCents: 3900, merchantId: "MU1", idempotencyKey: `sub_${s.id}_p2_a0` });
    const saved = (await getSub(db, s.id))!;
    expect(saved.current_period_start).toBe(s.current_period_end);
    expect(saved).toMatchObject({ periods: 2, status: "active" });
    expect(hooks[0].body.type).toBe("subscription.renewed");
  });
  it("pas encore l'échéance : rien n'est prélevé", async () => {
    await activeSub();
    await tick(db, new Date());
    expect(createTransfer).not.toHaveBeenCalled();
  });
  it("refus : en retard, période de grâce de 3 jours, courriel ; au 3e refus : fin de l'abonnement et avis à Orvel", async () => {
    const s = await activeSub();
    vi.mocked(createTransfer).mockResolvedValue({ transferId: "TRx", state: "FAILED", raw: { failure_message: "DECLINED" } } as any);
    let now = new Date(new Date(s.next_charge_at!).getTime() + 1000);
    await tick(db, now);
    let saved = (await getSub(db, s.id))!;
    expect(saved).toMatchObject({ status: "past_due", failed_attempts: 1 });
    expect(new Date(saved.current_period_end!).getTime()).toBe(now.getTime() + 3 * 86_400_000);
    expect(hooks.at(-1)!.body.type).toBe("subscription.past_due");
    for (let i = 0; i < 2; i++) { now = new Date(new Date(saved.next_charge_at!).getTime() + 1000); await tick(db, now); saved = (await getSub(db, s.id))!; }
    expect(saved).toMatchObject({ status: "canceled", failed_attempts: 3 });
    expect(hooks.at(-1)!.body).toMatchObject({ type: "subscription.canceled", subscription: { status: "canceled" } });
    expect(vi.mocked(createTransfer).mock.calls.map((c) => c[0].idempotencyKey)).toEqual([`sub_${s.id}_p2_a0`, `sub_${s.id}_p2_a1`, `sub_${s.id}_p2_a2`]);
    await tick(db, new Date(now.getTime() + 40 * 86_400_000));
    expect(createTransfer).toHaveBeenCalledTimes(3); // plus jamais prélevé
  });
  it("erreur réseau chez Finix : traitée comme un refus (aucun plantage)", async () => {
    const s = await activeSub();
    vi.mocked(createTransfer).mockRejectedValue(new Error("Finix error: timeout"));
    await tick(db, new Date(new Date(s.next_charge_at!).getTime() + 1000));
    expect((await getSub(db, s.id))!.status).toBe("past_due");
  });
});

describe("annulation", () => {
  it("abonnement payé : reste actif jusqu'à l'échéance, puis se termine sans prélèvement", async () => {
    const s = await activeSub();
    await cancel(db, s);
    expect((await getSub(db, s.id))!).toMatchObject({ status: "active", cancel_at_period_end: true });
    expect(hooks.at(-1)!.body.subscription.cancel_at_period_end).toBe(true);
    await tick(db, new Date(new Date(s.next_charge_at!).getTime() + 1000));
    expect(createTransfer).not.toHaveBeenCalled();
    expect((await getSub(db, s.id))!.status).toBe("canceled");
    expect(hooks.at(-1)!.body.type).toBe("subscription.canceled");
  });
  it("abonnement en retard de paiement : fin immédiate", async () => {
    const s = await activeSub();
    vi.mocked(createTransfer).mockResolvedValue({ state: "FAILED", raw: {} } as any);
    await tick(db, new Date(new Date(s.next_charge_at!).getTime() + 1000));
    await cancel(db, (await getSub(db, s.id))!);
    expect((await getSub(db, s.id))!.status).toBe("canceled");
  });
  it("page de paiement abandonnée depuis plus de 2 jours : fermée", async () => {
    const s = await fresh();
    await tick(db, new Date(Date.now() + 3 * 86_400_000));
    expect((await getSub(db, s.id))!.status).toBe("canceled");
  });
});

describe("fiabilité", () => {
  it("avis non reçu par Orvel : marqué, puis renvoyé par le cron", async () => {
    const s = await fresh();
    hookOk = false;
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue(approved as any);
    await payWithNewCard(db, s, "TKabc");
    expect((await getSub(db, s.id))!.webhook_pending).toBe(true);
    hookOk = true;
    const out = await tick(db, new Date());
    expect(out.notified).toBe(1);
    expect((await getSub(db, s.id))!.webhook_pending).toBe(false);
  });
  it("table absente en production : repli dans la config du marchand Orvel", async () => {
    db = fakeDb(tables, ["zenipay_subscriptions"]);
    const s = await fresh();
    expect(tables.zenipay_merchants[0].config.zp_subscriptions).toHaveLength(1);
    vi.mocked(processFinixPaymentWithInstrument).mockResolvedValue(approved as any);
    expect((await payWithNewCard(db, s, "TKabc")).ok).toBe(true);
    expect((await getSub(db, s.id))!.status).toBe("active");
  });
});
