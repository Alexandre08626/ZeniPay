// /agents/approvals — approval inbox.
//
// Merges PR 12 merchant-rule requests (source='merchant_rule') with the
// legacy TOTP agent-scope ones (source='agent_totp'). Merchant-rule
// requests support inline Approve / Reject. Legacy TOTP requests deep-
// link to /agents/approvals/[id] for the signature flow.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { CheckSquare, Check, X } from "lucide-react";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_PURPLE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

// Unified shape — the list endpoint returns both kinds of rows. `source`
// and an id prefix drive branch behavior on click.
interface ApprovalRow {
  id: string;
  source: "merchant_rule" | "agent_totp";
  status: "pending" | "approved" | "denied" | "rejected" | "expired" | "canceled";
  created_at: string;
  expires_at: string | null;
  decided_at?: string | null;
  resolved_at?: string | null;
  rejection_reason?: string | null;
  // merchant_rule fields
  amount_units?: number | null;
  currency?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  approver_email?: string | null;
  memo?: string | null;
  // agent_totp fields
  policy_id?: string | null;
  requested_amount_cents?: number | null;
  requested_currency?: string | null;
  context?: {
    merchant?: string;
    merchant_category?: string;
    required_signatures?: number;
  };
}

export default function ApprovalsInbox() {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ approvals: ApprovalRow[] }>("/api/v1/agents/approvals?limit=200");
      setItems(r.approvals ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => { if (!cancelled) await load(); };
    void run();
    const id = setInterval(run, 12_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);
  const history = useMemo(() => items.filter((i) => i.status !== "pending"), [items]);

  const stats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const start = thisMonth.getTime();
    const resolvedThisMonth = history.filter((h) => {
      const t = new Date(h.decided_at ?? h.resolved_at ?? h.created_at).getTime();
      return t >= start;
    });
    const approved = resolvedThisMonth.filter((h) => h.status === "approved").length;
    const rejected = resolvedThisMonth.filter((h) => h.status === "rejected" || h.status === "denied").length;
    const diffs = resolvedThisMonth
      .map((h) => {
        const end = new Date(h.decided_at ?? h.resolved_at ?? 0).getTime();
        const begin = new Date(h.created_at).getTime();
        return end > begin ? (end - begin) / 1000 : NaN;
      })
      .filter((n) => Number.isFinite(n));
    const avgSec = diffs.length > 0 ? Math.round(diffs.reduce((s, x) => s + x, 0) / diffs.length) : 0;
    return { pending: pending.length, approved, rejected, avgSec };
  }, [pending, history]);

  const approveRow = async (r: ApprovalRow) => {
    if (r.source !== "merchant_rule") return;
    setBusyId(r.id);
    try {
      await apiFetch(`/api/v1/agents/approvals/${r.id}/approve`, { method: "POST", body: "{}" });
      setToast(`Approved ${fmtUnits(r.amount_units, r.currency)} to ${r.agent_name ?? "agent"} ✓`);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Approvals">
      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Pending" value={String(stats.pending)} accent="#D97706" />
        <Stat label="Approved this month" value={String(stats.approved)} accent={ZP_GREEN} />
        <Stat label="Rejected this month" value={String(stats.rejected)} accent="#DC2626" />
        <Stat label="Avg response" value={stats.avgSec > 0 ? fmtDuration(stats.avgSec) : "—"} accent={ZP_PURPLE} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")} label="Pending" count={pending.length} />
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} label="History" />
      </div>

      {toast && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 10,
          background: "rgba(45,190,96,0.08)", color: "#16A34A",
          fontSize: 13, fontWeight: 700,
          border: "1px solid rgba(45,190,96,0.25)",
        }}>{toast}</div>
      )}

      {loading && items.length === 0 ? (
        <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading…</p></Card>
      ) : tab === "pending" ? (
        pending.length === 0 ? (
          <Card>
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <CheckSquare size={40} color={ZP_PURPLE} />
              <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "10px 0 4px" }}>
                No pending approvals.
              </p>
              <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>
                Your agents are all clear.
              </p>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            <TableHeader />
            {pending.map((r) => (
              <PendingRow
                key={r.id}
                req={r}
                busy={busyId === r.id}
                onApprove={() => approveRow(r)}
                onRejectOpen={() => setRejectTarget(r)}
              />
            ))}
          </Card>
        )
      ) : (
        history.length === 0 ? (
          <Card>
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>No resolved approvals yet.</p>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            <HistoryHeader />
            {history.map((r) => <HistoryRow key={r.id} req={r} />)}
          </Card>
        )
      )}

      <div style={{ marginTop: 24, padding: "14px 16px", borderRadius: 12, background: "rgba(123,79,191,0.07)", border: "1px solid rgba(123,79,191,0.2)", fontSize: 12, color: MUTED }}>
        Need to configure who approves what? Go to{" "}
        <Link href="/agents/settings" style={{ color: ZP_PURPLE, fontWeight: 700 }}>
          Settings · Approval rules →
        </Link>
      </div>

      {rejectTarget && (
        <RejectModal
          req={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={async (reason) => {
            setBusyId(rejectTarget.id);
            try {
              await apiFetch(`/api/v1/agents/approvals/${rejectTarget.id}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
              });
              setToast(`Rejected request ${rejectTarget.id.slice(0, 12)}…`);
              setRejectTarget(null);
              await load();
            } catch (e) {
              setToast(e instanceof Error ? e.message : String(e));
            } finally {
              setBusyId(null);
            }
          }}
        />
      )}
    </Shell>
  );
}

function TableHeader() {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto",
      gap: 12, padding: "12px 18px", borderBottom: `1px solid ${BORDER}`,
      fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      <div>Agent / Subject</div>
      <div>Amount</div>
      <div>Requested</div>
      <div>Expires</div>
      <div />
    </div>
  );
}

function HistoryHeader() {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1.2fr 1fr",
      gap: 12, padding: "12px 18px", borderBottom: `1px solid ${BORDER}`,
      fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      <div>Agent / Subject</div>
      <div>Amount</div>
      <div>Requested</div>
      <div>Resolved</div>
      <div>Status</div>
    </div>
  );
}

function PendingRow({
  req, busy, onApprove, onRejectOpen,
}: {
  req: ApprovalRow;
  busy: boolean;
  onApprove: () => void;
  onRejectOpen: () => void;
}) {
  const ttlSec = req.expires_at ? Math.max(0, Math.round((new Date(req.expires_at).getTime() - Date.now()) / 1000)) : null;
  const amountLabel = req.source === "merchant_rule"
    ? fmtUnits(req.amount_units, req.currency)
    : req.requested_amount_cents != null
      ? ((req.requested_currency ?? "USD") === "USD" ? fmtUSD(req.requested_amount_cents) : `${(req.requested_amount_cents / 100).toFixed(2)} ${req.requested_currency}`)
      : "—";
  const subject = req.source === "merchant_rule"
    ? (req.agent_name ?? "Agent distribution")
    : (req.context?.merchant ?? "(unknown merchant)");
  const isLegacy = req.source === "agent_totp";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr auto",
      gap: 12, padding: "14px 18px", borderTop: `1px solid ${ROW_SEP}`,
      alignItems: "center",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{subject}</div>
        <div style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace", marginTop: 2 }}>
          {req.id} · {req.source === "merchant_rule" ? "merchant rule" : "TOTP signature"}
        </div>
        {req.memo && (
          <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>“{req.memo}”</div>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, fontFamily: "ui-monospace" }}>
        {amountLabel}
      </div>
      <div style={{ fontSize: 12, color: MUTED }}>{fmtDate(req.created_at)}</div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: ttlSec == null ? MUTED : ttlSec < 60 ? "#DC2626" : ttlSec < 300 ? "#D97706" : TEXT,
      }}>
        {ttlSec == null ? "—" : fmtTtl(ttlSec)}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        {isLegacy ? (
          <Link href={`/agents/approvals/${req.id}`} style={{
            padding: "6px 12px", borderRadius: 8, background: "#f1f5f9",
            color: TEXT, fontSize: 11, fontWeight: 800, textDecoration: "none",
            border: `1px solid ${BORDER}`,
          }}>Open (TOTP) →</Link>
        ) : (
          <>
            <button
              onClick={onApprove}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: busy ? "#94a3b8" : "linear-gradient(135deg,#2DBE60,#15B8C9)",
                color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8,
                fontSize: 11, fontWeight: 800, cursor: busy ? "wait" : "pointer",
                boxShadow: busy ? "none" : "0 4px 10px rgba(45,190,96,0.25)",
              }}
            >
              <Check size={12} /> Approve
            </button>
            <button
              onClick={onRejectOpen}
              disabled={busy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#fff", color: "#DC2626",
                border: "1.5px solid rgba(220,38,38,0.35)",
                padding: "6px 12px", borderRadius: 8,
                fontSize: 11, fontWeight: 800, cursor: busy ? "wait" : "pointer",
              }}
            >
              <X size={12} /> Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ req }: { req: ApprovalRow }) {
  const amountLabel = req.source === "merchant_rule"
    ? fmtUnits(req.amount_units, req.currency)
    : req.requested_amount_cents != null
      ? ((req.requested_currency ?? "USD") === "USD" ? fmtUSD(req.requested_amount_cents) : `${(req.requested_amount_cents / 100).toFixed(2)} ${req.requested_currency}`)
      : "—";
  const subject = req.source === "merchant_rule"
    ? (req.agent_name ?? "Agent distribution")
    : (req.context?.merchant ?? "(unknown merchant)");
  const resolved = req.decided_at ?? req.resolved_at;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1.2fr 1fr",
      gap: 12, padding: "14px 18px", borderTop: `1px solid ${ROW_SEP}`,
      alignItems: "center",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{subject}</div>
        <div style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace", marginTop: 2 }}>{req.id}</div>
        {req.rejection_reason && (
          <div style={{ fontSize: 11, color: "#DC2626", marginTop: 3 }}>✗ {req.rejection_reason}</div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "ui-monospace" }}>{amountLabel}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{fmtDate(req.created_at)}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{resolved ? fmtDate(resolved) : "—"}</div>
      <div><StatusPill status={req.status} /></div>
    </div>
  );
}

function RejectModal({
  req, onClose, onDone,
}: {
  req: ApprovalRow;
  onClose: () => void;
  onDone: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
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
          width: "100%", maxWidth: 460, background: "#fff",
          borderRadius: 14, padding: 22, boxShadow: "0 20px 50px rgba(10,15,30,0.25)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>Reject approval?</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 14px" }}>
          {fmtUnits(req.amount_units, req.currency)} to {req.agent_name ?? "agent"} · {req.id.slice(0, 12)}…
        </p>
        <label style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Over the monthly budget. Ask again next week."
          rows={3}
          style={{
            width: "100%", marginTop: 6, padding: "10px 12px",
            border: `1.5px solid ${BORDER}`, borderRadius: 10,
            background: "#f8fafc", fontSize: 13, fontFamily: "inherit",
            color: TEXT, outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: "transparent", color: MUTED, border: "none",
              padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={async () => { setBusy(true); await onDone(reason); setBusy(false); }}
            disabled={busy}
            style={{
              background: "#DC2626", color: "#fff", border: "none",
              padding: "8px 18px", borderRadius: 10,
              fontSize: 12, fontWeight: 800, cursor: busy ? "wait" : "pointer",
            }}
          >{busy ? "Rejecting…" : "Reject"}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "14px 16px", borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 4, fontFamily: "ui-monospace" }}>{value}</div>
    </div>
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

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    pending:  { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    approved: { bg: "rgba(45,190,96,0.12)",  fg: "#16A34A" },
    rejected: { bg: "rgba(220,38,38,0.1)",   fg: "#DC2626" },
    denied:   { bg: "rgba(220,38,38,0.1)",   fg: "#DC2626" },
    expired:  { bg: "#f1f5f9",                fg: "#64748b" },
    canceled: { bg: "#f1f5f9",                fg: "#64748b" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.06em" }}>{status}</span>;
}

function fmtUnits(amount: number | null | undefined, currency: string | null | undefined): string {
  const n = Number(amount ?? 0);
  const cur = currency || "CAD";
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: cur }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function fmtTtl(sec: number): string {
  if (sec >= 86400) return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
  if (sec >= 3600)  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  if (sec >= 60)    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

function fmtDuration(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`;
  if (sec >= 60)   return `${Math.round(sec / 60)}m`;
  return `${sec}s`;
}
