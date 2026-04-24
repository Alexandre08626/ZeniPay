// PR 17 — Merchant API keys + usage section.

"use client";

import React, { useEffect, useState } from "react";
import { Trash2, X, Copy, Check } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function ApiKeysSection({ merchantId }: { merchantId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; name: string; prefix: string; raw: string } | null>(null);

  const load = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/merchant/api-keys?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json());
      setKeys((r.keys ?? []) as ApiKey[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [merchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const revoke = async (k: ApiKey) => {
    if (!window.confirm(`Revoke API key "${k.name}"? Any integration using it will stop working.`)) return;
    await fetch(`/api/v1/merchant/api-keys/${k.id}?merchant_id=${encodeURIComponent(merchantId)}`, { method: "DELETE" });
    await load();
  };

  return (
    <BankingCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
            API Keys
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: zp.text.muted }}>
            Programmatic access to ZeniPay. Keep them secret — rotate immediately if exposed.
          </p>
        </div>
        <GradientButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Create API key</GradientButton>
      </div>

      {loading && keys.length === 0 ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "10px 0" }}>Loading…</p>
      ) : keys.length === 0 ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "10px 0" }}>No API keys yet. Create one to start integrating.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Prefix", "Permissions", "Last used", "Status", ""].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "8px 0", fontSize: 10, fontWeight: zp.weight.semibold,
                  color: zp.text.muted, letterSpacing: "0.06em", textTransform: "uppercase",
                  borderBottom: `1px solid ${zp.surface.border}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                <td style={td}>{k.name}</td>
                <td style={{ ...td, fontFamily: zp.font.mono }}>{k.key_prefix}••••</td>
                <td style={td}>{(k.permissions ?? []).join(", ") || "—"}</td>
                <td style={{ ...td, color: zp.text.muted, fontSize: 12 }}>
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                </td>
                <td style={td}>
                  <span style={{
                    fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 10px", borderRadius: 999,
                    background: k.is_active ? zp.semantic.successBg : zp.surface.bg3,
                    color: k.is_active ? zp.semantic.success : zp.text.muted,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{k.is_active ? "Active" : "Revoked"}</span>
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  {k.is_active && (
                    <button onClick={() => revoke(k)} aria-label="Revoke" style={{
                      background: "transparent", color: zp.semantic.danger,
                      border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8,
                      padding: "6px 8px", cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}><Trash2 size={12} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <CreateKeyModal
          merchantId={merchantId}
          onClose={() => setShowCreate(false)}
          onCreated={async (k) => {
            setShowCreate(false);
            setRevealed(k);
            await load();
          }}
        />
      )}
      {revealed && <RevealKeyModal keyData={revealed} onClose={() => setRevealed(null)} />}
    </BankingCard>
  );
}

function CreateKeyModal({
  merchantId, onClose, onCreated,
}: {
  merchantId: string;
  onClose: () => void;
  onCreated: (k: { id: string; name: string; prefix: string; raw: string }) => void;
}) {
  const [name, setName] = useState("");
  const [env, setEnv] = useState<"live" | "test">("test");
  const [perms, setPerms] = useState<Record<"read" | "write" | "admin", boolean>>({ read: true, write: false, admin: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const selected = (["read", "write", "admin"] as const).filter((p) => perms[p]);
    if (!name.trim()) { setErr("Give the key a name."); return; }
    if (selected.length === 0) { setErr("Pick at least one permission."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/v1/merchant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, name: name.trim(), environment: env, permissions: selected }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) { setErr(data?.error ?? "Create failed."); return; }
      onCreated(data.key);
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title="Create API key" onClose={onClose}>
      <Label>Name</Label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production API" style={input} />

      <Label style={{ marginTop: 12 }}>Environment</Label>
      <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: 8 }}>
        {(["test", "live"] as const).map((e) => (
          <button key={e} onClick={() => setEnv(e)} style={{
            padding: "6px 16px", borderRadius: 6, border: "none",
            background: env === e ? zp.surface.bg1 : "transparent",
            color: env === e ? zp.text.primary : zp.text.muted,
            fontSize: 12, fontWeight: env === e ? zp.weight.semibold : zp.weight.medium,
            cursor: "pointer", textTransform: "uppercase" as const, letterSpacing: "0.06em",
          }}>{e}</button>
        ))}
      </div>

      <Label style={{ marginTop: 12 }}>Permissions</Label>
      {(["read", "write", "admin"] as const).map((p) => (
        <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: zp.text.primary }}>
          <input type="checkbox" checked={perms[p]} onChange={(e) => setPerms((prev) => ({ ...prev, [p]: e.target.checked }))} />
          <span style={{ fontWeight: zp.weight.semibold, textTransform: "capitalize" as const }}>{p}</span>
          <span style={{ fontSize: 11, color: zp.text.muted }}>
            {p === "read" ? "List + fetch resources." : p === "write" ? "Create + update resources." : "Admin actions."}
          </span>
        </label>
      ))}

      {err && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 8,
          background: zp.semantic.dangerBg, color: zp.semantic.danger,
          fontSize: 12, fontWeight: zp.weight.semibold,
        }}>{err}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <GradientButton variant="ghost" size="md" onClick={onClose} disabled={saving}>Cancel</GradientButton>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create key"}
        </GradientButton>
      </div>
    </ModalShell>
  );
}

function RevealKeyModal({
  keyData, onClose,
}: {
  keyData: { id: string; name: string; prefix: string; raw: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(keyData.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <ModalShell title="Save your API key" onClose={onClose}>
      <div style={{
        marginTop: 4, padding: "12px 14px", borderRadius: 10,
        background: zp.semantic.warningBg, color: "#92400E",
        fontSize: 12, fontWeight: zp.weight.semibold, border: `1px solid ${zp.semantic.warning}44`,
      }}>
        Save this key now — it will never be shown again.
      </div>
      <pre style={{
        marginTop: 14, padding: 14, borderRadius: 10,
        background: "#0f172a", color: "#e5e7eb",
        fontFamily: zp.font.mono, fontSize: 12, lineHeight: 1.5,
        overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>{keyData.raw}</pre>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button onClick={copy} style={{
          background: "#fff", color: zp.text.primary, border: `1px solid ${zp.surface.border}`,
          padding: "9px 16px", borderRadius: 10,
          fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy key"}</button>
        <GradientButton variant="primary" size="md" onClick={onClose}>I’ve saved it, close</GradientButton>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)",
        zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "#fff",
          borderRadius: 14, padding: 24, boxShadow: zp.elevation.lg,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: 8, width: 30, height: 30,
            cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5, ...style,
    }}>{children}</label>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${zp.surface.border}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", background: zp.surface.bg2, color: zp.text.primary,
};

const td: React.CSSProperties = { padding: "10px 0", fontSize: 13, color: zp.text.primary };

export function ApiUsageSection({ merchantId }: { merchantId: string }) {
  interface Usage {
    total_requests: number;
    success_rate: number;
    avg_response_ms: number;
    top_endpoints: Array<{ endpoint: string; count: number }>;
    per_day: number[];
    recent: Array<{ endpoint: string; method: string; status_code: number; response_ms: number; created_at: string }>;
  }
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!merchantId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/merchant/api-usage?merchant_id=${encodeURIComponent(merchantId)}&days=30`).then((r) => r.json());
        setUsage(r as Usage);
      } finally { setLoading(false); }
    })();
  }, [merchantId]);

  return (
    <BankingCard style={{ marginTop: 14 }}>
      <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
        API Usage
      </h2>
      <p style={{ margin: "3px 0 14px", fontSize: 12, color: zp.text.muted }}>
        Last 30 days of requests made with your API keys.
      </p>

      {loading && !usage ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "10px 0" }}>Loading…</p>
      ) : !usage || usage.total_requests === 0 ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "10px 0" }}>
          No API usage yet. Once you start making requests, stats land here within seconds.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <Stat label="Total requests" value={usage.total_requests.toLocaleString()} accent={zp.brand.cyan} />
            <Stat label="Success rate" value={`${usage.success_rate}%`} accent={zp.semantic.success} />
            <Stat label="Avg response" value={`${usage.avg_response_ms}ms`} accent={zp.brand.violet} />
            <Stat label="Endpoints hit" value={String(usage.top_endpoints.length)} accent={zp.text.muted} />
          </div>

          <MiniSparkline data={usage.per_day} />

          <h4 style={{ margin: "18px 0 8px", fontSize: 12, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Top endpoints
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {usage.top_endpoints.map((t) => (
                <tr key={t.endpoint} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                  <td style={{ padding: "8px 0", fontFamily: zp.font.mono, color: zp.text.primary }}>{t.endpoint}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", color: zp.text.muted, fontFamily: zp.font.mono }}>{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ margin: "18px 0 8px", fontSize: 12, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Recent requests
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Time", "Method", "Endpoint", "Status", "ms"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 0", fontWeight: zp.weight.semibold,
                    color: zp.text.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: `1px solid ${zp.surface.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage.recent.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                  <td style={{ padding: "8px 0", color: zp.text.muted }}>{new Date(r.created_at).toLocaleTimeString()}</td>
                  <td style={{ padding: "8px 0", fontFamily: zp.font.mono }}>{r.method}</td>
                  <td style={{ padding: "8px 0", fontFamily: zp.font.mono }}>{r.endpoint}</td>
                  <td style={{ padding: "8px 0", color: r.status_code < 400 ? zp.semantic.success : zp.semantic.danger, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>{r.status_code}</td>
                  <td style={{ padding: "8px 0", color: zp.text.muted, fontFamily: zp.font.mono }}>{r.response_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </BankingCard>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${zp.surface.border}`, borderRadius: 12,
      padding: "12px 14px", borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 4, fontFamily: zp.font.mono }}>{value}</div>
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 48, padding: "4px 0" }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`,
          background: zp.gradient.main, borderRadius: 2, minHeight: 2,
        }} />
      ))}
    </div>
  );
}
