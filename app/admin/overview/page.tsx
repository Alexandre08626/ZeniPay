// /admin/overview — Super dashboard for ZeniPay platform operators.
//
// Email-allowlisted (AdminGate). DashboardShell mode='admin', green
// accent. Reads /api/v1/admin/stats + /api/v1/admin/activity.

"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { AdminGate } from "../AdminGate";
import { adminFetch, adminEmail } from "../_lib/admin-fetch";

// Avatars in /public/agents/. We slug the agent name to match the
// filename. If the file doesn't exist (e.g. a custom agent), the
// fallback below renders the initials circle as before.
const KNOWN_AVATARS = new Set([
  "atlas", "ben", "jade", "kai", "leo", "luna", "marco", "max",
  "mia", "rex", "sofia", "vera",
]);
function avatarFor(name: string): string | null {
  const slug = (name || "").trim().toLowerCase().replace(/\s+/g, "-");
  return KNOWN_AVATARS.has(slug) ? `/agents/${slug}.png` : null;
}

interface Stats {
  merchants_active: number;
  merchants_pending_kyb: number;
  total_agents: number;
  total_transactions: number;
  total_volume: number;
  zenicore_journal_entries: number;
  paylinks_active: number;
  invoices_open: number;
  api_keys_active: number;
  leads_total: number;
}

interface ActivityResp {
  last_transactions: Array<{ kind: string; id: string; merchant_id?: string; amount: number; currency: string; status: string; date?: string; description: string }>;
  active_agents: Array<{ id: string; name: string; agent_type: string; organization_id: string; created_at: string }>;
  fraud_alerts: Array<{ id: string; severity: string; description: string; agent_id?: string; created_at: string }>;
  ledger_recent: Array<{ id: string; merchant_id: string; event_type: string; direction: string; amount: number; currency: string; created_at: string; reference?: string }>;
}

