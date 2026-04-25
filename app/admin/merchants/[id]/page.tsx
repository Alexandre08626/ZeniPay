// /admin/merchants/[id] — merchant detail + approve / reject / reset.

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

interface BankConnRow {
  id: string;
  provider: string;
  connection_type: string;
  institution_name: string;
  institution_logo_url: string | null;
  account_type: string;
  account_number_last4: string | null;
  currency: string;
  balance_synced: number;
  balance_synced_at: string | null;
  status: string;
  created_at: string;
}

interface Merchant {
  id: string;
  business_name: string | null;
  legal_business_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  business_type: string | null;
  ein_bn: string | null;
  country: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  owner_name: string | null;
  owner_dob: string | null;
  owner_ssn_last4: string | null;
  owner_sin_last3: string | null;
  status: string;
  onboarding_state: string | null;
  plan: string | null;
  kyb_submitted_at: string | null;
  kyb_approved_at: string | null;
  kyb_rejection_reason: string | null;
  auth_user_id: string | null;
  created_at: string;
}

interface KybDoc {
  id: string;
  document_type: string;
  filename: string;
  status: string;
  notes: string | null;
  created_at: string;
}

function memail() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client_email") || ""; }

export default function AdminMerchantDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [email, setEmail] = useState("");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [docs, setDocs] = useState<KybDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setEmail(memail().toLowerCase()); }, []);
  const authorized = email && ADMIN_EMAILS.has(email);

  const load = useCallback(async () => {
    if (!authorized || !id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/admin/merchants/${id}`, { headers: { "x-admin-email": email } }).then((r) => r.json());
      setMerchant(r.merchant ?? null);
      setDocs(r.documents ?? []);
    } finally { setLoading(false); }
  }, [authorized, email, id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: "approve" | "reject" | "reset") => {
    setErr(null);
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (shown to the merchant):") ?? null;
      if (reason == null) return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/v1/admin/merchants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ action, reason }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) { setErr(data?.error ?? "Action failed."); return; }
      await load();
    } finally { setBusy(false); }
  };

  if (!authorized) {
    return (
      <DashboardShell mode="admin">
        <BankingCard><p style={{ margin: 0, padding: 24, textAlign: "center", color: zp.text.muted }}>Admin-only area.</p></BankingCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell mode="admin">
      <Link href="/admin/merchants" style={{
        display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18,
        fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.muted, textDecoration: "none",
      }}>
        <ChevronLeft size={14} /> All merchants
      </Link>

      {err && (
        <BankingCard style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, color: zp.semantic.danger, fontWeight: zp.weight.semibold, fontSize: 13 }}>{err}</p>
        </BankingCard>
      )}

      {loading && !merchant ? (
        <BankingCard><p style={{ margin: 0, color: zp.text.muted }}>Loading…</p></BankingCard>
      ) : !merchant ? (
        <BankingCard><p style={{ margin: 0, color: zp.text.muted }}>Merchant not found.</p></BankingCard>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 28, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.03em" }}>
                {merchant.business_name ?? "(no name)"}
              </h1>
              <div style={{ marginTop: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <StatusPill status={merchant.status} />
                <span style={{ fontSize: 11, color: zp.text.muted, fontFamily: zp.font.mono }}>{merchant.id}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {merchant.status !== "active" && (
                <button onClick={() => act("approve")} disabled={busy} style={btnApprove}>✓ Approve</button>
              )}
              {merchant.status !== "rejected" && (
                <button onClick={() => act("reject")} disabled={busy} style={btnReject}>✗ Reject</button>
              )}
              <button onClick={() => act("reset")} disabled={busy} style={btnReset}>↩ Reset to pending</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            <BankingCard>
              <h3 style={hdr}>Business</h3>
              <Row k="Legal name" v={merchant.legal_business_name ?? "—"} />
              <Row k="Type" v={merchant.business_type ?? "—"} />
              <Row k="EIN / BN" v={merchant.ein_bn ?? "—"} mono />
              <Row k="Website" v={merchant.website ?? "—"} mono />
              <Row k="Phone" v={merchant.phone ?? "—"} />
              <Row k="Plan" v={merchant.plan ?? "—"} />
            </BankingCard>

            <BankingCard>
              <h3 style={hdr}>Address</h3>
              <Row k="Line 1" v={merchant.address_line1 ?? "—"} />
              <Row k="Line 2" v={merchant.address_line2 ?? "—"} />
              <Row k="City" v={merchant.city ?? "—"} />
              <Row k="Region" v={merchant.state_province ?? "—"} />
              <Row k="Postal/ZIP" v={merchant.postal_code ?? "—"} mono />
              <Row k="Country" v={merchant.country ?? "—"} />
            </BankingCard>

            <BankingCard>
              <h3 style={hdr}>Owner</h3>
              <Row k="Name" v={merchant.owner_name ?? "—"} />
              <Row k="Date of birth" v={merchant.owner_dob ?? "—"} />
              <Row k="SSN last 4" v={merchant.owner_ssn_last4 ? `••• ${merchant.owner_ssn_last4}` : "—"} mono />
              <Row k="SIN last 3" v={merchant.owner_sin_last3 ? `•• ${merchant.owner_sin_last3}` : "—"} mono />
              <Row k="Auth user id" v={merchant.auth_user_id ?? "—"} mono />
            </BankingCard>

            <BankingCard>
              <h3 style={hdr}>Status</h3>
              <Row k="Status" v={<StatusPill status={merchant.status} />} />
              <Row k="Onboarding" v={merchant.onboarding_state ?? "—"} />
              <Row k="Submitted" v={merchant.kyb_submitted_at ? new Date(merchant.kyb_submitted_at).toLocaleString() : "—"} />
              <Row k="Approved" v={merchant.kyb_approved_at ? new Date(merchant.kyb_approved_at).toLocaleString() : "—"} />
              {merchant.kyb_rejection_reason && (
                <Row k="Rejection reason" v={<span style={{ color: zp.semantic.danger }}>{merchant.kyb_rejection_reason}</span>} />
              )}
            </BankingCard>
          </div>

          <BankingCard style={{ marginTop: 14 }}>
            <h3 style={hdr}>KYB documents</h3>
            {docs.length === 0 ? (
              <p style={{ fontSize: 13, color: zp.text.muted, margin: "6px 0 0" }}>No documents submitted yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Type", "Filename", "Status", "Notes", "Submitted"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "8px 0", fontSize: 10, fontWeight: zp.weight.semibold,
                        color: zp.text.muted, letterSpacing: "0.06em", textTransform: "uppercase",
                        borderBottom: `1px solid ${zp.surface.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                      <td style={td}>{d.document_type.replace(/_/g, " ")}</td>
                      <td style={{ ...td, fontFamily: zp.font.mono }}>{d.filename}</td>
                      <td style={td}>{d.status}</td>
                      <td style={{ ...td, color: zp.text.muted }}>{d.notes ?? "—"}</td>
                      <td style={{ ...td, color: zp.text.muted }}>{new Date(d.created_at).toLocaleDateString("en-CA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </BankingCard>

          <BankConnections merchantId={id} />
        </>
      )}
    </DashboardShell>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", padding: "8px 0", borderTop: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{k}</span>
      <span style={{ fontSize: 13, color: zp.text.primary, fontFamily: mono ? zp.font.mono : undefined, wordBreak: "break-all" }}>{v}</span>
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

const hdr: React.CSSProperties = {
  margin: 0, fontFamily: zp.font.display, fontSize: 15,
  fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.01em",
};

const td: React.CSSProperties = { padding: "10px 0", fontSize: 13, color: zp.text.primary };

const btnBase: React.CSSProperties = {
  border: "none", padding: "10px 18px", borderRadius: 10,
  fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer",
};
const btnApprove: React.CSSProperties = { ...btnBase, background: "linear-gradient(135deg,#2DBE60,#15B8C9)", color: "#fff" };
const btnReject: React.CSSProperties  = { ...btnBase, background: "#fff", color: zp.semantic.danger, border: "1.5px solid rgba(220,38,38,0.35)" };
const btnReset: React.CSSProperties   = { ...btnBase, background: "#fff", color: zp.text.muted, border: `1.5px solid ${zp.surface.border}` };

// ---------------------------------------------------------------------------
function BankConnections({ merchantId }: { merchantId: string }) {
  const [rows, setRows] = useState<BankConnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/bank/connections?merchant_id=${encodeURIComponent(merchantId)}&_=${Date.now()}`, { cache: "no-store" });
        const data = await r.json();
        setRows((data.connections ?? []) as BankConnRow[]);
      } finally { setLoading(false); }
    };
    void load();
  }, [merchantId]);

  if (loading && rows.length === 0) return null;

  return (
    <BankingCard style={{ marginTop: 18, padding: 0 }}>
      <div style={{ padding: "16px 18px 10px", borderBottom: `1px solid ${zp.surface.border}` }}>
        <h3 style={hdr}>Bank Connections</h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: zp.text.muted }}>
          External bank accounts linked via MX.
        </p>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "20px 18px", fontSize: 13, color: zp.text.muted }}>No bank connections yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: zp.surface.bg2 }}>
              {["Provider", "Type", "Institution", "Account", "Balance", "Synced", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                <td style={{ ...td, padding: "10px 16px" }}>{c.provider.toUpperCase()}</td>
                <td style={{ ...td, padding: "10px 16px", textTransform: "capitalize" as const }}>{c.connection_type}</td>
                <td style={{ ...td, padding: "10px 16px" }}>{c.institution_name}</td>
                <td style={{ ...td, padding: "10px 16px", fontFamily: zp.font.mono }}>{c.account_type} ·••• {c.account_number_last4 ?? "----"}</td>
                <td style={{ ...td, padding: "10px 16px", fontFamily: zp.font.mono }}>{zp.fmtCurrency(Number(c.balance_synced ?? 0), c.currency)}</td>
                <td style={{ ...td, padding: "10px 16px", color: zp.text.muted, fontSize: 12 }}>{c.balance_synced_at ? new Date(c.balance_synced_at).toLocaleString("en-CA") : "—"}</td>
                <td style={{ ...td, padding: "10px 16px" }}><StatusPill status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BankingCard>
  );
}
