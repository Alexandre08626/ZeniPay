// /app/settings — merchant settings on the new shell.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { User, Building2, KeyRound, Bell, Shield, LogOut, Banknote, Landmark } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";
import { PayoutDestinationsSection } from "./PayoutDestinationsSection";
import { ApiKeysSection, ApiUsageSection } from "./ApiKeysSection";
import { BankConnectionsPanel } from "@/app/components/shared/BankConnectionsPanel";

interface Merchant {
  id: string;
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  website?: string;
  businessType?: string;
  country?: string;
  sandboxKey?: string;
  liveKey?: string;
  status?: string;
  plan?: string;
  createdAt?: string;
}

type Section = "profile" | "business" | "payouts" | "banks" | "api" | "notifications" | "security";

const SECTIONS: Array<{ id: Section; label: string; Icon: typeof User }> = [
  { id: "profile",       label: "Profile",       Icon: User },
  { id: "business",      label: "Business",      Icon: Building2 },
  { id: "payouts",       label: "Payouts",       Icon: Banknote },
  { id: "banks",         label: "Bank accounts", Icon: Landmark },
  { id: "api",           label: "API keys",      Icon: KeyRound },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "security",      label: "Security",      Icon: Shield },
];

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }
function memail() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client_email") || ""; }

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("profile");
  const [showSecrets, setShowSecrets] = useState({ test: false, live: false });

  const load = useCallback(async () => {
    const id = mid(); const email = memail();
    if (!id && !email) return;
    setLoading(true);
    try {
      const url = id
        ? `/api/zenipay/merchant-info?id=${encodeURIComponent(id)}`
        : `/api/zenipay/merchant-info?email=${encodeURIComponent(email)}`;
      const r = await fetch(url).then((x) => x.json());
      if (r.merchant) setMerchant(r.merchant as Merchant);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as Section;
    if (SECTIONS.some((s) => s.id === hash)) setSection(hash);
  }, []);

  return (
    <DashboardShell mode="merchant">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Settings</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Account, business, API keys, notifications.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }} className="pr20-settings-grid">
        <aside>
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSection(s.id);
                  if (typeof window !== "undefined") window.history.replaceState(null, "", `#${s.id}`);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 12px", marginBottom: 2,
                  border: "none", borderRadius: zp.radius.md, cursor: "pointer",
                  textAlign: "left" as const, fontSize: 13,
                  background: active ? zp.gradient.tintCyan : "transparent",
                  color: active ? zp.text.primary : zp.text.muted,
                  fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  position: "relative" as const,
                  transition: zp.motion.base,
                }}
              >
                {active && (
                  <span aria-hidden style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, background: zp.brand.cyan, borderRadius: 2 }} />
                )}
                <s.Icon size={15} color={active ? zp.brand.cyan : zp.text.muted} />
                {s.label}
              </button>
            );
          })}
        </aside>

        <div>
          {section === "profile" && (
            <BankingCard>
              <SectionTitle title="Profile" subtitle="How you appear in ZeniPay and on customer receipts." />
              <Row label="Owner name" value={merchant?.ownerName || "—"} />
              <Row label="Email" value={merchant?.email || memail() || "—"} mono />
              <Row label="Phone" value={merchant?.phone || "—"} />
              <Row label="Country" value={merchant?.country || "CA"} />
            </BankingCard>
          )}
          {section === "business" && (
            <BankingCard>
              <SectionTitle title="Business" subtitle="Legal entity details shown on invoices + payment receipts." />
              <Row label="Business name" value={merchant?.businessName || "—"} />
              <Row label="Business type" value={merchant?.businessType || "—"} />
              <Row label="Website" value={merchant?.website || "—"} mono />
              <Row label="Plan" value={merchant?.plan || "Standard"} />
              <Row label="Status" value={<StatusPill status={merchant?.status || "pending_kyb"} />} />
              <Row label="Member since" value={merchant?.createdAt ? zp.fmtDate(merchant.createdAt) : "—"} />
            </BankingCard>
          )}
          {section === "payouts" && (
            <PayoutDestinationsSection merchantId={mid()} />
          )}
          {section === "banks" && (
            <BankConnectionsPanel merchantId={mid()} connectionType="business" accent="cyan" />
          )}
          {section === "api" && (
            <>
              <BankingCard>
                <SectionTitle title="API Keys" subtitle="Use Test Mode while you integrate. Live Mode activates automatically when your account is approved." />
                <ModeKeyRow
                  mode="test"
                  active={true}
                  value={merchant?.sandboxKey || "—"}
                  reveal={showSecrets.test}
                  onToggle={() => setShowSecrets((s) => ({ ...s, test: !s.test }))}
                  blurb="Use this key to integrate ZeniPay. Test transactions won't move real money."
                />
                <ModeKeyRow
                  mode="live"
                  active={merchant?.status === "active" || merchant?.status === "live"}
                  value={merchant?.liveKey || "—"}
                  reveal={showSecrets.live}
                  onToggle={() => setShowSecrets((s) => ({ ...s, live: !s.live }))}
                  blurb={
                    merchant?.status === "active" || merchant?.status === "live"
                      ? "Use this key to accept real payments."
                      : "Activates automatically once your account is approved."
                  }
                />
              </BankingCard>
              <ApiKeysSection merchantId={mid()} />
              <ApiUsageSection merchantId={mid()} />
            </>
          )}
          {section === "notifications" && (
            <BankingCard>
              <SectionTitle title="Notifications" subtitle="Where we send receipts, failed-charge alerts, and weekly summaries." />
              <Row label="Primary email" value={merchant?.email || memail() || "—"} mono />
              <Row label="Weekly summary" value="Enabled" />
              <Row label="Failed payments" value="Enabled" />
              <Row label="Large transaction alerts" value="Enabled — threshold $1,000" />
            </BankingCard>
          )}
          {section === "security" && (
            <BankingCard>
              <SectionTitle title="Security" subtitle="Protect your ZeniPay account." />
              <Row label="Session" value={merchant?.email || memail() || "—"} mono />
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <GradientButton
                  variant="danger" size="md" icon={<LogOut size={14} />}
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    sessionStorage.clear();
                    window.location.href = "/login";
                  }}
                >
                  Sign out everywhere
                </GradientButton>
              </div>
            </BankingCard>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pr20-settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {loading && <style>{`.zp-loading{}`}</style>}
    </DashboardShell>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ margin: "3px 0 0", fontSize: 12, color: zp.text.muted }}>{subtitle}</p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", padding: "10px 0", borderTop: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
      <span style={{ fontSize: 13, color: zp.text.primary, fontFamily: mono ? zp.font.mono : zp.font.sans, wordBreak: "break-all" as const }}>{value}</span>
    </div>
  );
}

