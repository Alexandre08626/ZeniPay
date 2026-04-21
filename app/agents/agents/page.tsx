// /agents/agents — list agents + create wizard. Clicking a row → detail page.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import { BORDER, ROW_SEP, TEXT, MUTED, LIGHT, ZP_GRAD, ZP_GREEN, fmtUSD, fmtDate } from "@/components/agents/theme";

interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  status: string;
  created_at: string;
  wallet: { id: string; balance_cents: number; currency: string } | null;
}

export default function AgentsListPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{ privateKey: string; publicKey: string; name: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents");
      setAgents(d.agents);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <Shell title="Agents">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>
          {agents.length} {agents.length === 1 ? "agent" : "agents"}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: ZP_GRAD,
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
          }}
        >
          + New agent
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ color: MUTED, padding: 20, fontSize: 13 }}>Loading…</p>
        ) : agents.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>🤖</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>No agents yet</p>
            <p style={{ color: MUTED, margin: "0 0 14px", fontSize: 13 }}>
              Create your first agent to get a wallet, keypair, and a default policy.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: ZP_GRAD,
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Create agent
            </button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name", "Type", "Balance", "Status", "Created", ""].map((h) => (
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
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{a.agent_type}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT }}>
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
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link
                      href={`/agents/agents/${a.id}`}
                      style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreated={(secret) => {
            setShowCreate(false);
            setCreatedSecret(secret);
            void refresh();
          }}
        />
      )}

      {createdSecret && (
        <KeyRevealModal
          name={createdSecret.name}
          publicKey={createdSecret.publicKey}
          privateKey={createdSecret.privateKey}
          onClose={() => setCreatedSecret(null)}
        />
      )}
    </Shell>
  );
}

function CreateAgentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (secret: { privateKey: string; publicKey: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialBalance, setInitialBalance] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await apiFetch<{
        agent: { id: string; name: string };
        keypair: { public_key: string; private_key: string };
      }>("/api/v1/agents/agents", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          initial_balance_cents: Math.round(Number(initialBalance) * 100),
        }),
      });
      onCreated({
        name: r.agent.name,
        publicKey: r.keypair.public_key,
        privateKey: r.keypair.private_key,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="New agent">
      <form onSubmit={submit}>
        <Label>NAME</Label>
        <Input value={name} onChange={(v) => setName(v)} required placeholder="checkout-agent-prod" />
        <Label>DESCRIPTION (optional)</Label>
        <Input value={description} onChange={(v) => setDescription(v)} placeholder="Buys SaaS subscriptions under $50" />
        <Label>INITIAL BALANCE (USD)</Label>
        <Input value={initialBalance} onChange={(v) => setInitialBalance(v)} placeholder="1000" />

        {err && <ErrorBox message={err} />}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
          <button type="submit" disabled={loading || !name} style={btnPrimary(loading)}>
            {loading ? "Creating…" : "Create agent"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function KeyRevealModal({
  name,
  publicKey,
  privateKey,
  onClose,
}: {
  name: string;
  publicKey: string;
  privateKey: string;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} title={`Agent "${name}" created`}>
      <div
        style={{
          padding: "10px 14px",
          background: "rgba(245,166,35,0.08)",
          border: "1px solid rgba(245,166,35,0.3)",
          color: "#92400E",
          borderRadius: 10,
          marginBottom: 14,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        ⚠ Private key is shown ONCE. Copy it now — we do not store it.
      </div>
      <Label>PUBLIC KEY</Label>
      <CodeBlock value={publicKey} />
      <Label>PRIVATE KEY (seed)</Label>
      <CodeBlock value={privateKey} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button onClick={onClose} style={btnPrimary(false)}>I&apos;ve saved the key</button>
      </div>
    </Modal>
  );
}

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
          maxWidth: 520,
          maxHeight: "90vh",
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
        fontWeight: 700,
        color: MUTED,
        letterSpacing: "0.08em",
        marginTop: 12,
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
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
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

function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        position: "relative",
        margin: "6px 0 4px",
        padding: "12px 14px",
        background: "#0f172a",
        color: "#e5e7eb",
        borderRadius: 10,
        fontSize: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        wordBreak: "break-all",
      }}
    >
      {value}
      <button
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: copied ? ZP_GREEN : "rgba(255,255,255,0.1)",
          color: "#fff",
          border: "none",
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {copied ? "✓" : "copy"}
      </button>
    </div>
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
