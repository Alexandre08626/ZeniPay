// /admin/merchants — Alex-only KYB review console.
// Client-side guard: only info@zeniva.ca and alexandreblais26@gmail.com
// see the list. The API enforces the same whitelist server-side via
// the x-admin-email header.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

const ADMIN_EMAILS = new Set(["info@zeniva.ca", "alexandreblais26@gmail.com"]);

interface MerchantRow {
  id: string;
  business_name: string | null;
  email: string | null;
  status: string;
  onboarding_state: string | null;
  plan: string | null;
  country: string | null;
  kyb_submitted_at: string | null;
  kyb_approved_at: string | null;
  created_at: string;
}

function memail() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client_email") || ""; }

export default function AdminMerchantsPage() {
  const [email, setEmail] = useState("");
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { setEmail(memail().toLowerCase()); }, []);
  const authorized = email && ADMIN_EMAILS.has(email);

  const load = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const r = await fetch("/api/v1/admin/merchants", { headers: { "x-admin-email": email } }).then((r) => r.json());
      setMerchants((r.merchants ?? []) as MerchantRow[]);
    } finally { setLoading(false); }
  }, [authorized, email]);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const pending = merchants.filter((m) => m.status === "pending_kyb").length;
    const active  = merchants.filter((m) => m.status === "active").length;
    const rejected = merchants.filter((m) => m.status === "rejected").length;
    return { total: merchants.length, pending, active, rejected };
  }, [merchants]);

  const filtered = useMemo(() => {
    const qLow = q.trim().toLowerCase();
    return merchants.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (qLow) {
        const hay = `${m.business_name ?? ""} ${m.email ?? ""}`.toLowerCase();
        if (!hay.includes(qLow)) return false;
      }
      return true;
    });
  }, [merchants, statusFilter, q]);

  if (!authorized) {
    return (
      <DashboardShell mode="admin">
        <BankingCard>
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
              Admin-only area
            </h2>
            <p style={{ margin: "6px 0 0", color: zp.text.muted, fontSize: 13 }}>
              Sign in with an authorized admin email to access this page.
            </p>
          </div>
        </BankingCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell mode="admin">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          margin: 0, fontFamily: zp.font.display, fontSize: 32,
          fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.03em",
        }}>Merchants</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
          Review KYB submissions, approve or reject. Admin-only.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Total" value={String(stats.total)} accent={zp.brand.cyan} />
        <Stat label="Pending KYB" value={String(stats.pending)} accent="#D97706" />
        <Stat label="Active" value={String(stats.active)} accent={zp.semantic.success} />
        <Stat label="Rejected" value={String(stats.rejected)} accent={zp.semantic.danger} />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={input}>
            <option value="">All statuses</option>
            <option value="pending_kyb">Pending KYB</option>
            <option value="active">Active</option>
            <option value="sandbox">Sandbox</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
          <input placeholder="Search business name or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input, flex: "1 1 240px" }} />
        </div>
      </BankingCard>

      <BankingCard padding="none">
        {loading && merchants.length === 0 ? (
          <p style={{ padding: "22px 18px", color: zp.text.muted, fontSize: 13, margin: 0 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: "22px 18px", color: zp.text.muted, fontSize: 13, margin: 0 }}>No merchants match.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: zp.surface.bg2 }}>
                {["Business", "Email", "Status", "Plan", "Country", "Submitted", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: zp.weight.semibold,
                    color: zp.text.muted, letterSpacing: "0.06em", textTransform: "uppercase",
                    borderBottom: `1px solid ${zp.surface.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                  <td style={td}>
                    <div style={{ fontWeight: zp.weight.semibold, color: zp.text.primary }}>{m.business_name ?? "—"}</div>
                    <div style={{ fontSize: 11, color: zp.text.dim, fontFamily: zp.font.mono }}>{m.id}</div>
                  </td>
                  <td style={{ ...td, fontFamily: zp.font.mono }}>{m.email ?? "—"}</td>
                  <td style={td}><StatusPill status={m.status} /></td>
                  <td style={td}>{m.plan ?? "—"}</td>
                  <td style={td}>{m.country ?? "—"}</td>
                  <td style={{ ...td, color: zp.text.muted, fontSize: 12 }}>
                    {m.kyb_submitted_at ? new Date(m.kyb_submitted_at).toLocaleDateString("en-CA") : "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/admin/merchants/${m.id}`} style={{
                      background: zp.surface.bg2, color: zp.text.primary,
                      border: `1px solid ${zp.surface.border}`,
                      padding: "6px 12px", borderRadius: 8,
                      fontSize: 11, fontWeight: zp.weight.semibold, textDecoration: "none",
                    }}>Open →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BankingCard>
    </DashboardShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${zp.surface.border}`, borderRadius: 14,
      padding: "14px 16px", borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 4, fontFamily: zp.font.mono }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    pending_kyb: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    active:      { bg: "rgba(45,190,96,0.1)",    fg: zp.semantic.success },
    sandbox:     { bg: "rgba(15,184,201,0.1)",   fg: zp.brand.cyan },
    rejected:    { bg: "rgba(220,38,38,0.1)",    fg: zp.semantic.danger },
    closed:      { bg: zp.surface.bg3,           fg: zp.text.muted },
  };
  const c = map[status] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: 999,
      background: c.bg, color: c.fg, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{status.replace(/_/g, " ")}</span>
  );
}

const input: React.CSSProperties = {
  height: 34, padding: "0 10px", borderRadius: 8,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 13, outline: "none", fontFamily: zp.font.sans,
};

const td: React.CSSProperties = {
  padding: "12px 14px", fontSize: 13, color: zp.text.primary,
};