export default function AdminOverviewPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<ActivityResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [s, f] = await Promise.all([
        adminFetch<Stats>("/api/v1/admin/stats"),
        adminFetch<ActivityResp>("/api/v1/admin/activity"),
      ]);
      setStats(s); setFeed(f);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            ZeniPay Command Center
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
            Real-time view of every merchant, agent, transaction, and treasury.
          </p>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 12px", borderRadius: 999,
          background: `${zp.brand.green}15`, color: zp.brand.green,
          fontSize: 11, fontWeight: zp.weight.semibold, letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: zp.brand.green }} />
          Admin · {adminEmail()}
        </span>
      </div>

      {err && (
        <BankingCard style={{ marginBottom: 14, borderLeft: `3px solid ${zp.semantic.danger}` }}>
          <div style={{ fontSize: 12, color: zp.semantic.danger, fontWeight: zp.weight.semibold }}>Failed to load admin data: {err}</div>
        </BankingCard>
      )}

      {/* Row 1 — 6 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Kpi label="Active merchants"   value={stats ? String(stats.merchants_active) : "—"} accent="green" />
        <Kpi label="Pending KYB"         value={stats ? String(stats.merchants_pending_kyb) : "—"} accent="cyan" sub="awaiting review" />
        <Kpi label="AI agents"           value={stats ? String(stats.total_agents) : "—"} accent="violet" />
        <Kpi label="Transactions"        value={stats ? String(stats.total_transactions) : "—"} />
        <Kpi label="Volume processed"    value={stats ? zp.fmtCurrency(stats.total_volume) : "—"} accent="green" />
        <Kpi label="ZeniCore journal"    value={stats ? String(stats.zenicore_journal_entries) : "—"} sub="entries" />
      </div>

      {/* Row 2 — three live blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 18 }}>
        <BankingCard accent="green" padding="none">
          <BlockHeader title="Latest transactions" link={{ href: "/admin/transactions", label: "All" }} />
          <DataTable
            rows={feed?.last_transactions ?? []}
            loading={loading && !feed}
            rowKey={(r) => r.id}
            columns={[
              { key: "merchant", header: "Merchant", cell: (r) => r.merchant_id ?? "—", width: 110 },
              { key: "desc",     header: "Description", cell: (r) => r.description },
              { key: "amount",   header: "Amount", mono: true, align: "right", width: 120,
                cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(r.amount, r.currency)}</span>,
              },
            ]}
            empty="No transactions yet."
          />
        </BankingCard>

        <BankingCard accent="violet">
          <BlockHeader title="Active agents" link={{ href: "/admin/agents", label: "All" }} inline />
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 10 }}>
            {(feed?.active_agents ?? []).slice(0, 8).map((a) => {
              const avatar = avatarFor(a.name);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${zp.surface.border}` }}>
                  {avatar ? (
                    <span style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: zp.surface.bg2, flexShrink: 0, boxShadow: `0 0 0 2px rgba(123,79,191,0.20)` }}>
                      <Image
                        src={avatar}
                        alt={`${a.name} avatar`}
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40, objectFit: "cover" }}
                      />
                    </span>
                  ) : (
                    <span style={{ width: 40, height: 40, borderRadius: "50%", background: zp.gradient.tintViolet, display: "inline-flex", alignItems: "center", justifyContent: "center", color: zp.brand.violet, fontSize: 13, fontWeight: zp.weight.semibold, flexShrink: 0 }}>
                      {(a.name ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: 11, color: zp.text.muted, textTransform: "capitalize" as const }}>{a.agent_type}</div>
                  </div>
                </div>
              );
            })}
            {(feed?.active_agents.length ?? 0) === 0 && <div style={{ fontSize: 13, color: zp.text.muted, padding: 8 }}>No active agents.</div>}
          </div>
        </BankingCard>

        <BankingCard accent="green" style={{ borderLeft: `3px solid ${zp.semantic.danger}` }}>
          <BlockHeader title="Fraud signals" link={{ href: "/admin/fraud", label: "All" }} inline />
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 10 }}>
            {(feed?.fraud_alerts ?? []).slice(0, 8).map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${zp.surface.border}` }}>
                <SeverityPill severity={f.severity} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: zp.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{f.description}</div>
                  <div style={{ fontSize: 10, color: zp.text.muted, fontFamily: zp.font.mono }}>{new Date(f.created_at).toLocaleString("en-CA")}</div>
                </div>
              </div>
            ))}
            {(feed?.fraud_alerts.length ?? 0) === 0 && (
              <div style={{ fontSize: 13, color: zp.text.muted, padding: 8 }}>No active fraud signals.</div>
            )}
          </div>
        </BankingCard>
      </div>

      {/* Row 3 — secondary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Kpi label="Pay links"     value={stats ? String(stats.paylinks_active) : "—"} sub="active" />
        <Kpi label="Open invoices" value={stats ? String(stats.invoices_open) : "—"} />
        <Kpi label="API keys"      value={stats ? String(stats.api_keys_active) : "—"} sub="active" />
        <Kpi label="Leads"         value={stats ? String(stats.leads_total) : "—"} sub="pipeline" />
      </div>

      {/* Row 4 — ZeniCore ledger */}
      <BankingCard padding="none" accent="green">
        <BlockHeader title="ZeniCore ledger · Live" link={{ href: "/agents/ledger", label: "Full ledger" }} icon={<LiveIndicator color={zp.brand.green} pulse size="sm" label="" />} />
        <DataTable
          rows={feed?.ledger_recent ?? []}
          loading={loading && !feed}
          rowKey={(r) => r.id}
          columns={[
            { key: "date",   header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 140 },
            { key: "merch",  header: "Merchant", cell: (r) => r.merchant_id, width: 130 },
            { key: "event",  header: "Event", cell: (r) => r.event_type },
            { key: "dir",    header: "Dir", cell: (r) => <DirPill dir={r.direction} />, width: 80 },
            { key: "amount", header: "Amount", mono: true, align: "right", width: 130,
              cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(Number(r.amount), r.currency)}</span> },
          ]}
          empty="No ledger entries yet."
        />
      </BankingCard>
    </>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "cyan" | "violet" | "green" | "neutral" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}

function BlockHeader({ title, link, icon, inline }: { title: string; link?: { href: string; label: string }; icon?: React.ReactNode; inline?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: inline ? 0 : "14px 18px", borderBottom: inline ? "none" : `1px solid ${zp.surface.border}` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Activity size={14} color={zp.brand.green} />
        <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{title}</span>
        {icon}
      </div>
      {link && (
        <Link href={link.href} style={{ fontSize: 11, color: zp.brand.green, fontWeight: zp.weight.semibold, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {link.label} <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const v = (severity || "info").toLowerCase();
  const map: Record<string, { bg: string; fg: string }> = {
    critical: { bg: zp.semantic.dangerBg, fg: zp.semantic.danger },
    high:     { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    medium:   { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    low:      { bg: zp.semantic.infoBg, fg: zp.semantic.info },
    info:     { bg: zp.surface.bg3, fg: zp.text.muted },
  };
  const m = map[v] ?? map.info;
  return <span style={{ fontSize: 9, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{v}</span>;
}

function DirPill({ dir }: { dir: string }) {
  const isCredit = dir === "credit";
  return (
    <span style={{
      fontSize: 9, fontWeight: zp.weight.semibold,
      padding: "2px 8px", borderRadius: 999,
      background: isCredit ? zp.semantic.successBg : zp.surface.bg3,
      color: isCredit ? zp.semantic.success : zp.text.muted,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>{dir}</span>
  );
}