function ModeKeyRow({ mode, active, value, reveal, onToggle, blurb }: {
  mode: "test" | "live";
  active: boolean;
  value: string;
  reveal: boolean;
  onToggle: () => void;
  blurb: string;
}) {
  const isLive = mode === "live";
  const label = isLive ? "Live Mode" : "Test Mode";
  const statusText = active
    ? "Active"
    : isLive ? "Pending review" : "Available";
  const dotColor = active ? zp.semantic.success : zp.text.dim;
  const masked = reveal ? value : value.slice(0, 9) + "•••••••••••••••";
  const noKey = !value || value === "—";

  return (
    <div style={{ padding: "16px 0", borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{label}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: zp.weight.semibold, color: dotColor, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, display: "inline-block" }} />
          {statusText}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: zp.font.mono, fontSize: 12, color: noKey ? zp.text.dim : zp.text.primary, background: zp.surface.bg2, padding: "9px 12px", borderRadius: zp.radius.sm, flex: "1 1 260px", wordBreak: "break-all" as const }}>
          {noKey ? "—" : masked}
        </span>
        {!noKey && (
          <>
            <GradientButton variant="secondary" size="sm" onClick={onToggle}>{reveal ? "Hide" : "View"}</GradientButton>
            <GradientButton variant="ghost" size="sm" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(value); }}>Copy</GradientButton>
          </>
        )}
      </div>
      <p style={{ margin: "8px 2px 0", fontSize: 12, color: zp.text.muted }}>{blurb}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    active:      { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Active" },
    live:        { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Active" },
    pending_kyb: { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Under review" },
    pending:     { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Under review" },
    rejected:    { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Rejected" },
    closed:      { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Closed" },
  };
  const s = map[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted, label: "Under review" };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {s.label}
    </span>
  );
}
