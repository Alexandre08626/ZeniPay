// /personal/settings — profile + KYC + linked business.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Building2, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";
import { AccountingConnectionsPanel } from "@/app/components/shared/AccountingConnectionsPanel";

interface Profile {
  id: string;
  merchant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  kyc_status: string | null;
  created_at: string;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/personal/profile?merchant_id=${encodeURIComponent(m)}`).then((x) => x.json());
      setProfile(r.profile ?? null);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell mode="personal">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Settings</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Personal profile, KYC, linked business.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20 }}>
        <BankingCard accent="pink">
          <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 14 }}>
            Personal profile
          </div>
          {loading ? (
            <div style={{ color: zp.text.muted, fontSize: 13 }}>Loading…</div>
          ) : !profile ? (
            <div style={{ color: zp.text.muted, fontSize: 13 }}>No personal profile on file. Contact info@zeniva.ca to set one up.</div>
          ) : (
            <>
              <Row label="Name"     value={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"} />
              <Row label="Email"    value={profile.email ?? "—"} />
              <Row label="Phone"    value={profile.phone ?? "—"} />
              <Row label="Date of birth" value={profile.date_of_birth ?? "—"} />
              <Row label="Address"  value={
                [profile.address_line1, profile.city, profile.region, profile.postal_code, profile.country]
                  .filter(Boolean).join(", ") || "—"
              } />
              <Row label="KYC status" value={<KycPill status={profile.kyc_status ?? "pending"} />} />
            </>
          )}
        </BankingCard>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <BankingCard>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Building2 size={16} color={zp.brand.cyan} />
              <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Linked business</div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: zp.text.muted, lineHeight: 1.5 }}>
              Your personal account is linked to your ZeniPay business account. Move money between modes from <Link href="/personal/wallets" style={{ color: zp.brand.pink, textDecoration: "underline" }}>Send & Receive</Link>.
            </p>
          </BankingCard>

          <BankingCard>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <ShieldCheck size={16} color={zp.semantic.success} />
              <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Security</div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: zp.text.muted, lineHeight: 1.5 }}>
              Personal mode shares the same login as Business. Manage password + sessions on the Business settings page.
            </p>
          </BankingCard>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <AccountingConnectionsPanel merchantId={mid()} connectionType="personal" accent="pink" />
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", padding: "10px 0", borderBottom: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
      <span style={{ fontSize: 13, color: zp.text.primary }}>{value}</span>
    </div>
  );
}

function KycPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    approved: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    pending:  { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    rejected: { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger },
  };
  const s = m[status] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {status}
    </span>
  );
}
