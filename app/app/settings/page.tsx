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
  accountKind?: "personal" | "business";
  businessName?: string;
  legalBusinessName?: string;
  businessType?: string;
  einBn?: string;
  industry?: string;
  monthlyVolume?: string;
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerDob?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  sandboxKey?: string;
  liveKey?: string;
  status?: string;
  plan?: string;
  createdAt?: string;
}

// Industries / volumes / business types must mirror the signup form so
// the Edit-mode select options never drift from what the API accepts.
const BUSINESS_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "corporation",         label: "Corporation" },
  { value: "llc",                 label: "LLC" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership",         label: "Partnership" },
  { value: "non_profit",          label: "Non-profit" },
];
const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "technology",  label: "Technology" },
  { value: "ecommerce",   label: "E-commerce" },
  { value: "travel",      label: "Travel" },
  { value: "real_estate", label: "Real Estate" },
  { value: "healthcare",  label: "Healthcare" },
  { value: "legal",       label: "Legal" },
  { value: "finance",     label: "Finance" },
  { value: "other",       label: "Other" },
];
const VOLUME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "under_10k", label: "Under $10K" },
  { value: "10k_50k",   label: "$10K – $50K" },
  { value: "50k_250k",  label: "$50K – $250K" },
  { value: "over_250k", label: "Over $250K" },
];

function labelOf(opts: Array<{ value: string; label: string }>, v?: string): string {
  if (!v) return "";
  return opts.find((o) => o.value === v)?.label ?? v;
}

type Section = "profile" | "business" | "payouts" | "banks" | "api" | "notifications" | "security";

const ALL_SECTIONS: Array<{ id: Section; label: string; Icon: typeof User }> = [
  { id: "profile",       label: "Profile",       Icon: User },
  { id: "business",      label: "Business",      Icon: Building2 },
  { id: "payouts",       label: "Payouts",       Icon: Banknote },
  { id: "banks",         label: "Bank accounts", Icon: Landmark },
  { id: "api",           label: "API keys",      Icon: KeyRound },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "security",      label: "Security",      Icon: Shield },
];

