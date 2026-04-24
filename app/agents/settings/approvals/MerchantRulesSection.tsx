// PR 12 merchant-scope approval rules section. Lives inside
// /agents/settings/approvals above the legacy agent-TOTP policies so
// both kinds of controls are configurable from one place.

"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../_lib/session";
import { Card } from "@/components/agents/Shell";
import { BORDER, TEXT, MUTED, LIGHT, ZP_GRAD, ZP_PURPLE } from "@/components/agents/theme";

export interface MerchantApprovalRule {
  id: string;
  merchant_id: string;
  rule_type: "agent_distribution" | "agent_spend" | "merchant_transfer";
  threshold_units: number;
  currency: string;
  approver_email: string;
  approver_name: string | null;
  is_active: boolean;
  created_at: string;
}

const RULE_TYPES: Array<{ v: MerchantApprovalRule["rule_type"]; label: string; hint: string }> = [
  { v: "agent_distribution", label: "Agent distribution", hint: "Treasury → agent transfers above the threshold." },
  { v: "agent_spend",        label: "Agent spend",         hint: "Agent card auths above the threshold." },
  { v: "merchant_transfer",  label: "Merchant transfer",   hint: "Outbound transfers from the merchant account." },
];

export function MerchantRulesSection() {
  const [rules, setRules] = useState<MerchantApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ rules: MerchantApprovalRule[] }>("/api/v1/agents/settings/approval-rules");
      setRules(r.rules ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>Approval rules</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Require sign-off before a distribution, spend, or outbound transfer above a threshold clears.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: ZP_GRAD, color: "#fff", border: "none",
            padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}
        >
          + Add rule
        </button>
      </div>

      {loading && rules.length === 0 ? (
        <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading…</p></Card>
      ) : rules.length === 0 ? (
        <Card>
          <div style={{ padding: "20px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
              No approval rules yet. Distributions execute immediately with no hold.
            </p>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Type", "Threshold", "Approver", "Active", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800,
                    color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: `1px solid ${BORDER}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => <RuleRow key={r.id} rule={r} onChange={load} />)}
            </tbody>
          </table>
        </Card>
      )}

      {adding && (
        <AddRuleModal
          onClose={() => setAdding(false)}
          onCreated={async () => { setAdding(false); await load(); }}
        />
      )}
    </section>
  );
}

function RuleRow({ rule, onChange }: { rule: MerchantApprovalRule; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/agents/settings/approval-rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      await onChange();
    } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm("Delete this rule? Future distributions above the threshold will execute without approval.")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/agents/settings/approval-rules/${rule.id}`, { method: "DELETE" });
      await onChange();
    } finally { setBusy(false); }
  };
  const typeLabel = RULE_TYPES.find((t) => t.v === rule.rule_type)?.label ?? rule.rule_type;
  return (
    <tr style={{ borderTop: `1px solid ${BORDER}` }}>
      <td style={{ padding: "12px 16px" }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
          background: "rgba(123,79,191,0.1)", color: ZP_PURPLE,
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>{typeLabel}</span>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "ui-monospace" }}>
        ≥ {fmtMoney(rule.threshold_units, rule.currency)}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT }}>
        {rule.approver_name ?? "—"}{rule.approver_name ? " · " : ""}
        <span style={{ color: MUTED, fontFamily: "ui-monospace" }}>{rule.approver_email}</span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <button
          onClick={toggle}
          disabled={busy}
          style={{
            width: 42, height: 24, borderRadius: 999, border: "none",
            background: rule.is_active ? "#16A34A" : "#cbd5e1",
            cursor: busy ? "wait" : "pointer",
            position: "relative", transition: "background 0.15s",
          }}
          aria-label={rule.is_active ? "Deactivate" : "Activate"}
        >
          <span style={{
            position: "absolute", top: 3, left: rule.is_active ? 21 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.15s",
          }} />
        </button>
      </td>
      <td style={{ padding: "12px 16px", textAlign: "right" }}>
        <button
          onClick={del}
          disabled={busy}
          style={{
            background: "transparent", color: "#DC2626",
            border: "1.5px solid rgba(220,38,38,0.35)",
            padding: "5px 10px", borderRadius: 8,
            fontSize: 11, fontWeight: 800, cursor: busy ? "wait" : "pointer",
          }}
        >Delete</button>
      </td>
    </tr>
  );
}

function AddRuleModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [ruleType, setRuleType] = useState<MerchantApprovalRule["rule_type"]>("agent_distribution");
  const [threshold, setThreshold] = useState("0");
  const [currency, setCurrency] = useState("CAD");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const thr = Number(threshold);
    if (!Number.isFinite(thr) || thr < 0) { setErr("Threshold must be ≥ 0."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Invalid approver email."); return; }
    setSaving(true);
    try {
      await apiFetch("/api/v1/agents/settings/approval-rules", {
        method: "POST",
        body: JSON.stringify({
          rule_type: ruleType,
          threshold_units: thr,
          currency,
          approver_email: email.trim(),
          approver_name: name.trim() || null,
          is_active: true,
        }),
      });
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,15,30,0.55)",
        backdropFilter: "blur(4px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "#fff",
          borderRadius: 14, padding: 24, boxShadow: "0 20px 50px rgba(10,15,30,0.25)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>Add approval rule</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 14px" }}>
          Distributions / spends at or above the threshold will wait for the approver to click Approve.
        </p>

        <FieldLabel>Rule type</FieldLabel>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {RULE_TYPES.map((t) => {
            const active = ruleType === t.v;
            return (
              <button
                key={t.v}
                onClick={() => setRuleType(t.v)}
                style={{
                  textAlign: "left", padding: "10px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${active ? ZP_PURPLE : BORDER}`,
                  background: active ? "rgba(123,79,191,0.06)" : "#f8fafc",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{t.label}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t.hint}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Threshold amount</FieldLabel>
            <input
              type="number" step="0.01" min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <FieldLabel>Currency</FieldLabel>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={fieldStyle}
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <FieldLabel>Approver email</FieldLabel>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@zeniva.ca"
            style={fieldStyle}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <FieldLabel>Approver name (optional)</FieldLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alexandre Blais"
            style={fieldStyle}
          />
        </div>

        {err && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 8,
            background: "rgba(220,38,38,0.08)", color: "#DC2626",
            fontSize: 12, fontWeight: 700,
          }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: "transparent", color: MUTED, border: "none",
              padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              background: saving ? "#94a3b8" : ZP_GRAD, color: "#fff",
              border: "none", padding: "9px 22px", borderRadius: 10,
              fontSize: 12, fontWeight: 800, cursor: saving ? "wait" : "pointer",
            }}
          >{saving ? "Saving…" : "Save rule"}</button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontSize: 10, fontWeight: 800, color: MUTED,
      letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5,
    }}>{children}</label>
  );
}

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BORDER}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", background: "#f8fafc", color: TEXT,
  fontFamily: "inherit",
};

// Silence unused-vars for LIGHT (re-exported from theme elsewhere).
void LIGHT;
