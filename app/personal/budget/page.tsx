// /personal/budget — monthly budget categories.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, PieChart } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Category {
  id: string;
  name: string;
  monthly_limit: number;
  spent_this_month: number;
  currency: string;
  icon: string | null;
  color: string | null;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function BudgetPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/personal/budget?merchant_id=${encodeURIComponent(m)}`).then((x) => x.json());
      setCats(r.categories ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const totalLimit = cats.reduce((s, c) => s + Number(c.monthly_limit ?? 0), 0);
  const totalSpent = cats.reduce((s, c) => s + Number(c.spent_this_month ?? 0), 0);
  const totalPct = Math.min(100, totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0);

  return (
    <DashboardShell mode="personal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Budget</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Monthly spending limits per category.</p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
          Add category
        </GradientButton>
      </div>

      <BankingCard accent="pink" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PieChart size={20} color={zp.brand.pink} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Monthly total</div>
            <div style={{ fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 4 }}>
              {zp.fmtCurrency(totalSpent)} <span style={{ color: zp.text.muted, fontSize: 13 }}>of {zp.fmtCurrency(totalLimit)}</span>
            </div>
          </div>
          <div style={{ width: 160 }}>
            <div style={{ height: 8, background: zp.surface.bg3, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${totalPct}%`, height: 8, background: totalPct > 80 ? zp.semantic.danger : zp.brand.pink }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: zp.text.muted, textAlign: "right" as const }}>{totalPct.toFixed(0)}%</div>
          </div>
        </div>
      </BankingCard>

      {loading && cats.length === 0 ? (
        <BankingCard><div style={{ color: zp.text.muted, fontSize: 13 }}>Loading…</div></BankingCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {cats.map((c) => <CategoryCard key={c.id} c={c} />)}
        </div>
      )}

      {open && <NewCategoryModal onClose={() => setOpen(false)} onCreated={async () => { setOpen(false); await load(); }} />}
    </DashboardShell>
  );
}

function CategoryCard({ c }: { c: Category }) {
  const limit = Number(c.monthly_limit ?? 0);
  const spent = Number(c.spent_this_month ?? 0);
  const pct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
  const danger = pct > 80;
  return (
    <BankingCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 24 }}>{c.icon || "📦"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{c.name}</div>
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>
            {zp.fmtCurrency(spent, c.currency)} of {zp.fmtCurrency(limit, c.currency)}
          </div>
        </div>
        {danger && (
          <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: zp.semantic.dangerBg, color: zp.semantic.danger, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
            Over 80%
          </span>
        )}
      </div>
      <div style={{ height: 8, background: zp.surface.bg3, borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
        <div style={{ width: `${pct}%`, height: 8, background: danger ? zp.semantic.danger : (c.color || zp.brand.pink) }} />
      </div>
    </BankingCard>
  );
}

function NewCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [icon, setIcon] = useState("📦");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2 || !Number(limit)) { setErr("Name + limit required"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/personal/budget", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid(), name, monthly_limit: Number(limit), icon }),
      });
      if (!r.ok) { setErr((await r.json().catch(() => ({})))?.error?.message ?? "Failed"); return; }
      await onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 420, padding: 22 }}>
        <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Add category</h2>
        <div style={{ marginTop: 18 }}>
          <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Monthly limit</label>
            <input type="number" min={0} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="200" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Icon</label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} style={{ ...inputStyle, textAlign: "center" as const, fontSize: 18 }} />
          </div>
        </div>
        {err && <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={busy} style={{ flex: 1, background: zp.gradient.personal }}>{busy ? "Adding…" : "Add"}</GradientButton>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none",
};
