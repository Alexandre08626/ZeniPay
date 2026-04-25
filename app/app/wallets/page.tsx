// /app/wallets — Send & Receive on the new DashboardShell.
//
// Posts to the existing /api/zenipay/banking-ops action=send_transfer,
// pulls accounts + contacts from the GET on the same endpoint. No new
// API routes.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SendHorizontal, ArrowDownLeft, UserPlus, Bot } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";
import { ZeniPayAccountCard } from "@/app/components/shared/ZeniPayAccountCard";
import { BankConnectionsPanel } from "@/app/components/shared/BankConnectionsPanel";
import { FundingInboundPanel } from "./FundingInboundPanel";

interface Account {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  balance: number;
  is_primary: boolean;
  currency?: string;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}
interface Contact {
  id: string;
  name: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  swift?: string;
  contact_type?: string;
}

type TransferType = "ach" | "wire" | "internal" | "bill_pay" | "agent_treasury";

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

export default function WalletsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showExternal, setShowExternal] = useState(false);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setAccounts(r.accounts ?? []);
      setContacts(r.contacts ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const primaryAccount = useMemo(
    () => accounts.find((a) => a.is_primary) ?? accounts[0] ?? null,
    [accounts],
  );

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <DashboardShell mode="merchant">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Send & Receive</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
          Move money between your ZeniPay accounts, or to any beneficiary.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gap: 18 }} className="pr20-wallets-grid">
        <SendPanel
          accounts={accounts}
          contacts={contacts}
          loading={loading}
          onSent={(msg) => { flash(msg ?? "Transfer initiated ✓"); void load(); }}
          showExternal={showExternal}
          onToggleExternal={setShowExternal}
        />
        <ReceivePanel account={primaryAccount} onCopy={() => flash("Wire instructions copied")} />
      </div>

      <div style={{ marginTop: 20 }}>
        <BankConnectionsPanel merchantId={mid()} connectionType="business" accent="cyan" />
      </div>

      {showExternal && (
        <div style={{ marginTop: 20 }}>
          <FundingInboundPanel />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>
            Saved contacts
          </h2>
          <Link href="/app/contacts" style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.brand.cyan, textDecoration: "none" }}>
            Manage contacts →
          </Link>
        </div>
        <BankingCard padding={contacts.length === 0 ? 24 : 0}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "24px 0" }}>
              <UserPlus size={32} color={zp.text.muted} />
              <p style={{ margin: "10px 0 14px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>
                No contacts saved yet
              </p>
              <GradientButton variant="primary" size="md" href="/app/contacts" icon={<UserPlus size={14} />}>
                Add your first contact
              </GradientButton>
            </div>
          ) : (
            <div>
              {contacts.slice(0, 10).map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 18px",
                    borderTop: i > 0 ? `1px solid ${zp.surface.border}` : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>
                      {detectType(c)} · {c.bank_name || detectTarget(c)}
                    </div>
                  </div>
                  <div style={{ fontFamily: zp.font.mono, fontSize: 11, color: zp.text.muted }}>
                    {c.account_number ? `••${c.account_number.slice(-4)}` : (c.routing_number ?? "").replace("interac:", "") || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </BankingCard>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: zp.zIndex.toast,
          background: zp.surface.bg1, border: `1px solid ${zp.surface.border}`,
          borderRadius: zp.radius.md, padding: "10px 14px",
          boxShadow: zp.elevation.lg, display: "flex", gap: 8, alignItems: "center",
          fontSize: 13, color: zp.text.primary,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: zp.semantic.success, boxShadow: `0 0 10px ${zp.semantic.success}66` }} />
          {toast}
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .pr20-wallets-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DashboardShell>
  );
}

