// /personal/savings — savings goals.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  icon: string;
  color: string;
  status: "active" | "completed" | "archived";
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/personal/savings?merchant_id=${encodeURIComponent(m)}`).then((x) => x.json());
      setGoals((r.goals ?? []).filter((g: Goal) => g.status !== "archived"));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const addFunds = async (id: string) => {
    const raw = window.prompt("Add how much?", "50");
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await fetch("/api/v1/personal/savings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: mid(), id, action: "add_funds", amount }),
    });
    await load();
  };

  return (
    <DashboardShell mode="personal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Savings goals</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Track progress toward what matters.</p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
          New goal
        </GradientButton>
      </div>

      {loading && goals.length === 0 ? (
        <BankingCard><div style={{ color: zp.text.muted, fontSize: 13 }}>Loading…</div></BankingCard>
      ) : goals.length === 0 ? (
        <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <Target size={36} color={zp.brand.pink} />
          <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>No goals yet</h3>
          <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>Set a target. Track your progress. Hit it.</p>
          <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
            Create your first goal
          </GradientButton>
        </BankingCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {goals.map((g) => <GoalCard key={g.id} goal={g} onAddFunds={() => addFunds(g.id)} />)}
        </div>
      )}

      {open && <NewGoalModal onClose={() => setOpen(false)} onCreated={async () => { setOpen(false); await load(); }} />}
    </DashboardShell>
  );
}

function GoalCard({ goal, onAddFunds }: { goal: Goal; onAddFunds: () => void }) {
  const pct = Math.min(100, (Number(goal.current_amount) / Math.max(1, Number(goal.target_amount))) * 100);
  return (
    <BankingCard accent="pink">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 28 }}>{goal.icon || "🎯"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{goal.name}</div>
          <div style={{ fontSize: 11, color: zp.text.muted }}>
            {zp.fmtCurrency(Number(goal.current_amount), goal.currency)} of {zp.fmtCurrency(Number(goal.target_amount), goal.currency)}
          </div>
        </div>
      </div>
      <div style={{ height: 8, background: zp.surface.bg3, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: 8, background: goal.color || zp.brand.pink, transition: zp.motion.base }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <div style={{ fontSize: 11, color: zp.text.muted }}>
          {goal.status === "completed" ? "✓ Completed" : `${pct.toFixed(0)}%`}
          {goal.target_date ? ` · target ${new Date(goal.target_date).toLocaleDateString("en-CA")}` : ""}
        </div>
        <GradientButton size="sm" variant="secondary" onClick={onAddFunds}>Add funds</GradientButton>
      </div>
    </BankingCard>
  );
}

function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2 || !Number(target)) { setErr("Name + target required"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/personal/savings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid(), name, target_amount: Number(target), target_date: date || null, icon }),
      });
      if (!r.ok) { setErr((await r.json().catch(() => ({})))?.error?.message ?? "Failed"); return; }
      await onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 460, padding: 22 }}>
        <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>New savings goal</h2>
        <div style={{ marginTop: 18 }}>
          <Label>Name</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vacances 2026" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginTop: 14 }}>
          <div>
            <Label>Target amount (CAD)</Label>
            <input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2500" style={inputStyle} />
          </div>
          <div>
            <Label>Icon</Label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} style={{ ...inputStyle, textAlign: "center" as const, fontSize: 18 }} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Label>Target date (optional)</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
        {err && <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={busy} style={{ flex: 1, background: zp.gradient.personal }}>{busy ? "Creating…" : "Create"}</GradientButton>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{children}</label>;
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none",
};
