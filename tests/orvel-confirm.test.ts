import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { signPending, verifyPending } from "@/lib/orvel/confirm";
import { TOOLS } from "@/lib/orvel/tools";

beforeAll(() => { process.env.ZP_SESSION_SECRET = "test-secret"; });
afterEach(() => { vi.useRealTimers(); });

describe("Orvel — actions à confirmer", () => {
  it("un jeton signé redonne l'outil et ses arguments exacts", () => {
    const t = signPending("m1", "send_invoice", { invoice_number: "INV-2026-0003" });
    expect(verifyPending(t, "m1")).toEqual({ tool: "send_invoice", args: { invoice_number: "INV-2026-0003" } });
  });

  it("refuse un jeton modifié (montant changé)", () => {
    const t = signPending("m1", "transfer_between_accounts", { from_account: "1234", to_account: "5678", amount: 10 });
    const [payload, sig] = t.split(".");
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    p.a.amount = 10000;
    const forged = Buffer.from(JSON.stringify(p)).toString("base64url") + "." + sig;
    expect(verifyPending(forged, "m1")).toHaveProperty("error");
  });

  it("refuse le jeton d'un autre marchand", () => {
    const t = signPending("m1", "refund_payment", { payment_ref: "ZNV-1" });
    expect(verifyPending(t, "m2")).toHaveProperty("error");
  });

  it("refuse un jeton expiré (plus de 30 min)", () => {
    vi.useFakeTimers();
    const t = signPending("m1", "send_invoice", { invoice_number: "INV-1" });
    vi.advanceTimersByTime(31 * 60_000);
    expect(verifyPending(t, "m1")).toHaveProperty("error");
  });

  it("toutes les actions qui envoient un courriel ou déplacent de l'argent passent par une confirmation", () => {
    const outgoing = ["create_invoice", "send_invoice", "send_installment_link", "refund_payment", "transfer_between_accounts"];
    for (const name of outgoing) expect(typeof TOOLS.find((t) => t.name === name)?.confirm, name).toBe("function");
  });

  it("l'aperçu d'une facture reprend exactement les informations données", async () => {
    const tool = TOOLS.find((t) => t.name === "create_invoice")!;
    const r = await tool.confirm!({ supabase: {} as never, merchantId: "m1" }, {
      customer_name: "Jean Tremblay", customer_email: "jean@exemple.com", description: "Plancher époxy", amount: 2000, tax: 299.5,
      installments: [{ label: "Dépôt", percent: 30, due_date: "2026-09-28" }, { label: "Solde", due_date: "2026-10-28" }],
    });
    expect(r.ok).toBe(true);
    const text = r.ok ? r.preview.lines.join("\n") : "";
    expect(text).toContain("Jean Tremblay <jean@exemple.com>");
    expect(text).toContain("Plancher époxy");
    expect(text).toMatch(/2\s?299,50\s?\$/);
    expect(text).toContain("30 %");
    expect(text).toContain("jean@exemple.com dès la confirmation");
  });

  it("« + taxes » : TPS et TVQ calculées par le code, pas par le modèle", async () => {
    const tool = TOOLS.find((t) => t.name === "create_invoice")!;
    const r = await tool.confirm!({ supabase: {} as never, merchantId: "m1" }, { customer_name: "Jean Tremblay", amount: 2000, taxes_quebec: true, tax: 14.975 });
    const text = r.ok ? r.preview.lines.join("\n") : "";
    expect(text).toMatch(/TPS 5 %\s+100,00\s?\$/);
    expect(text).toMatch(/TVQ 9,975 %\s+199,50\s?\$/);
    expect(text).toMatch(/Total : 2\s?299,50\s?\$/); // la taxe erronée du modèle (14,975) est ignorée
  });

  it("versement donné en % et en $ : le % gagne, calculé sur le total avec taxes", async () => {
    const tool = TOOLS.find((t) => t.name === "create_invoice")!;
    const r = await tool.confirm!({ supabase: {} as never, merchantId: "m1" }, {
      customer_name: "Jean Tremblay", amount: 2000, taxes_quebec: true,
      installments: [{ label: "Dépôt", percent: 30, amount: 600, due_date: "2026-09-27" }, { label: "Solde", due_date: "2026-11-27" }],
    });
    const text = r.ok ? r.preview.lines.join("\n") : "";
    expect(text).toMatch(/Dépôt : 30 % \(689,85\s?\$\)/); // 30 % de 2 299,50 $, pas les 600 $ avant taxes du modèle
    expect(text).toContain("Solde : solde");
  });

  it("l'aperçu refuse un courriel invalide avant tout envoi", async () => {
    const tool = TOOLS.find((t) => t.name === "create_invoice")!;
    const r = await tool.confirm!({ supabase: {} as never, merchantId: "m1" }, { customer_name: "X", customer_email: "pas-un-courriel", amount: 10 });
    expect(r.ok).toBe(false);
  });
});