function SendPanel({ accounts, contacts, loading, onSent, showExternal, onToggleExternal }: { accounts: Account[]; contacts: Contact[]; loading: boolean; onSent: (msg?: string) => void; showExternal: boolean; onToggleExternal: (next: boolean) => void }) {
  const primary = accounts.find((a) => a.is_primary) ?? accounts[0] ?? null;
  const availableLabel = primary ? zp.fmtCurrency(Number(primary.balance ?? 0), primary.currency || "CAD") : "—";
  const [transferType, setTransferType] = useState<TransferType>("internal");
  const [form, setForm] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const selectedContact = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setForm((p) => ({
      ...p,
      recipient: c.name,
      routing_number: c.routing_number || "",
      account_number: c.account_number || "",
      bank_name: c.bank_name || "",
      swift_code: c.swift || "",
    }));
  };

  const submit = async () => {
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    setSending(true); setErr(null);
    try {
      if (transferType === "agent_treasury") {
        // Merchant → org treasury bridge via ZeniCore. Funds land in the
        // org treasury; distribution to a specific agent is a separate
        // action from /agents/treasury.
        const fromAccountId = form.from_account || accounts.find((a) => a.is_primary)?.id;
        if (!fromAccountId) { setErr("No source account found."); setSending(false); return; }
        const srcAccount = accounts.find((a) => a.id === fromAccountId);
        const currency = srcAccount?.currency || "CAD";
        const idempotencyKey = `merch2treasury-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const r = await fetch("/api/v1/agents/treasury/distribute-from-merchant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id:      mid(),
            from_account_id:  fromAccountId,
            amount_units:     amt,
            currency,
            idempotency_key:  idempotencyKey,
            memo:             form.memo || "",
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data?.error) {
          const msg = data?.error?.message || data?.error || "Transfer failed.";
          setErr(String(msg));
          setSending(false);
          return;
        }
        setForm({});
        onSent(`${zp.fmtCurrency(amt, currency)} sent to your agent treasury · ZeniCore verified ✓`);
        return;
      }

      // ─── Legacy: bank contact / wire / internal / bill pay ─────────
      const r = await fetch("/api/zenipay/banking-ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_transfer",
          merchant_id: mid(),
          transfer_type: transferType,
          recipient_name: form.recipient || "",
          routing_number: form.routing_number || "",
          account_number: form.account_number || "",
          bank_name: form.bank_name || "",
          recipient_swift: form.swift_code || "",
          from_account_id: form.from_account || accounts.find((a) => a.is_primary)?.id,
          to_account_id: form.to_account || "",
          amount: amt,
          memo: form.memo || "",
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.error) { setErr(data.error || "Transfer failed."); return; }
      setForm({});
      onSent();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSending(false); }
  };

  return (
    <BankingCard padding={0}>
      <div style={{ padding: "18px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" as const }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <SendHorizontal size={16} color={zp.brand.cyan} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Send money</h2>
          </div>
          <div style={{ fontSize: 12, color: zp.text.muted, fontFamily: zp.font.sans }}>
            Available <span style={{ fontFamily: zp.font.mono, color: zp.text.primary, fontWeight: zp.weight.semibold }}>{availableLabel}</span>
          </div>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: zp.text.muted }}>
          Internal transfers and agent funding are instant and free.
        </p>

        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm, flexWrap: "wrap" }}>
          {((showExternal
              ? ["internal", "agent_treasury", "ach", "wire", "bill_pay"]
              : ["internal", "agent_treasury"]) as TransferType[]).map((t) => {
            const active = t === transferType;
            const isAgent = t === "agent_treasury";
            return (
              <button
                key={t}
                onClick={() => { setTransferType(t); setForm({}); setErr(null); }}
                style={{
                  padding: "6px 12px", borderRadius: zp.radius.xs, border: "none",
                  background: active
                    ? (isAgent ? zp.gradient.main : zp.surface.bg1)
                    : "transparent",
                  color: active
                    ? (isAgent ? "#fff" : zp.text.primary)
                    : (isAgent ? zp.brand.violet : zp.text.muted),
                  fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  boxShadow: active ? zp.elevation.sm : undefined, cursor: "pointer",
                  textTransform: "capitalize" as const,
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {isAgent && <Bot size={12} />}
                {t === "bill_pay" ? "Bill pay" : t === "agent_treasury" ? "Agent treasury" : t}
              </button>
            );
          })}
          <button
            onClick={() => onToggleExternal(!showExternal)}
            style={{
              padding: "6px 12px", borderRadius: zp.radius.xs, border: "none",
              background: "transparent", color: zp.text.muted,
              fontSize: 12, fontWeight: zp.weight.medium, cursor: "pointer",
            }}
          >
            {showExternal ? "− Hide external" : "+ External bank"}
          </button>
        </div>
      </div>

      <div style={{ padding: 22, borderTop: `1px solid ${zp.surface.border}`, marginTop: 16 }}>
        {(transferType === "ach" || transferType === "wire") && (
          <>
            <Label>Saved contacts</Label>
            <select
              onChange={(e) => selectedContact(e.target.value)}
              style={inputStyle}
              defaultValue=""
              disabled={loading}
            >
              <option value="">{contacts.length === 0 ? "No contacts saved — add one below" : "Select a contact…"}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        {transferType === "agent_treasury" && (
          <>
            <Label>From account</Label>
            <select
              value={form.from_account ?? (accounts.find((a) => a.is_primary)?.id ?? "")}
              onChange={(e) => set("from_account", e.target.value)}
              style={inputStyle}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name} ({zp.fmtCurrency(a.balance, a.currency ?? "CAD")})</option>
              ))}
            </select>

            <div style={{
              marginTop: 14, padding: "12px 14px",
              borderRadius: zp.radius.sm,
              background: `linear-gradient(135deg, rgba(123,79,191,0.08) 0%, rgba(123,79,191,0.02) 100%)`,
              border: `1px solid rgba(123,79,191,0.25)`,
              display: "flex", gap: 10,
            }}>
              <Bot size={16} color={zp.brand.violet} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
                  Send to your agent treasury
                </div>
                <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2, lineHeight: 1.45 }}>
                  Funds land in your org treasury first. Distribute to individual agents
                  from{" "}
                  <a href="/agents/treasury" style={{ color: zp.brand.violet, fontWeight: zp.weight.semibold }}>
                    /agents/treasury
                  </a>.
                </div>
              </div>
            </div>
          </>
        )}

        {transferType === "internal" && (
          <>
            <Label>From account</Label>
            <select
              value={form.from_account ?? ""}
              onChange={(e) => set("from_account", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name} ({zp.fmtCurrency(a.balance)})</option>
              ))}
            </select>
            <Label style={{ marginTop: 14 }}>To account</Label>
            <select
              value={form.to_account ?? ""}
              onChange={(e) => set("to_account", e.target.value)}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {accounts.filter((a) => a.id !== form.from_account).map((a) => (
                <option key={a.id} value={a.id}>{a.account_name} ({zp.fmtCurrency(a.balance)})</option>
              ))}
            </select>
          </>
        )}

        {transferType === "ach" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div><Label>Recipient</Label><Input value={form.recipient ?? ""} onChange={(v) => set("recipient", v)} /></div>
            <div><Label>Routing</Label><Input value={form.routing_number ?? ""} onChange={(v) => set("routing_number", v)} placeholder="021000021" /></div>
            <div style={{ gridColumn: "1 / -1" }}><Label>Account number</Label><Input value={form.account_number ?? ""} onChange={(v) => set("account_number", v)} /></div>
          </div>
        )}
        {transferType === "wire" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div><Label>Recipient</Label><Input value={form.recipient ?? ""} onChange={(v) => set("recipient", v)} /></div>
            <div><Label>Bank name</Label><Input value={form.bank_name ?? ""} onChange={(v) => set("bank_name", v)} /></div>
            <div><Label>Routing</Label><Input value={form.routing_number ?? ""} onChange={(v) => set("routing_number", v)} /></div>
            <div><Label>Account / IBAN</Label><Input value={form.account_number ?? ""} onChange={(v) => set("account_number", v)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><Label>SWIFT (intl)</Label><Input value={form.swift_code ?? ""} onChange={(v) => set("swift_code", v)} placeholder="Leave blank for domestic" /></div>
          </div>
        )}
        {transferType === "bill_pay" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div><Label>Payee</Label><Input value={form.recipient ?? ""} onChange={(v) => set("recipient", v)} /></div>
            <div><Label>Account number</Label><Input value={form.account_number ?? ""} onChange={(v) => set("account_number", v)} /></div>
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <div><Label>Amount (CAD)</Label><Input value={form.amount ?? ""} onChange={(v) => set("amount", v)} type="number" step="0.01" placeholder="0.00" /></div>
          <div><Label>Memo (optional)</Label><Input value={form.memo ?? ""} onChange={(v) => set("memo", v)} placeholder="Invoice #1234" /></div>
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>
            {err}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <GradientButton
            variant="primary" size="md"
            onClick={submit}
            disabled={sending || !form.amount}
            icon={<SendHorizontal size={14} />}
          >
            {sending ? "Sending…" : (form.amount ? `Send ${zp.fmtCurrency(Number(form.amount))}` : "Send")}
          </GradientButton>
        </div>
      </div>
    </BankingCard>
  );
}

function ReceivePanel({ account, onCopy: _onCopy }: { account: Account | null; onCopy: () => void }) {
  if (!account) {
    return (
      <BankingCard padding={22}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ArrowDownLeft size={16} color={zp.brand.cyan} />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Receive money</h2>
        </div>
        <div style={{ padding: "18px 0", color: zp.text.muted, fontSize: 13 }}>
          Open your first ZeniPay account in <Link href="/app/accounts" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>/app/accounts</Link> to receive money.
        </div>
      </BankingCard>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
      <ZeniPayAccountCard
        accountType="merchant"
        accent="cyan"
        accountNumber={account.zp_account_number ?? null}
        routingCode={account.zp_routing_code ?? null}
        accountName={account.account_name}
        currency={account.currency || "CAD"}
        balance={Number(account.balance ?? 0)}
      />
      <BankingCard accent="neutral" style={{ borderLeft: `3px solid ${zp.semantic.warning}` }}>
        <div style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.semantic.warning, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 6 }}>
          External bank transfer
        </div>
        <p style={{ margin: 0, fontSize: 12, color: zp.text.muted, lineHeight: 1.5 }}>
          To receive funds from external banks (ACH, wire), use your payment link or
          ask your sender to use your ZeniPay account details above.
        </p>
        <div style={{ marginTop: 12 }}>
          <GradientButton href="/app/pay-links" variant="primary" size="sm">
            Create payment link
          </GradientButton>
        </div>
      </BankingCard>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, ...style }}>{children}</label>;
}

function Input({ value, onChange, placeholder, type = "text", step }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string }) {
  return <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}

function detectType(c: Contact): string {
  if (c.swift) return "SWIFT";
  if ((c.routing_number ?? "").startsWith("interac:")) return "Interac";
  if ((c.routing_number ?? "").includes("-")) return "Domestic CA";
  if (c.routing_number && c.routing_number.length >= 9) return "US ACH";
  return "—";
}
function detectTarget(c: Contact): string {
  if ((c.routing_number ?? "").startsWith("interac:")) return (c.routing_number || "").replace("interac:", "");
  return c.bank_name || c.routing_number || "—";
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};
