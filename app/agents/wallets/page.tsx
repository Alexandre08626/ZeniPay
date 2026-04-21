// /agents/wallets — Treasury view.
// - Hero card: organization master wallet balance + top-up button.
// - Agent wallet grid: one row per agent with a "Transfer" action.
// - Recent transfers: last 20 top-ups and distributions.

"use client";

import React, { useEffect, useState } from "react";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER,
  ROW_SEP,
  TEXT,
  MUTED,
  LIGHT,
  ZP_GRAD,
  ZP_GREEN,
  ZP_CYAN,
  ZP_PURPLE,
  fmtUSD,
  fmtDate,
} from "@/components/agents/theme";

interface OrgWallet {
  id: string;
  balance_cents: number;
  currency: string;
}
interface Transfer {
  id: string;
  from_wallet_type: "org" | "agent" | "treasury";
  to_wallet_type: "org" | "agent" | "treasury";
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  amount_cents: number;
  note: string | null;
  created_at: string;
}
interface AgentRow {
  id: string;
  name: string;
  status: string;
  wallet: { id: string; balance_cents: number; currency: string } | null;
}

export default function WalletsPage() {
  const [wallet, setWallet] = useState<OrgWallet | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [transferFor, setTransferFor] = useState<AgentRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([
        apiFetch<{ wallet: OrgWallet; transfers: Transfer[] }>("/api/v1/agents/org-wallet"),
        apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents"),
      ]);
      setWallet(w.wallet);
      setTransfers(w.transfers);
      setAgents(a.agents);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const totalAgentBalance = agents.reduce((s, a) => s + (a.wallet?.balance_cents ?? 0), 0);
  const totalDistributed = transfers
    .filter((t) => t.from_wallet_type === "org" && t.to_wallet_type === "agent")
    .reduce((s, t) => s + t.amount_cents, 0);

  return (
    <Shell title="Wallets">
      {/* Hero master wallet */}
      <Card
        style={{
          marginBottom: 16,
          padding: 0,
          overflow: "hidden",
          position: "relative",
          borderLeft: "none",
        }}
      >
        <div
          style={{
            background: ZP_GRAD,
            padding: "28px 28px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: -60,
              top: -60,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.12em",
              opacity: 0.85,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            ZeniPay · Organization treasury
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "-1.2px",
              lineHeight: 1,
            }}
          >
            {wallet ? fmtUSD(wallet.balance_cents) : "—"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.8 }}>
            Fund this wallet, then distribute budget to your AI agents below.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <button
              onClick={() => setTopupOpen(true)}
              style={{
                background: "#fff",
                color: "#0f172a",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add funds
            </button>
            <span
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {wallet?.id ?? ""}
            </span>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <Metric label="Across agent wallets" value={fmtUSD(totalAgentBalance)} sub={`${agents.length} agents`} color={ZP_CYAN} />
        <Metric label="Distributed (recent)" value={fmtUSD(totalDistributed)} sub="last 20 transfers" color={ZP_PURPLE} />
        <Metric label="Master wallet id" value={wallet?.id?.slice(0, 12) + "…" || "—"} sub={wallet?.currency ?? "USD"} color={ZP_GREEN} />
      </div>

      {/* Agent wallets grid */}
      <Card style={{ marginBottom: 16, padding: 0 }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Agent wallets</h3>
          <span style={{ fontSize: 11, color: MUTED }}>{agents.length} total</span>
        </div>
        {loading ? (
          <p style={{ padding: 20, color: MUTED, fontSize: 13, margin: 0 }}>Loading…</p>
        ) : agents.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, fontSize: 13, margin: 0 }}>
            No agents yet. Create one on the Agents page, then come back to fund it.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Agent", "Wallet id", "Balance", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: MUTED,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace" }}>{a.id}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: MUTED, fontFamily: "ui-monospace" }}>
                    {a.wallet?.id ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>
                    {a.wallet ? fmtUSD(a.wallet.balance_cents) : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: a.status === "active" ? "rgba(45,190,96,0.12)" : "#f1f5f9",
                        color: a.status === "active" ? "#16A34A" : "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => setTransferFor(a)}
                      disabled={!a.wallet}
                      style={{
                        background: ZP_GRAD,
                        color: "#fff",
                        border: "none",
                        padding: "7px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: a.wallet ? "pointer" : "not-allowed",
                        opacity: a.wallet ? 1 : 0.45,
                      }}
                    >
                      Transfer →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Recent transfers */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent movements</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Top-ups from treasury + distributions to agents.
          </p>
        </div>
        {transfers.length === 0 ? (
          <p style={{ padding: 20, color: MUTED, fontSize: 13, margin: 0 }}>No transfers yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "From", "To", "Amount", "Note"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: MUTED,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: TEXT, fontFamily: "ui-monospace" }}>
                    {t.from_wallet_type}
                    {t.from_wallet_id ? ` · ${t.from_wallet_id.slice(0, 10)}…` : ""}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: TEXT, fontFamily: "ui-monospace" }}>
                    {t.to_wallet_type}
                    {t.to_wallet_id ? ` · ${t.to_wallet_id.slice(0, 10)}…` : ""}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>
                    {fmtUSD(t.amount_cents)}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>{t.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {topupOpen && (
        <TopupModal
          onClose={() => setTopupOpen(false)}
          onDone={async () => {
            setTopupOpen(false);
            await load();
          }}
        />
      )}
      {transferFor && transferFor.wallet && (
        <TransferModal
          agent={transferFor}
          orgBalance={wallet?.balance_cents ?? 0}
          onClose={() => setTransferFor(null)}
          onDone={async () => {
            setTransferFor(null);
            await load();
          }}
        />
      )}
    </Shell>
  );
}

function TopupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await apiFetch("/api/v1/agents/org-wallet/topup", {
        method: "POST",
        body: JSON.stringify({
          amount_cents: Math.round(Number(amount) * 100),
          note: note || null,
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
    <Modal title="Add funds to treasury" onClose={onClose}>
      <form onSubmit={submit}>
        <p style={{ margin: "0 0 12px", color: MUTED, fontSize: 12 }}>
          Phase 1: demo-level. Phase 2 will route this through a Finix charge + webhook.
        </p>
        <Label>AMOUNT (USD)</Label>
        <Input value={amount} onChange={setAmount} placeholder="100" />
        <Label>NOTE (optional)</Label>
        <Input value={note} onChange={setNote} placeholder="Monthly top-up" />

        {err && <ErrorBox message={err} />}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
          <button type="submit" disabled={loading || !amount} style={btnPrimary(loading)}>
            {loading ? "Adding…" : `Add ${fmtUSD(Math.round(Number(amount || 0) * 100))}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransferModal({
  agent,
  orgBalance,
  onClose,
  onDone,
}: {
  agent: AgentRow;
  orgBalance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await apiFetch("/api/v1/agents/org-wallet/transfer", {
        method: "POST",
        body: JSON.stringify({
          agent_wallet_id: agent.wallet!.id,
          amount_cents: Math.round(Number(amount) * 100),
          note: note || null,
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
    <Modal title={`Transfer to ${agent.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: 12,
            background: "#f8fafc",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, letterSpacing: "0.06em" }}>TREASURY</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>{fmtUSD(orgBalance)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 800, letterSpacing: "0.06em" }}>
              {agent.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>
              {fmtUSD(agent.wallet?.balance_cents ?? 0)}
            </div>
          </div>
        </div>
        <Label>AMOUNT (USD)</Label>
        <Input value={amount} onChange={setAmount} placeholder="10" />
        <Label>NOTE (optional)</Label>
        <Input value={note} onChange={setNote} placeholder="Weekly budget" />

        {err && <ErrorBox message={err} />}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
          <button
            type="submit"
            disabled={loading || !amount || Math.round(Number(amount) * 100) > orgBalance}
            style={btnPrimary(loading)}
          >
            {loading
              ? "Sending…"
              : Math.round(Number(amount || 0) * 100) > orgBalance
              ? "Insufficient treasury"
              : `Send ${fmtUSD(Math.round(Number(amount || 0) * 100))}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// --- small shared atoms ---

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: LIGHT, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 800,
        color: MUTED,
        letterSpacing: "0.08em",
        marginTop: 10,
      }}
    >
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "11px 14px",
        borderRadius: 10,
        border: `1.5px solid ${BORDER}`,
        fontSize: 14,
        outline: "none",
        margin: "6px 0 4px",
        boxSizing: "border-box",
        background: "#f8fafc",
        color: TEXT,
      }}
    />
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(220,38,38,0.08)",
        color: "#DC2626",
        fontSize: 12,
        fontWeight: 700,
        marginTop: 10,
      }}
    >
      {message}
    </div>
  );
}

function btnPrimary(loading: boolean): React.CSSProperties {
  return {
    background: loading ? "#94a3b8" : ZP_GRAD,
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 13,
    cursor: loading ? "not-allowed" : "pointer",
    flex: 1,
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    background: "#f1f5f9",
    color: MUTED,
    border: `1px solid ${BORDER}`,
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    flex: 1,
  };
}
