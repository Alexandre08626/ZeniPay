// /agents/agents/[id] — single agent view:
//   profile + wallet balance + policy editor + recent transactions.

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
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
  ZP_BLUE,
  fmtUSD,
  fmtDate,
} from "@/components/agents/theme";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  public_key: string | null;
  status: string;
  created_at: string;
}
interface Wallet {
  id: string;
  balance_cents: number;
  currency: string;
}
interface Policy {
  id: string;
  wallet_id: string;
  monthly_budget_cents: number | null;
  daily_cap_cents: number | null;
  per_tx_cap_cents: number | null;
  merchant_whitelist: string[];
  merchant_blacklist: string[];
  allowed_categories: string[];
  time_window_start: string | null;
  time_window_end: string | null;
  active: boolean;
}
interface Tx {
  id: string;
  amount_cents: number;
  currency: string;
  merchant_id: string | null;
  status: string;
  protocol_used: string | null;
  created_at: string;
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<{
        agent: Agent;
        wallet: Wallet | null;
        policy: Policy | null;
        transactions: Tx[];
      }>(`/api/v1/agents/agents/${id}`);
      setAgent(d.agent);
      setWallet(d.wallet);
      setPolicy(d.policy);
      setTxs(d.transactions);
    } catch (e) {
      if (String(e).includes("404")) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (notFound) {
    return (
      <Shell title="Agent not found">
        <Card>
          <p style={{ color: MUTED, fontSize: 14 }}>
            No agent with id <code>{id}</code> in this organization.{" "}
            <Link href="/agents/agents" style={{ color: ZP_GREEN, fontWeight: 700 }}>
              Back to list →
            </Link>
          </p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title={agent?.name ?? "Agent"}>
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/agents/agents"
          style={{ fontSize: 12, color: MUTED, fontWeight: 700, textDecoration: "none" }}
        >
          ← All agents
        </Link>
      </div>

      {loading && !agent ? (
        <p style={{ color: MUTED }}>Loading…</p>
      ) : agent ? (
        <>
          {/* Header card */}
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-0.3px" }}>
                  {agent.name}
                </h2>
                {agent.description && (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>{agent.description}</p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
                    fontSize: 11,
                    fontFamily: "ui-monospace",
                    color: LIGHT,
                  }}
                >
                  <span>{agent.id}</span>
                  <span>·</span>
                  <span>type: {agent.agent_type}</span>
                  <span>·</span>
                  <span>created {fmtDate(agent.created_at)}</span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: agent.status === "active" ? "rgba(45,190,96,0.12)" : "#f1f5f9",
                  color: agent.status === "active" ? "#16A34A" : "#64748b",
                  textTransform: "uppercase",
                }}
              >
                {agent.status}
              </span>
            </div>
          </Card>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <Metric
              label="Wallet balance"
              value={wallet ? fmtUSD(wallet.balance_cents) : "—"}
              sub={wallet?.currency}
              color={ZP_GREEN}
            />
            <Metric
              label="Recent transactions"
              value={String(txs.length)}
              sub="last 20"
              color={ZP_CYAN}
            />
            <Metric
              label="Spent (recent)"
              value={fmtUSD(
                txs
                  .filter((t) => t.status === "authorized" || t.status === "captured")
                  .reduce((s, t) => s + t.amount_cents, 0),
              )}
              color={ZP_PURPLE}
            />
            <Metric
              label="Policy"
              value={policy?.active ? "Active" : "Inactive"}
              sub={policy ? "configured" : "—"}
              color={ZP_BLUE}
            />
          </div>

          {/* Chat with the agent */}
          <AgentChatPanel agent={agent} />

          {/* Policy editor */}
          <PolicyEditor agentId={agent.id} policy={policy} onSaved={load} />

          {/* Public key */}
          {agent.public_key && (
            <Card style={{ marginTop: 16 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800 }}>Public key</h3>
              <p style={{ color: MUTED, fontSize: 12, margin: "0 0 8px" }}>
                Ed25519 public key. Used to verify signed payment requests from this agent.
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  background: "#0f172a",
                  color: "#e5e7eb",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "ui-monospace",
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                }}
              >
                {agent.public_key}
              </pre>
            </Card>
          )}

          {/* Transactions */}
          <Card style={{ marginTop: 16, padding: 0 }}>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent transactions</h3>
              <Link
                href={`/agents/transactions`}
                style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}
              >
                View all →
              </Link>
            </div>
            {txs.length === 0 ? (
              <p style={{ color: MUTED, padding: 24, fontSize: 13, margin: 0 }}>No transactions yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["When", "Merchant", "Amount", "Status", "Protocol"].map((h) => (
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
                  {txs.map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>
                        {fmtDate(t.created_at)}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: TEXT }}>{t.merchant_id ?? "—"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>
                        {fmtUSD(t.amount_cents)}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <StatusPill status={t.status} />
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 11, color: MUTED }}>
                        {t.protocol_used ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : null}
    </Shell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    authorized: { bg: "rgba(21,184,201,0.12)", fg: "#0891B2" },
    captured: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    denied: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    failed: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    reversed: { bg: "rgba(123,79,191,0.1)", fg: "#7B4FBF" },
  };
  const c = map[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        background: c.bg,
        color: c.fg,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Policy editor
// ---------------------------------------------------------------------------

function PolicyEditor({
  agentId,
  policy,
  onSaved,
}: {
  agentId: string;
  policy: Policy | null;
  onSaved: () => Promise<void> | void;
}) {
  const toDollars = (c: number | null) => (c == null ? "" : String(c / 100));
  const fromDollars = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };

  const [monthly, setMonthly] = useState(toDollars(policy?.monthly_budget_cents ?? null));
  const [daily, setDaily] = useState(toDollars(policy?.daily_cap_cents ?? null));
  const [perTx, setPerTx] = useState(toDollars(policy?.per_tx_cap_cents ?? null));
  const [whitelist, setWhitelist] = useState((policy?.merchant_whitelist ?? []).join(", "));
  const [blacklist, setBlacklist] = useState((policy?.merchant_blacklist ?? []).join(", "));
  const [categories, setCategories] = useState((policy?.allowed_categories ?? []).join(", "));
  const [winStart, setWinStart] = useState(policy?.time_window_start?.slice(0, 5) ?? "");
  const [winEnd, setWinEnd] = useState(policy?.time_window_end?.slice(0, 5) ?? "");
  const [active, setActive] = useState(policy?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setMonthly(toDollars(policy?.monthly_budget_cents ?? null));
    setDaily(toDollars(policy?.daily_cap_cents ?? null));
    setPerTx(toDollars(policy?.per_tx_cap_cents ?? null));
    setWhitelist((policy?.merchant_whitelist ?? []).join(", "));
    setBlacklist((policy?.merchant_blacklist ?? []).join(", "));
    setCategories((policy?.allowed_categories ?? []).join(", "));
    setWinStart(policy?.time_window_start?.slice(0, 5) ?? "");
    setWinEnd(policy?.time_window_end?.slice(0, 5) ?? "");
    setActive(policy?.active ?? true);
  }, [policy]);

  const toArr = (csv: string) =>
    csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const save = async () => {
    setErr("");
    setSaving(true);
    try {
      const patch = {
        monthly_budget_cents: monthly === "" ? null : fromDollars(monthly),
        daily_cap_cents: daily === "" ? null : fromDollars(daily),
        per_tx_cap_cents: perTx === "" ? null : fromDollars(perTx),
        merchant_whitelist: toArr(whitelist),
        merchant_blacklist: toArr(blacklist),
        allowed_categories: toArr(categories),
        time_window_start: winStart ? `${winStart}:00` : null,
        time_window_end: winEnd ? `${winEnd}:00` : null,
        active,
      };
      await apiFetch(`/api/v1/agents/agents/${agentId}/policies`, {
        method: "POST",
        body: JSON.stringify(patch),
      });
      setSavedAt(Date.now());
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Spending policy</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Rules evaluated on every <code>/payments/authorize</code> call.
          </p>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: MUTED, fontWeight: 700 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
        <Field label="Monthly budget (USD)" value={monthly} onChange={setMonthly} placeholder="e.g. 500" />
        <Field label="Daily cap (USD)" value={daily} onChange={setDaily} placeholder="e.g. 50" />
        <Field label="Per-transaction cap (USD)" value={perTx} onChange={setPerTx} placeholder="e.g. 5" />
      </div>

      <div style={{ marginTop: 10 }}>
        <Field
          label="Merchant whitelist (comma-separated)"
          value={whitelist}
          onChange={setWhitelist}
          placeholder="empty = allow all"
        />
        <Field
          label="Merchant blacklist (comma-separated)"
          value={blacklist}
          onChange={setBlacklist}
          placeholder="mrch_bad1, mrch_bad2"
        />
        <Field
          label="Allowed categories (comma-separated)"
          value={categories}
          onChange={setCategories}
          placeholder="empty = any category"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <TimeField label="Time window start (UTC)" value={winStart} onChange={setWinStart} />
        <TimeField label="Time window end (UTC)" value={winEnd} onChange={setWinEnd} />
      </div>

      {err && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(220,38,38,0.08)",
            color: "#DC2626",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, alignItems: "center" }}>
        {savedAt && (
          <span style={{ fontSize: 11, color: ZP_GREEN, fontWeight: 700 }}>
            ✓ saved {fmtDate(new Date(savedAt).toISOString())}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: saving ? "#94a3b8" : ZP_GRAD,
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save policy"}
        </button>
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1.5px solid ${BORDER}`,
          fontSize: 13,
          outline: "none",
          margin: "4px 0 0",
          boxSizing: "border-box",
          background: "#f8fafc",
          color: TEXT,
        }}
      />
    </div>
  );
}

// ─── Chat panel ────────────────────────────────────────────────────────
//
// Talk-to-your-specialist surface. Posts to
// /api/v1/agents/agents/[id]/chat which loads the agent's persona from
// agents.agents and forwards through Groq → Anthropic. History lives in
// component state for v1 (no DB persistence yet) and is sent back to
// the API on each turn so the model has context.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AgentChatPanel({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, sending]);

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setErr(null);
    setSending(true);
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextHistory);
    setInput("");
    try {
      const data = await apiFetch<{
        reply: string; provider: string; model: string;
        error?: string; message?: string;
      }>(`/api/v1/agents/agents/${agent.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message, history: messages.slice(-20) }),
      });
      if (data?.error) {
        setErr(data.message || data.error);
      } else if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setProvider(data.provider);
      } else {
        setErr("Empty response from the agent.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Card style={{ marginBottom: 16, padding: 0 }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Chat with {agent.name}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED }}>
            Ask anything in your agent&rsquo;s area of expertise. The conversation isn&rsquo;t saved.
          </p>
        </div>
        {provider && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
            background: "rgba(45,190,96,0.10)", color: ZP_GREEN,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            via {provider}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          padding: "16px 18px",
          maxHeight: 360,
          minHeight: 120,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#fafbfc",
        }}
      >
        {messages.length === 0 && !sending && (
          <p style={{ margin: 0, fontSize: 13, color: MUTED, textAlign: "center", padding: "24px 0" }}>
            Start a conversation with {agent.name}.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? ZP_GRAD : "#FFFFFF",
              color: m.role === "user" ? "#FFFFFF" : TEXT,
              border: m.role === "user" ? "none" : `1px solid ${BORDER}`,
              boxShadow: m.role === "user" ? "0 2px 6px rgba(45,190,96,0.18)" : "none",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 12,
              fontStyle: "italic",
              color: MUTED,
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
            }}
          >
            {agent.name} is thinking…
          </div>
        )}
      </div>

      {err && (
        <div role="alert" style={{
          margin: "0 18px 12px", padding: "8px 12px", borderRadius: 8,
          background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
          fontSize: 12, fontWeight: 700,
        }}>{err}</div>
      )}

      <div style={{
        padding: "12px 18px 16px", borderTop: `1px solid ${BORDER}`,
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={`Message ${agent.name}…`}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 10,
            border: `1.5px solid ${BORDER}`, fontSize: 13, outline: "none",
            boxSizing: "border-box", background: "#FFFFFF", color: TEXT,
            fontFamily: "inherit", resize: "vertical", minHeight: 60, maxHeight: 200,
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          style={{
            background: ZP_GRAD, color: "#FFFFFF", border: "none",
            padding: "11px 18px", borderRadius: 10,
            fontSize: 13, fontWeight: 800, cursor: (!input.trim() || sending) ? "not-allowed" : "pointer",
            opacity: (!input.trim() || sending) ? 0.55 : 1,
            boxShadow: "0 2px 6px rgba(45,190,96,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          {sending ? "Sending…" : "Send →"}
        </button>
      </div>
    </Card>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1.5px solid ${BORDER}`,
          fontSize: 13,
          outline: "none",
          margin: "4px 0 0",
          boxSizing: "border-box",
          background: "#f8fafc",
          color: TEXT,
        }}
      />
    </div>
  );
}
