// /agents/treasury — CFO command center for treasury.
// Multi-currency balances, funding sources, fund modal, recent movements.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN, ZP_CYAN, ZP_PURPLE, ZP_BLUE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

type Currency = "USD" | "CAD" | "EUR" | "USDC";
interface Treasury   { id: string; default_currency: Currency; credit_limit_cents: number; credit_used_cents: number; status: string; }
interface Balance    { id: string; currency: Currency; balance_cents: number; pending_cents: number; usd_equivalent_cents: number; }
interface Totals     { total_balance_cents_usd: number; credit_limit_cents: number; credit_used_cents: number; credit_available_cents: number; }
interface FundingSrc { id: string; type: string; nickname: string; status: string; is_default: boolean; details: Record<string,unknown>; created_at: string; }
interface Transfer   { id: string; from_wallet_type: string; to_wallet_type: string; amount_cents: number; currency: string; note: string | null; created_at: string; }

const CURRENCY_COLORS: Record<Currency, string> = {
  USD: ZP_GREEN,
  CAD: ZP_BLUE,
  EUR: ZP_PURPLE,
  USDC: ZP_CYAN,
};

const fmtCurrency = (cents: number, currency: string) => {
  const map: Record<string, { locale: string; currency: string }> = {
    USD: { locale: "en-US", currency: "USD" },
    CAD: { locale: "en-CA", currency: "CAD" },
    EUR: { locale: "de-DE", currency: "EUR" },
    USDC: { locale: "en-US", currency: "USD" },
  };
  const c = map[currency] ?? { locale: "en-US", currency: "USD" };
  const formatted = new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency }).format(cents / 100);
  return currency === "USDC" ? formatted.replace("$", "") + " USDC" : formatted;
};

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [sources, setSources] = useState<FundingSrc[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundOpen, setFundOpen] = useState(false);
  const [addSrcOpen, setAddSrcOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([
        apiFetch<{ treasury: Treasury; balances: Balance[]; totals: Totals | null; funding_sources: FundingSrc[] }>(
          "/api/v1/agents/treasury",
        ),
        apiFetch<{ wallet: { id: string; balance_cents: number }; transfers: Transfer[] }>("/api/v1/agents/org-wallet"),
      ]);
      setTreasury(t.treasury);
      setBalances(t.balances);
      setTotals(t.totals);
      setSources(t.funding_sources);
      setTransfers(w.transfers);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const totalUsd = totals?.total_balance_cents_usd ?? 0;
  const creditUsd = totals?.credit_available_cents ?? 0;

  return (
    <Shell title="Treasury">
      {/* Hero card — master USD-equivalent balance + gradient */}
      <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden", borderLeft: "none" }}>
        <div style={{ background: ZP_GRAD, padding: "28px 28px", color: "#fff", position: "relative", overflow: "hidden" }}>
          <span aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", opacity: 0.85, fontWeight: 700, textTransform: "uppercase" }}>
            ZeniPay · Organization treasury · USD-equivalent
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, letterSpacing: "-1.2px", lineHeight: 1 }}>
            {fmtUSD(totalUsd)}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.8 }}>
            {balances.length} {balances.length === 1 ? "currency" : "currencies"} · {sources.length} funding {sources.length === 1 ? "source" : "sources"} · credit available {fmtUSD(creditUsd)}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <button
              onClick={() => setFundOpen(true)}
              style={{ background: "#fff", color: "#0f172a", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              + Fund treasury
            </button>
            <button
              onClick={() => setAddSrcOpen(true)}
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Add funding source
            </button>
            <span style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "ui-monospace" }}>
              {treasury?.id ?? "provisioning…"}
            </span>
          </div>
        </div>
      </Card>

      {/* Per-currency balances */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
        {loading && balances.length === 0 ? (
          <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading balances…</p></Card>
        ) : balances.length === 0 ? (
          <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>No balances yet. Fund the treasury to seed one.</p></Card>
        ) : (
          balances.map((b) => (
            <Metric
              key={b.id}
              label={b.currency}
              value={fmtCurrency(b.balance_cents, b.currency)}
              sub={b.currency === "USD" ? undefined : `≈ ${fmtUSD(b.usd_equivalent_cents)} USD`}
              color={CURRENCY_COLORS[b.currency] ?? ZP_GREEN}
            />
          ))
        )}
      </div>

      {/* Funding sources table */}
      <Card style={{ marginBottom: 16, padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Funding sources</h3>
          <button
            onClick={() => setAddSrcOpen(true)}
            style={{ background: "transparent", color: ZP_GREEN, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            + Add source
          </button>
        </div>
        {sources.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, fontSize: 13, margin: 0 }}>
            None yet. Add a funding source (Finix card, ZeniPay merchant wallet, wire, USDC) to enable treasury top-ups.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Nickname", "Type", "Status", "Default", "Added", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT }}>{s.nickname}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED, fontFamily: "ui-monospace" }}>{s.type}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusPill status={s.status} />
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{s.is_default ? "✓" : "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{fmtDate(s.created_at)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${s.nickname}"?`)) return;
                        await apiFetch(`/api/v1/agents/funding-sources/${s.id}`, { method: "DELETE" });
                        await load();
                      }}
                      style={{ background: "transparent", border: `1px solid rgba(220,38,38,0.3)`, color: "#DC2626", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Recent movements */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent movements</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Treasury top-ups + distributions to agent wallets.
          </p>
        </div>
        {transfers.length === 0 ? (
          <p style={{ padding: 20, color: MUTED, fontSize: 13, margin: 0 }}>No transfers yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "From", "To", "Amount", "Note"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: TEXT, fontFamily: "ui-monospace" }}>{t.from_wallet_type}</td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: TEXT, fontFamily: "ui-monospace" }}>{t.to_wallet_type}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>{fmtCurrency(t.amount_cents, t.currency)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>{t.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {fundOpen && <FundModal sources={sources} onClose={() => setFundOpen(false)} onDone={async () => { setFundOpen(false); await load(); }} />}
      {addSrcOpen && <AddSourceModal onClose={() => setAddSrcOpen(false)} onDone={async () => { setAddSrcOpen(false); await load(); }} />}
    </Shell>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    verified:               { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    pending_verification:   { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    disabled:               { bg: "#f1f5f9", fg: "#64748b" },
    failed_verification:    { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {status.replace("_", " ")}
    </span>
  );
}

function FundModal({ sources, onClose, onDone }: { sources: FundingSrc[]; onClose: () => void; onDone: () => void }) {
  const verified = useMemo(() => sources.filter((s) => s.status === "verified"), [sources]);
  const [sourceId, setSourceId] = useState<string>(verified[0]?.id ?? "");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const idempotencyKey = `treasury-fund-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await apiFetch("/api/v1/agents/treasury/fund", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          funding_source_id: sourceId,
          amount_cents: Math.round(Number(amount) * 100),
          currency,
        }),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Fund treasury" onClose={onClose}>
      <form onSubmit={submit}>
        <p style={{ margin: "0 0 12px", color: MUTED, fontSize: 12 }}>
          Move money from a verified funding source into the org treasury. Idempotent — safe to retry.
        </p>
        <Label>SOURCE</Label>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          required
          style={inputStyle()}
        >
          <option value="">— select —</option>
          {verified.map((s) => (
            <option key={s.id} value={s.id}>{s.nickname} ({s.type})</option>
          ))}
        </select>
        {verified.length === 0 && (
          <p style={{ fontSize: 11, color: "#D97706", marginTop: 4 }}>
            No verified sources. Add one first.
          </p>
        )}
        <Label>AMOUNT</Label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" style={inputStyle()} />
        <Label>CURRENCY</Label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={inputStyle()}>
          <option value="USD">USD</option>
          <option value="CAD" disabled>CAD (Phase 3)</option>
          <option value="EUR" disabled>EUR (Phase 3)</option>
          <option value="USDC" disabled>USDC (Phase 3)</option>
        </select>
        {err && <ErrorBox message={err} />}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
          <button type="submit" disabled={loading || !sourceId || !amount} style={btnPrimary(loading)}>
            {loading ? "Sending…" : `Fund ${fmtUSD(Math.round(Number(amount || 0) * 100))}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddSourceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<"finix_card" | "zenipay_merchant_wallet" | "wire_ach" | "usdc_wallet">("zenipay_merchant_wallet");
  const [nickname, setNickname] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const details: Record<string, unknown> = {};
      if (type === "finix_card") details.instrument_id = instrumentId;
      if (type === "zenipay_merchant_wallet") details.merchant_id = merchantId;
      await apiFetch("/api/v1/agents/funding-sources", {
        method: "POST",
        body: JSON.stringify({ type, nickname: nickname || type, details }),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add funding source" onClose={onClose}>
      <form onSubmit={submit}>
        <Label>TYPE</Label>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={inputStyle()}>
          <option value="zenipay_merchant_wallet">ZeniPay merchant wallet</option>
          <option value="finix_card">Finix card (tokenized)</option>
          <option value="wire_ach">Wire / ACH (pending verification)</option>
          <option value="usdc_wallet">USDC wallet (pending verification)</option>
        </select>
        <Label>NICKNAME</Label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Main ops account" style={inputStyle()} />

        {type === "zenipay_merchant_wallet" && (
          <>
            <Label>ZENIPAY MERCHANT ID</Label>
            <input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="zeniva-001" style={inputStyle()} required />
            <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
              Pulls USD from this merchant&apos;s ZeniPay balance on each top-up.
            </p>
          </>
        )}
        {type === "finix_card" && (
          <>
            <Label>FINIX INSTRUMENT ID</Label>
            <input value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} placeholder="PI_..." style={inputStyle()} required />
            <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
              Tokenize a card with Finix.js client-side first, then paste the instrument id here.
            </p>
          </>
        )}
        {(type === "wire_ach" || type === "usdc_wallet") && (
          <p style={{ marginTop: 10, padding: "10px 12px", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 8, color: "#92400E", fontSize: 12 }}>
            Wire/USDC sources land in <code>pending_verification</code>. Phase 3 adds the matching verification rail.
          </p>
        )}

        {err && <ErrorBox message={err} />}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
          <button type="submit" disabled={loading} style={btnPrimary(loading)}>
            {loading ? "Adding…" : "Add source"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ───────────────────────── shared atoms ─────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: LIGHT, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em", marginTop: 10 }}>{children}</label>;
}
function ErrorBox({ message }: { message: string }) {
  return <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700, marginTop: 10 }}>{message}</div>;
}
function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none", margin: "6px 0 4px", boxSizing: "border-box", background: "#f8fafc", color: TEXT };
}
function btnPrimary(loading: boolean): React.CSSProperties {
  return { background: loading ? "#94a3b8" : ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", flex: 1 };
}
function btnSecondary(): React.CSSProperties {
  return { background: "#f1f5f9", color: MUTED, border: `1px solid ${BORDER}`, padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", flex: 1 };
}
