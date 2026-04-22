// /agents/settings/approvals — org approval-policy configurator.

"use client";

import React, { useEffect, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN,
  fmtUSD,
} from "@/components/agents/theme";

interface Policy {
  id: string; name: string; priority: number; active: boolean;
  trigger_type: "amount_threshold" | "merchant_category" | "new_merchant" | "off_hours" | "anomaly_score";
  trigger_config: Record<string, unknown>;
  approver_type: "specific_user" | "any_admin" | "owner_only" | "multi_sig";
  approver_config: Record<string, unknown>;
  timeout_seconds: number;
  default_action: "approve" | "deny";
}

export default function ApprovalPoliciesSettings() {
  const [list, setList] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ policies: Policy[] }>("/api/v1/agents/approval-policies");
      setList(r.policies);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return (
    <Shell title="Approval policies">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
          Rules that require human sign-off before a card authorization completes.
        </p>
        <button onClick={() => setAdding(true)}
          style={{ background: ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + New policy
        </button>
      </div>

      {loading && list.length === 0 ? (
        <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading…</p></Card>
      ) : list.length === 0 ? (
        <Card>
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>No approval policies yet</p>
            <p style={{ color: MUTED, margin: "0 0 12px", fontSize: 13 }}>
              Without a policy, every card authorization passes if the wallet has funds. Add one to require approval above a threshold.
            </p>
            <button onClick={() => setAdding(true)}
              style={{ background: ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              + Create first policy
            </button>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Priority", "Name", "Trigger", "Approver", "TTL", "Active", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => <PolicyRow key={p.id} p={p} onChange={load} />)}
            </tbody>
          </table>
        </Card>
      )}

      {adding && <NewPolicyModal onClose={() => setAdding(false)} onDone={async () => { setAdding(false); await load(); }} />}
    </Shell>
  );
}

function PolicyRow({ p, onChange }: { p: Policy; onChange: () => Promise<void> }) {
  const triggerLabel = p.trigger_type === "amount_threshold"
    ? `≥ ${fmtUSD(Number(p.trigger_config.threshold_cents ?? 0))}`
    : p.trigger_type === "merchant_category"
    ? `MCC ∈ [${(p.trigger_config.mccs as string[] ?? []).join(", ")}]`
    : p.trigger_type === "off_hours"
    ? `${p.trigger_config.start ?? "22:00"}–${p.trigger_config.end ?? "06:00"} ${p.trigger_config.timezone ?? "UTC"}`
    : p.trigger_type === "anomaly_score"
    ? `z ≥ ${p.trigger_config.threshold ?? "?"}`
    : "new merchant";

  const approver = p.approver_type === "multi_sig"
    ? `${(p.approver_config.min_approvals ?? 2)}-of-N`
    : p.approver_type.replace("_", " ");

  const remove = async () => {
    if (!confirm(`Deactivate "${p.name}"?`)) return;
    await apiFetch(`/api/v1/agents/approval-policies/${p.id}`, { method: "DELETE" });
    await onChange();
  };

  return (
    <tr style={{ borderBottom: `1px solid ${ROW_SEP}`, opacity: p.active ? 1 : 0.45 }}>
      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT }}>{p.priority}</td>
      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT }}>{p.name}</td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{triggerLabel}</td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{approver}</td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>
        {p.timeout_seconds >= 3600 ? `${(p.timeout_seconds / 3600)}h` : `${p.timeout_seconds / 60}m`}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999, background: p.active ? "rgba(45,190,96,0.12)" : "#f1f5f9", color: p.active ? "#16A34A" : "#64748b", textTransform: "uppercase" }}>
          {p.active ? "active" : "inactive"}
        </span>
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>
        {p.active && (
          <button onClick={remove} style={{ background: "transparent", border: `1px solid rgba(220,38,38,0.3)`, color: "#DC2626", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Deactivate
          </button>
        )}
      </td>
    </tr>
  );
}

function NewPolicyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("Purchases over threshold");
  const [triggerType, setTriggerType] = useState<Policy["trigger_type"]>("amount_threshold");
  const [thresholdDollars, setThresholdDollars] = useState("1000");
  const [approverType, setApproverType] = useState<Policy["approver_type"]>("owner_only");
  const [minApprovals, setMinApprovals] = useState("2");
  const [ttl, setTtl] = useState("900");
  const [priority, setPriority] = useState("100");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const trigger_config =
        triggerType === "amount_threshold"
          ? { threshold_cents: Math.round(Number(thresholdDollars) * 100) }
          : triggerType === "off_hours"
          ? { timezone: "UTC", start: "22:00", end: "06:00" }
          : triggerType === "anomaly_score"
          ? { threshold: 4 }
          : {};
      const approver_config = approverType === "multi_sig"
        ? { min_approvals: Math.max(2, Number(minApprovals) || 2) }
        : {};
      await apiFetch("/api/v1/agents/approval-policies", {
        method: "POST",
        body: JSON.stringify({
          name, trigger_type: triggerType, trigger_config,
          approver_type: approverType, approver_config,
          timeout_seconds: Math.max(60, Number(ttl) || 900),
          priority: Number(priority) || 100,
          active: true,
        }),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally { setLoading(false); }
  };

  return (
    <Modal title="New approval policy" onClose={onClose}>
      <form onSubmit={submit}>
        <Label>NAME</Label>
        <Input value={name} onChange={setName} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>TRIGGER TYPE</Label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value as Policy["trigger_type"])} style={inputStyle()}>
              <option value="amount_threshold">Amount threshold</option>
              <option value="merchant_category">Merchant category (MCC)</option>
              <option value="new_merchant">New merchant</option>
              <option value="off_hours">Off-hours</option>
              <option value="anomaly_score">Anomaly score</option>
            </select>
          </div>
          {triggerType === "amount_threshold" && (
            <div>
              <Label>THRESHOLD (USD)</Label>
              <Input value={thresholdDollars} onChange={setThresholdDollars} />
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
          <div>
            <Label>APPROVER TYPE</Label>
            <select value={approverType} onChange={(e) => setApproverType(e.target.value as Policy["approver_type"])} style={inputStyle()}>
              <option value="owner_only">Owner only</option>
              <option value="any_admin">Any admin</option>
              <option value="multi_sig">Multi-sig (dual control)</option>
            </select>
          </div>
          {approverType === "multi_sig" && (
            <div>
              <Label>MIN APPROVERS</Label>
              <Input value={minApprovals} onChange={setMinApprovals} />
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
          <div>
            <Label>TTL (seconds)</Label>
            <select value={ttl} onChange={(e) => setTtl(e.target.value)} style={inputStyle()}>
              <option value="300">5 min</option>
              <option value="900">15 min</option>
              <option value="3600">1 hour</option>
              <option value="14400">4 hours</option>
              <option value="86400">24 hours</option>
            </select>
          </div>
          <div>
            <Label>PRIORITY</Label>
            <Input value={priority} onChange={setPriority} />
          </div>
        </div>

        {err && <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: MUTED, border: `1px solid ${BORDER}`, padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ flex: 1.4, background: loading ? "#94a3b8" : ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Creating…" : "Create policy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
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
function Input({ value, onChange, required, placeholder }: { value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
      style={inputStyle()} />
  );
}
function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none", margin: "6px 0 4px", boxSizing: "border-box", background: "#f8fafc", color: TEXT };
}
