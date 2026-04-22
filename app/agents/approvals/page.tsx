// /agents/approvals — inbox. Pending + recent resolved, with TTL countdown.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface ApprovalReq {
  id: string;
  policy_id: string;
  subject_type: string;
  subject_ref: string;
  requested_by_agent_id: string | null;
  requested_amount_cents: number | null;
  requested_currency: string | null;
  context: { merchant?: string; merchant_category?: string; card_id?: string; required_signatures?: number };
  status: "pending" | "approved" | "denied" | "expired" | "canceled";
  expires_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export default function ApprovalsInbox() {
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [items, setItems] = useState<ApprovalReq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const q = tab === "pending" ? "?status=pending" : "?limit=100";
        const r = await apiFetch<{ approvals: ApprovalReq[] }>(`/api/v1/agents/approvals${q}`);
        if (!cancelled) {
          setItems(tab === "resolved"
            ? r.approvals.filter((a) => a.status !== "pending")
            : r.approvals);
        }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tab]);

  return (
    <Shell title="Approvals">
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")} label="Pending" count={items.filter(i => i.status === "pending").length} />
        <TabBtn active={tab === "resolved"} onClick={() => setTab("resolved")} label="Resolved" />
      </div>

      {loading && items.length === 0 ? (
        <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>
              {tab === "pending" ? "Nothing pending" : "No resolved approvals yet"}
            </p>
            <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>
              When an agent attempts a card charge above your policy threshold, it lands here.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((a) => <RequestTile key={a.id} req={a} />)}
        </div>
      )}

      <div style={{ marginTop: 24, padding: "14px 16px", borderRadius: 12, background: "rgba(21,184,201,0.07)", border: "1px solid rgba(21,184,201,0.2)", fontSize: 12, color: MUTED }}>
        Need to configure who approves what? Go to{" "}
        <Link href="/agents/settings/approvals" style={{ color: ZP_GREEN, fontWeight: 700 }}>
          Settings · Approval policies →
        </Link>
      </div>
    </Shell>
  );
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 999,
        background: active ? TEXT : "#fff",
        color: active ? "#fff" : TEXT,
        border: `1px solid ${active ? TEXT : BORDER}`,
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
      }}
    >
      {label}
      {count != null && count > 0 && (
        <span style={{ padding: "1px 8px", borderRadius: 999, background: active ? "#fff" : "#DC2626", color: active ? TEXT : "#fff", fontSize: 10, fontWeight: 800 }}>{count}</span>
      )}
    </button>
  );
}

function RequestTile({ req }: { req: ApprovalReq }) {
  const ttlSec = Math.max(0, Math.round((new Date(req.expires_at).getTime() - Date.now()) / 1000));
  const amount = req.requested_amount_cents ?? 0;
  const currency = req.requested_currency ?? "USD";
  const merchant = req.context.merchant ?? "(unknown merchant)";
  const requiredSigs = req.context.required_signatures ?? 1;
  const pending = req.status === "pending";

  return (
    <Link href={`/agents/approvals/${req.id}`} style={{ textDecoration: "none" }}>
      <Card style={{ borderLeft: `4px solid ${pending ? "#D97706" : req.status === "approved" ? ZP_GREEN : "#DC2626"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
              <StatusPill status={req.status} />
              {requiredSigs > 1 && pending && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(21,184,201,0.12)", color: "#0891B2", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  DUAL CONTROL · {requiredSigs} sigs
                </span>
              )}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: "-0.4px" }}>
              {currency === "USD" ? fmtUSD(amount) : `${(amount / 100).toFixed(2)} ${currency}`}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
              at <strong style={{ color: TEXT }}>{merchant}</strong>
              {req.context.merchant_category ? ` · MCC ${req.context.merchant_category}` : ""}
            </div>
            <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace", marginTop: 6 }}>
              {req.id} · requested {fmtDate(req.created_at)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {pending ? (
              <>
                <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.08em" }}>EXPIRES IN</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: ttlSec < 60 ? "#DC2626" : ttlSec < 300 ? "#D97706" : TEXT }}>
                  {ttlSec >= 3600 ? `${Math.floor(ttlSec / 3600)}h ${Math.floor((ttlSec % 3600) / 60)}m`
                   : ttlSec >= 60 ? `${Math.floor(ttlSec / 60)}m ${ttlSec % 60}s`
                   : `${ttlSec}s`}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: MUTED }}>RESOLVED</div>
                <div style={{ fontSize: 12, color: TEXT }}>{req.resolved_at ? fmtDate(req.resolved_at) : "—"}</div>
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    pending:  { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    approved: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    denied:   { bg: "rgba(220,38,38,0.1)",  fg: "#DC2626" },
    expired:  { bg: "#f1f5f9", fg: "#64748b" },
    canceled: { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.06em" }}>{status}</span>;
}

// Keep import used
void useMemo;
