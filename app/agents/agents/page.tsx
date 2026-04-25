// /agents/agents — list agents + create wizard. Clicking a row → detail page.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/agents/Shell";
import Image from "next/image";
import { AgentCard, DEMO_ROSTER, AVAILABLE_TEMPLATES, DEFAULT_ROSTER_SLUGS, type AgentCardData, type AgentTemplate } from "@/components/agents/AgentCard";
import { apiFetch } from "../_lib/session";
import { BORDER, TEXT, MUTED, LIGHT, ZP_GRAD, ZP_GREEN } from "@/components/agents/theme";
import zp from "@/lib/design-system/zenipay-brand";

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

  const realCards: AgentCardData[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.agent_type || "AI agent",
    balance: (a.wallet?.balance_cents ?? 0) / 100,
    currency: a.wallet?.currency || "CAD",
    status: (a.status as AgentCardData["status"]) || "active",
    last4: syntheticLast4(a.id),
    primaryLabel: "Open agent",
  }));

  const showDemo = !loading && agents.length === 0;

  return (
    <Shell title="Agents">
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 18, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: zp.brand.violet,
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4,
          }}>
            {showDemo ? "Example fleet · Preview" : "Your fleet · ZeniCore live"}
          </div>
          <h2 style={{
            margin: 0, fontFamily: zp.font.display, fontSize: 22,
            fontWeight: 700, letterSpacing: "-0.02em", color: TEXT,
          }}>
            {showDemo
              ? "This is what your fleet could look like."
              : `${agents.length} ${agents.length === 1 ? "agent" : "agents"} ready to spend.`}
          </h2>
          {showDemo && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED, maxWidth: 560 }}>
              These four agents are just a preview. Create your own — each
              gets its own wallet, card, and audit trail.
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: ZP_GRAD,
            color: "#fff",
            border: "none",
            padding: "11px 20px",
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

      {loading ? (
        <p style={{ color: MUTED, padding: 20, fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
        }}>
          {(showDemo ? DEMO_ROSTER : realCards).map((c) => (
            <AgentCard key={c.id ?? c.name} data={c} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAgentModal
          existingAgentNames={agents.map((a) => a.name)}
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

// Hash an agent id into a stable 4-digit "account tail" so the big card
// has a banking flourish even before a real card is issued.
function syntheticLast4(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 10_000).toString().padStart(4, "0");
}

function CreateAgentModal({
  onClose,
  onCreated,
  existingAgentNames,
}: {
  onClose: () => void;
  onCreated: (secret: { privateKey: string; publicKey: string; name: string }) => void;
  existingAgentNames: string[];
}) {
  const [template, setTemplate] = useState<AgentTemplate | null>(null);
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialBalance, setInitialBalance] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Filter the template hub:
  //   * hide Eva / Ben — they are the default roster.
  //   * hide templates already created in the merchant's org.
  const alreadyCreated = new Set(existingAgentNames.map((n) => n.trim().toLowerCase()));
  const pickable = AVAILABLE_TEMPLATES.filter((t) =>
    !DEFAULT_ROSTER_SLUGS.has(t.slug) && !alreadyCreated.has(t.name.toLowerCase()),
  );

  const pickTemplate = (t: AgentTemplate) => {
    setTemplate(t);
    setCustom(false);
    setName(t.name);
    setDescription(t.description);
    setInitialBalance(String(t.defaultLimit));
  };

  const pickCustom = () => {
    setTemplate(null);
    setCustom(true);
    setName("");
    setDescription("");
    setInitialBalance("1000");
  };

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
          agent_type: template?.role ?? "custom",
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

  const atFleetCap = existingAgentNames.length >= 12;
  const pickedSomething = template !== null || custom;

  return (
    <Modal onClose={onClose} title="New agent" wide>
      {!pickedSomething ? (
        <>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: MUTED }}>
            Pick a pre-built template or create a custom agent. Fleet cap
            is 10 agents total. Eva and Ben come pre-installed
            and don&rsquo;t count toward the picker.
          </p>

          {atFleetCap ? (
            <div style={{ padding: 14, background: "rgba(245,166,35,0.10)", border: "1px solid rgba(245,166,35,0.35)", borderRadius: 10, color: "#92400E", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
              You&rsquo;ve hit the 12-agent fleet cap. Archive one to add another.
            </div>
          ) : null}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}>
            {pickable.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => pickTemplate(t)}
                disabled={atFleetCap}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "14px 12px", borderRadius: 14,
                  background: "#fff", cursor: atFleetCap ? "not-allowed" : "pointer",
                  border: `1.5px solid ${t.accent}26`,
                  transition: "all 180ms ease-out",
                  opacity: atFleetCap ? 0.5 : 1,
                  textAlign: "center" as const,
                }}
                onMouseEnter={(e) => {
                  if (atFleetCap) return;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = t.accent;
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 28px ${t.accent}33`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${t.accent}26`;
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 68, height: 68, borderRadius: "50%",
                  overflow: "hidden",
                  background: `linear-gradient(135deg, ${t.accent}14, ${t.accent}08)`,
                  boxShadow: `0 0 0 2px ${t.accent}33`,
                }}>
                  <Image src={`/agents/${t.slug}.png`} alt={`${t.name} avatar`} width={68} height={68} style={{ width: 68, height: 68, objectFit: "cover", objectPosition: "top" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, letterSpacing: "-0.01em" }}>{t.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.accent, letterSpacing: "0.04em", marginTop: 2 }}>
                    {t.role}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.35, minHeight: 26 }}>
                  {t.description}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={pickCustom}
              disabled={atFleetCap}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "14px 12px", borderRadius: 14,
                background: "#fff", cursor: atFleetCap ? "not-allowed" : "pointer",
                border: `1.5px dashed ${BORDER}`,
                color: TEXT, opacity: atFleetCap ? 0.5 : 1,
                minHeight: 200, textAlign: "center" as const,
              }}
            >
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: "#F1F5F9", display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 28, color: MUTED,
              }}>＋</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Custom agent</div>
              <div style={{ fontSize: 10, color: MUTED }}>Name + description + balance.</div>
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            {template ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  overflow: "hidden", background: "#F1F5F9",
                  boxShadow: `0 0 0 2px ${template.accent}40`,
                }}>
                  <Image src={`/agents/${template.slug}.png`} alt="" width={48} height={48} style={{ width: 48, height: 48, objectFit: "cover", objectPosition: "top" }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{template.name}</div>
                  <div style={{ fontSize: 11, color: template.accent, fontWeight: 800, letterSpacing: "0.04em" }}>
                    {template.role}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Custom agent</div>
            )}
            <button
              type="button"
              onClick={() => { setTemplate(null); setCustom(false); }}
              style={{ background: "transparent", border: "none", fontSize: 12, color: MUTED, cursor: "pointer", fontWeight: 700 }}
            >
              ← change
            </button>
          </div>

          <Label>NAME</Label>
          <Input value={name} onChange={(v) => setName(v)} required placeholder="checkout-agent-prod" />
          <Label>DESCRIPTION (optional)</Label>
          <Input value={description} onChange={(v) => setDescription(v)} placeholder="Buys SaaS subscriptions under $50" />
          <Label>INITIAL BALANCE (CAD)</Label>
          <Input value={initialBalance} onChange={(v) => setInitialBalance(v)} placeholder="1000" />

          {err && <ErrorBox message={err} />}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" onClick={onClose} style={btnSecondary()}>Cancel</button>
            <button type="submit" disabled={loading || !name} style={btnPrimary(loading)}>
              {loading ? "Creating…" : "Create agent"}
            </button>
          </div>
        </form>
      )}
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

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
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
          maxWidth: wide ? 780 : 520,
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