// Personal-only merchants don't have a business entity, KYB, or API
// keys — collapse the sidebar to what's actually relevant for them.
const PERSONAL_HIDDEN_SECTIONS: Set<Section> = new Set<Section>(["business", "api"]);

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

  // Sidebar items shown to the current merchant. Personal-only users
  // skip Business + API keys; everyone else sees the full set.
  const isPersonal = merchant?.accountKind === "personal" || merchant?.status === "personal_only";
  const sections = isPersonal
    ? ALL_SECTIONS.filter((s) => !PERSONAL_HIDDEN_SECTIONS.has(s.id))
    : ALL_SECTIONS;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as Section;
    if (sections.some((s) => s.id === hash)) setSection(hash);
  }, [sections]);

  // If a personal user lands on a hidden hash (e.g. #business after
  // converting to personal_only), bounce them back to Profile.
  useEffect(() => {
    if (isPersonal && PERSONAL_HIDDEN_SECTIONS.has(section)) {
      setSection("profile");
      if (typeof window !== "undefined") window.history.replaceState(null, "", "#profile");
    }
  }, [isPersonal, section]);

  return (
    <DashboardShell mode="merchant">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Settings</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
          {isPersonal ? "Profile, bank accounts, notifications." : "Account, business, API keys, notifications."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }} className="pr20-settings-grid">
        <aside>
          {sections.map((s) => {
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
            <ProfileSection merchant={merchant} onSaved={(m) => setMerchant(m)} />
          )}
          {section === "business" && (
            <BusinessSection merchant={merchant} onSaved={(m) => setMerchant(m)} />
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
    active:        { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Active" },
    live:          { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Active" },
    pending_kyb:   { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Under review" },
    pending:       { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Under review" },
    personal_only: { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Personal" },
    rejected:      { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Rejected" },
    closed:        { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Closed" },
  };
  const s = map[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted, label: "Under review" };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {s.label}
    </span>
  );
}

// ─── Profile section (display + edit) ──────────────────────────────────
//
// "Profile" is the human behind the account. For business merchants
// it's the account owner; for personal merchants it's everything
// (name + address + DOB + KYC). Read mode lists the fields, Edit
// mode swaps to a form.
//
// Email, country and DOB stay read-only — email is auth-bound, country
// drives currency/routing, DOB is KYC. Personal users edit their full
// address here; business users edit only contact info because the
// top-level address columns store the BUSINESS address (managed in
// the Business section).

interface ProfileFormState {
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  // Personal-only fields. For business merchants these inputs are
  // hidden so we never accidentally overwrite the business address.
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
}

function emptyProfileForm(m: Merchant | null): ProfileFormState {
  return {
    ownerFirstName: m?.ownerFirstName ?? "",
    ownerLastName:  m?.ownerLastName  ?? "",
    phone:          m?.phone          ?? "",
    addressLine1:   m?.addressLine1   ?? "",
    addressLine2:   m?.addressLine2   ?? "",
    city:           m?.city           ?? "",
    stateProvince:  m?.stateProvince  ?? "",
    postalCode:     m?.postalCode     ?? "",
  };
}

function ProfileSection({ merchant, onSaved }: {
  merchant: Merchant | null;
  onSaved: (m: Merchant) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(() => emptyProfileForm(merchant));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  React.useEffect(() => { setForm(emptyProfileForm(merchant)); }, [merchant]);

  const country = merchant?.country || "CA";
  const provinceLabel = country === "US" ? "State" : "Province";
  const postalLabel   = country === "US" ? "ZIP code" : "Postal code";
  const isPersonal    = merchant?.accountKind === "personal" || merchant?.status === "personal_only";

  const update = <K extends keyof ProfileFormState>(k: K, v: ProfileFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const cancel = () => {
    setForm(emptyProfileForm(merchant));
    setErr(null);
    setEditing(false);
  };

  const save = async () => {
    if (!merchant?.id) { setErr("Missing merchant id."); return; }
    setSaving(true);
    setErr(null);
    try {
      // Owner full-name mirrors first+last for legacy displays that
      // read merchant.owner_name (invoice receipts, etc.).
      const ownerName = `${form.ownerFirstName.trim()} ${form.ownerLastName.trim()}`.trim();
      const payload: Record<string, unknown> = {
        merchant_id:    merchant.id,
        ownerFirstName: form.ownerFirstName.trim(),
        ownerLastName:  form.ownerLastName.trim(),
        ownerName,
        phone:          form.phone.trim(),
      };
      if (isPersonal) {
        payload.addressLine1  = form.addressLine1.trim();
        payload.addressLine2  = form.addressLine2.trim();
        payload.city          = form.city.trim();
        payload.stateProvince = form.stateProvince.trim();
        payload.postalCode    = form.postalCode.trim();
      }
      const r = await fetch("/api/zenipay/merchant-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(typeof data?.error === "string" ? data.error : "Save failed.");
        return;
      }
      if (data.merchant) onSaved(data.merchant as Merchant);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // Display name falls back across first+last → ownerName → "—".
  const displayName =
    (merchant?.ownerFirstName || merchant?.ownerLastName)
      ? `${merchant.ownerFirstName ?? ""} ${merchant.ownerLastName ?? ""}`.trim()
      : merchant?.ownerName || "—";

  return (
    <BankingCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle
          title="Profile"
          subtitle={isPersonal
            ? "Your personal info on this ZeniPay account."
            : "How you appear in ZeniPay and on customer receipts."}
        />
        {!editing && (
          <GradientButton variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</GradientButton>
        )}
      </div>

      {err && (
        <div role="alert" style={{
          marginBottom: 12, padding: "10px 12px", borderRadius: 10,
          background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
          fontSize: 12, fontWeight: zp.weight.semibold,
        }}>{err}</div>
      )}

      {!editing ? (
        <>
          <Row label={isPersonal ? "Full name" : "Owner name"} value={displayName} />
          <Row label="Email" value={merchant?.email || memail() || "—"} mono />
          <Row label="Phone" value={merchant?.phone || "—"} />
          <Row label="Date of birth" value={merchant?.ownerDob ? zp.fmtDate(merchant.ownerDob) : "—"} />
          {isPersonal && (
            <>
              <Row label="Street address" value={merchant?.addressLine1 || "—"} />
              {merchant?.addressLine2 && <Row label="Address line 2" value={merchant.addressLine2} />}
              <Row label="City" value={merchant?.city || "—"} />
              <Row label={provinceLabel} value={merchant?.stateProvince || "—"} />
              <Row label={postalLabel} value={merchant?.postalCode || "—"} />
            </>
          )}
          <Row label="Country" value={country} />
        </>
      ) : (
        <div style={{ paddingTop: 6 }}>
          <EditRow>
            <EditField label="First name">
              <input style={editInput} autoComplete="given-name" value={form.ownerFirstName} onChange={(e) => update("ownerFirstName", e.target.value)} />
            </EditField>
            <EditField label="Last name">
              <input style={editInput} autoComplete="family-name" value={form.ownerLastName} onChange={(e) => update("ownerLastName", e.target.value)} />
            </EditField>
          </EditRow>
          <EditField label="Phone">
            <input style={editInput} autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </EditField>
          {isPersonal && (
            <>
              <EditField label="Street address">
                <input style={editInput} autoComplete="address-line1" value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} />
              </EditField>
              <EditField label="Address line 2">
                <input style={editInput} autoComplete="address-line2" value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} />
              </EditField>
              <EditRow cols="2fr 1fr 1fr">
                <EditField label="City">
                  <input style={editInput} autoComplete="address-level2" value={form.city} onChange={(e) => update("city", e.target.value)} />
                </EditField>
                <EditField label={provinceLabel}>
                  <input style={editInput} autoComplete="address-level1" value={form.stateProvince} onChange={(e) => update("stateProvince", e.target.value)} />
                </EditField>
                <EditField label={postalLabel}>
                  <input style={editInput} autoComplete="postal-code" value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
                </EditField>
              </EditRow>
            </>
          )}
          <p style={{ margin: "12px 0 14px", fontSize: 11, color: zp.text.muted }}>
            Email, date of birth and country are managed by ZeniPay support — contact us to change these.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <GradientButton variant="ghost" size="sm" onClick={cancel}>Cancel</GradientButton>
            <GradientButton variant="primary" size="sm" onClick={save}>{saving ? "Saving…" : "Save changes"}</GradientButton>
          </div>
        </div>
      )}
    </BankingCard>
  );
}

// ─── Business section (display + edit) ──────────────────────────────────
//
// Read-mode shows every legal-entity field on the merchant. Hitting
// "Edit" swaps the rows for inputs; "Save" PATCHes /merchant-info and
// the parent re-renders with the fresh shape returned by the API.
//
// For a status='personal_only' merchant the section is empty by
// design — show a clear CTA back to the personal flow instead of a
// half-filled business form.

interface BusinessFormState {
  businessName: string;
  legalBusinessName: string;
  businessType: string;
  einBn: string;
  industry: string;
  monthlyVolume: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
}

function emptyForm(m: Merchant | null): BusinessFormState {
  return {
    businessName:      m?.businessName      ?? "",
    legalBusinessName: m?.legalBusinessName ?? "",
    businessType:      m?.businessType      ?? "",
    einBn:             m?.einBn             ?? "",
    industry:          m?.industry          ?? "",
    monthlyVolume:     m?.monthlyVolume     ?? "",
    phone:             m?.phone             ?? "",
    website:           m?.website           ?? "",
    addressLine1:      m?.addressLine1      ?? "",
    addressLine2:      m?.addressLine2      ?? "",
    city:              m?.city              ?? "",
    stateProvince:     m?.stateProvince     ?? "",
    postalCode:        m?.postalCode        ?? "",
  };
}

function BusinessSection({ merchant, onSaved }: {
  merchant: Merchant | null;
  onSaved: (m: Merchant) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BusinessFormState>(() => emptyForm(merchant));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Hydrate the form whenever the parent loads/updates the merchant —
  // covers the initial fetch and any post-save refresh.
  React.useEffect(() => { setForm(emptyForm(merchant)); }, [merchant]);

  const country = merchant?.country || "CA";
  const provinceLabel = country === "US" ? "State" : "Province";
  const postalLabel   = country === "US" ? "ZIP code" : "Postal code";
  const einLabel      = country === "US" ? "Employer Identification Number (EIN)" : "Business Number (BN)";
  const isPersonal    = merchant?.accountKind === "personal" || merchant?.status === "personal_only";

  const update = <K extends keyof BusinessFormState>(k: K, v: BusinessFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const cancel = () => {
    setForm(emptyForm(merchant));
    setErr(null);
    setEditing(false);
  };

  const save = async () => {
    if (!merchant?.id) { setErr("Missing merchant id."); return; }
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/zenipay/merchant-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ merchant_id: merchant.id, ...form }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(typeof data?.error === "string" ? data.error : "Save failed.");
        return;
      }
      if (data.merchant) onSaved(data.merchant as Merchant);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (isPersonal) {
    return (
      <BankingCard>
        <SectionTitle title="Business" subtitle="Legal entity details shown on invoices + payment receipts." />
        <div style={{ padding: "20px 0 4px", fontSize: 13, color: zp.text.primary, lineHeight: 1.55 }}>
          This is a <strong>personal</strong> ZeniPay account. Open a business
          account to set legal-entity details that appear on invoices and
          payment receipts.
        </div>
        <div style={{ marginTop: 14 }}>
          <a href="/register?type=business" style={{ display: "inline-block", padding: "9px 16px", borderRadius: zp.radius.md, background: zp.gradient.main, color: "#FFFFFF", fontSize: 13, fontWeight: zp.weight.semibold, textDecoration: "none" }}>
            Open a business account →
          </a>
        </div>
      </BankingCard>
    );
  }

  return (
    <BankingCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <SectionTitle title="Business" subtitle="Legal entity details shown on invoices + payment receipts." />
        {!editing && (
          <GradientButton variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</GradientButton>
        )}
      </div>

      {err && (
        <div role="alert" style={{
          marginBottom: 12, padding: "10px 12px", borderRadius: 10,
          background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
          fontSize: 12, fontWeight: zp.weight.semibold,
        }}>{err}</div>
      )}

      {!editing ? (
        <>
          <Row label="Business name"        value={merchant?.businessName       || "—"} />
          <Row label="Legal business name"  value={merchant?.legalBusinessName  || merchant?.businessName || "—"} />
          <Row label="Business type"        value={labelOf(BUSINESS_TYPE_OPTIONS, merchant?.businessType) || "—"} />
          <Row label={einLabel}             value={merchant?.einBn              || "—"} mono />
          <Row label="Industry"             value={labelOf(INDUSTRY_OPTIONS, merchant?.industry) || "—"} />
          <Row label="Monthly volume"       value={labelOf(VOLUME_OPTIONS, merchant?.monthlyVolume) || "—"} />
          <Row label="Phone"                value={merchant?.phone              || "—"} />
          <Row label="Website"              value={merchant?.website            || "—"} mono />
          <Row label="Email"                value={merchant?.email              || "—"} mono />
          <Row label="Street address"       value={merchant?.addressLine1       || "—"} />
          {merchant?.addressLine2 && <Row label="Address line 2" value={merchant.addressLine2} />}
          <Row label="City"                 value={merchant?.city               || "—"} />
          <Row label={provinceLabel}        value={merchant?.stateProvince      || "—"} />
          <Row label={postalLabel}          value={merchant?.postalCode         || "—"} />
          <Row label="Country"              value={country} />
          <Row label="Plan"                 value={merchant?.plan               || "Standard"} />
          <Row label="Status"               value={<StatusPill status={merchant?.status || "pending_kyb"} />} />
          <Row label="Member since"         value={merchant?.createdAt ? zp.fmtDate(merchant.createdAt) : "—"} />
        </>
      ) : (
        <div style={{ paddingTop: 6 }}>
          <EditField label="Business name">
            <input style={editInput} value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </EditField>
          <EditField label="Legal business name">
            <input style={editInput} value={form.legalBusinessName} onChange={(e) => update("legalBusinessName", e.target.value)} />
          </EditField>
          <EditRow>
            <EditField label="Business type">
              <select style={editInput} value={form.businessType} onChange={(e) => update("businessType", e.target.value)}>
                <option value="">—</option>
                {BUSINESS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </EditField>
            <EditField label={einLabel}>
              <input style={editInput} value={form.einBn} onChange={(e) => update("einBn", e.target.value)} />
            </EditField>
          </EditRow>
          <EditRow>
            <EditField label="Industry">
              <select style={editInput} value={form.industry} onChange={(e) => update("industry", e.target.value)}>
                <option value="">—</option>
                {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </EditField>
            <EditField label="Monthly volume">
              <select style={editInput} value={form.monthlyVolume} onChange={(e) => update("monthlyVolume", e.target.value)}>
                <option value="">—</option>
                {VOLUME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </EditField>
          </EditRow>
          <EditRow>
            <EditField label="Phone">
              <input style={editInput} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </EditField>
            <EditField label="Website">
              <input style={editInput} value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
            </EditField>
          </EditRow>
          <EditField label="Street address">
            <input style={editInput} value={form.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} />
          </EditField>
          <EditField label="Address line 2">
            <input style={editInput} value={form.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} />
          </EditField>
          <EditRow cols="2fr 1fr 1fr">
            <EditField label="City">
              <input style={editInput} value={form.city} onChange={(e) => update("city", e.target.value)} />
            </EditField>
            <EditField label={provinceLabel}>
              <input style={editInput} value={form.stateProvince} onChange={(e) => update("stateProvince", e.target.value)} />
            </EditField>
            <EditField label={postalLabel}>
              <input style={editInput} value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </EditField>
          </EditRow>
          <p style={{ margin: "12px 0 14px", fontSize: 11, color: zp.text.muted }}>
            Email, country, plan and status are managed by ZeniPay support — contact us to change these.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <GradientButton variant="ghost" size="sm" onClick={cancel}>Cancel</GradientButton>
            <GradientButton variant="primary" size="sm" onClick={save}>{saving ? "Saving…" : "Save changes"}</GradientButton>
          </div>
        </div>
      )}
    </BankingCard>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

function EditRow({ children, cols = "1fr 1fr" }: { children: React.ReactNode; cols?: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>{children}</div>;
}

const editInput: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${zp.surface.border}`, background: "#FFFFFF",
  color: zp.text.primary, fontSize: 13, boxSizing: "border-box",
  outline: "none", fontFamily: zp.font.sans,
};
