"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

interface AccessRequest {
  id: string;
  email: string;
  company: string | null;
  message: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

function memail() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client_email") || "";
}

export default function AdminLeadsPage() {
  const [email, setEmail] = useState("");
  const [leads, setLeads] = useState<AccessRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(memail().toLowerCase());
  }, []);

  const authorized = email && ADMIN_EMAILS.has(email);

  const load = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (statusFilter) params.set("status", statusFilter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/v1/admin/leads?${params.toString()}`, {
        headers: { "x-admin-email": email },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authorized, email, statusFilter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const newL = leads.filter((l) => l.status === "new").length;
    const contacted = leads.filter((l) => l.status === "contacted").length;
    const qualified = leads.filter((l) => l.status === "qualified").length;
    const closed = leads.filter((l) => l.status === "closed").length;
    return { total: leads.length, new: newL, contacted, qualified, closed };
  }, [leads]);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      try {
        const res = await fetch("/api/v1/admin/leads", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-email": email,
          },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) throw new Error("Update failed");
        await load();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Update failed";
        alert(msg);
      }
    },
    [email, load]
  );

  if (!authorized) {
    return (
      <DashboardShell mode="admin">
        <BankingCard>
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: zp.weight.semibold,
                color: zp.text.primary,
              }}
            >
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
        <h1
          style={{
            margin: 0,
            fontFamily: zp.font.display,
            fontSize: 32,
            fontWeight: zp.weight.semibold,
            color: zp.text.primary,
            letterSpacing: "-0.03em",
          }}
        >
          Leads
        </h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
          Pipeline + marketing campaigns + Marco lead-hunter feed.
        </p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Stat label="Total" value={String(stats.total)} accent={zp.brand.cyan} />
        <Stat label="New" value={String(stats.new)} accent="#3B82F6" />
        <Stat label="Contacted" value={String(stats.contacted)} accent="#D97706" />
        <Stat label="Qualified" value={String(stats.qualified)} accent={zp.semantic.success} />
        <Stat label="Closed" value={String(stats.closed)} accent={zp.text.muted} />
      </div>

      {/* Filters */}
      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={input}
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="closed">Closed</option>
          </select>
          <input
            placeholder="Search email, company, or message"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ ...input, flex: "1 1 240px" }}
          />
        </div>
      </BankingCard>

      {/* Error */}
      {error && (
        <BankingCard padding={12} style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: zp.semantic.danger }}>{error}</p>
        </BankingCard>
      )}

      {/* Table */}
      <BankingCard padding="none">
        {loading && leads.length === 0 ? (
          <p style={{ padding: "22px 18px", color: zp.text.muted, fontSize: 13, margin: 0 }}>
            Loading…
          </p>
        ) : leads.length === 0 ? (
          <p style={{ padding: "22px 18px", color: zp.text.muted, fontSize: 13, margin: 0 }}>
            No leads match.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: zp.surface.bg2 }}>
                {["Created", "Email", "Company", "Source", "Status", "Message", "Notes", ""].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 14px",
                        fontSize: 10,
                        fontWeight: zp.weight.semibold,
                        color: zp.text.muted,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        borderBottom: `1px solid ${zp.surface.border}`,
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  style={{ borderTop: `1px solid ${zp.surface.border}` }}
                >
                  <td style={{ ...td, color: zp.text.muted, fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(l.created_at).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={{ ...td, fontFamily: zp.font.mono }}>{l.email}</td>
                  <td style={td}>{l.company ?? "—"}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, textTransform: "capitalize" }}>
                      {l.source ?? "—"}
                    </span>
                  </td>
                  <td style={td}>
                    <StatusPill status={l.status} />
                  </td>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.message ?? "—"}
                  </td>
                  <td style={{ ...td, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: zp.text.muted }}>
                    {l.notes ?? "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      style={smallInput}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BankingCard>

      <p style={{ marginTop: 10, fontSize: 11, color: zp.text.dim }}>
        Showing {leads.length} of {total} total lead(s).
      </p>
    </DashboardShell>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${zp.surface.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: zp.weight.semibold,
          color: zp.text.muted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: zp.weight.semibold,
          color: zp.text.primary,
          marginTop: 4,
          fontFamily: zp.font.mono,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    new: { bg: "rgba(59,130,246,0.1)", fg: "#3B82F6" },
    contacted: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    qualified: { bg: "rgba(45,190,96,0.1)", fg: zp.semantic.success },
    closed: { bg: zp.surface.bg3, fg: zp.text.muted },
  };
  const c = map[status] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: zp.weight.semibold,
        padding: "3px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

const input: React.CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${zp.surface.border}`,
  background: zp.surface.bg2,
  color: zp.text.primary,
  fontSize: 13,
  outline: "none",
  fontFamily: zp.font.sans,
};

const smallInput: React.CSSProperties = {
  height: 28,
  padding: "0 6px",
  borderRadius: 6,
  border: `1px solid ${zp.surface.border}`,
  background: zp.surface.bg2,
  color: zp.text.primary,
  fontSize: 11,
  outline: "none",
  fontFamily: zp.font.sans,
  cursor: "pointer",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: zp.text.primary,
};