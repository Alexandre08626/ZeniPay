// Accounting integrations panel — QuickBooks, Xero, Wave, FreshBooks.
//
// Gated on env flags. When an adapter is enabled, "Connect" opens
// the provider's OAuth flow. When it isn't, the CTA shows a subtle
// "Coming soon" pill and the row still renders so merchants see
// what's on the roadmap.
//
// Env flags (set any of these to 'true' on Vercel to flip a row to
// live connect):
//   QUICKBOOKS_OAUTH_ENABLED
//   XERO_OAUTH_ENABLED
//   WAVE_OAUTH_ENABLED
//   FRESHBOOKS_OAUTH_ENABLED
//
// Reusable across /app/settings + /personal/settings. Accent cyan for
// business, pink for personal.

"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { Link2, Unlink, Clock, Check, AlertCircle } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

type Provider = "quickbooks" | "xero" | "wave" | "freshbooks";
type Accent = "cyan" | "pink" | "green" | "violet";

interface ProviderDef {
  id: Provider;
  name: string;
  blurb: string;
  accent: string;
  logoUrl: string | null;   // optional — falls back to gradient chip
}

const PROVIDERS: ProviderDef[] = [
  { id: "quickbooks", name: "QuickBooks", blurb: "Sync transactions, categorize expenses, close the books faster.",
    accent: "#2CA01C", logoUrl: null },
  { id: "xero",       name: "Xero",       blurb: "Two-way sync of payments + bills to Xero.",
    accent: "#13B5EA", logoUrl: null },
  { id: "wave",       name: "Wave",       blurb: "Free bookkeeping with automated ZeniPay imports.",
    accent: "#1B3C6E", logoUrl: null },
  { id: "freshbooks", name: "FreshBooks", blurb: "Time tracking + invoicing synced with ZeniPay.",
    accent: "#0075DD", logoUrl: null },
];

interface StatusResp {
  providers: Array<{
    id: Provider;
    enabled: boolean;        // env flag on
    connected: boolean;      // merchant already connected
    connected_at: string | null;
    account_label: string | null;
  }>;
}

export interface AccountingConnectionsPanelProps {
  merchantId: string;
  connectionType: "business" | "personal";
  accent?: Accent;
}

export function AccountingConnectionsPanel({
  merchantId, connectionType, accent = "cyan",
}: AccountingConnectionsPanelProps) {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "warning" | "danger" } | null>(null);

  const accentColor =
    accent === "pink"   ? zp.brand.pink   :
    accent === "green"  ? zp.brand.green  :
    accent === "violet" ? zp.brand.violet :
                          zp.brand.cyan;

  const load = useCallback(async () => {
    if (!merchantId) return;
    try {
      const r = await fetch(
        `/api/v1/accounting/status?merchant_id=${encodeURIComponent(merchantId)}&type=${connectionType}&_=${Date.now()}`,
        { cache: "no-store" },
      );
      const data = await r.json();
      setStatus(data);
    } catch { /* ignore */ }
  }, [merchantId, connectionType]);
  useEffect(() => { void load(); }, [load]);

  const connect = async (p: Provider) => {
    setBusy(p);
    try {
      const r = await fetch(
        `/api/v1/accounting/connect-url?merchant_id=${encodeURIComponent(merchantId)}&provider=${p}&type=${connectionType}`,
        { cache: "no-store" },
      );
      const data = await r.json();
      if (r.status === 503) {
        setToast({ msg: `${labelFor(p)} connection — coming soon. We'll notify you.`, tone: "warning" });
        return;
      }
      if (!r.ok || !data.url) {
        setToast({ msg: data?.error?.message ?? `Connection to ${labelFor(p)} failed.`, tone: "danger" });
        return;
      }
      // Live adapter — redirect to OAuth start.
      window.location.href = data.url;
    } finally { setBusy(null); }
  };

  const disconnect = async (p: Provider) => {
    if (!window.confirm(`Disconnect ${labelFor(p)}?`)) return;
    setBusy(p);
    try {
      const r = await fetch(
        `/api/v1/accounting/disconnect?merchant_id=${encodeURIComponent(merchantId)}&provider=${p}`,
        { method: "POST" },
      );
      if (r.ok) {
        setToast({ msg: `${labelFor(p)} disconnected.`, tone: "success" });
        await load();
      } else {
        setToast({ msg: "Disconnect failed.", tone: "danger" });
      }
    } finally { setBusy(null); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>
          Connect your accounting
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: zp.text.muted, lineHeight: 1.5 }}>
          Sync ZeniPay transactions to QuickBooks, Xero, Wave, or FreshBooks. Categorization is handled by your accounting agent automatically.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {PROVIDERS.map((p) => {
          const s = status?.providers?.find((x) => x.id === p.id);
          const connected = !!s?.connected;
          const enabled = !!s?.enabled;
          return (
            <BankingCard key={p.id} accent={accent}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <ProviderBadge def={p} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.1px" }}>{p.name}</div>
                    {connected && <StatusPill label="Connected" tone="success" />}
                    {!connected && !enabled && <StatusPill label="Coming soon" tone="muted" />}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: zp.text.muted, lineHeight: 1.5 }}>{p.blurb}</p>
                  {connected && s?.account_label && (
                    <div style={{ fontSize: 11, color: zp.text.dim, marginTop: 4, fontFamily: zp.font.mono }}>
                      {s.account_label}{s.connected_at ? ` · since ${new Date(s.connected_at).toLocaleDateString("en-CA")}` : ""}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {connected ? (
                  <GradientButton
                    size="sm" variant="ghost" icon={<Unlink size={12} />}
                    onClick={() => disconnect(p.id)}
                    disabled={busy === p.id}
                  >
                    {busy === p.id ? "Disconnecting…" : "Disconnect"}
                  </GradientButton>
                ) : enabled ? (
                  <GradientButton
                    size="sm" variant="primary" icon={<Link2 size={12} />}
                    onClick={() => connect(p.id)}
                    disabled={busy === p.id}
                    style={accent === "pink" ? { background: zp.gradient.personal } : { background: `linear-gradient(135deg, ${accentColor} 0%, ${zp.brand.violet} 100%)` }}
                  >
                    {busy === p.id ? "Opening…" : "Connect"}
                  </GradientButton>
                ) : (
                  <GradientButton
                    size="sm" variant="secondary" icon={<Clock size={12} />}
                    onClick={() => connect(p.id)}
                    disabled={busy === p.id}
                  >
                    Get notified
                  </GradientButton>
                )}
              </div>
            </BankingCard>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed", bottom: 24, right: 24,
            padding: "10px 14px", borderRadius: zp.radius.sm,
            background: "#0F172A", color: "#fff", boxShadow: zp.elevation.lg,
            fontSize: 13, fontWeight: zp.weight.semibold,
            zIndex: zp.zIndex.modal,
            borderLeft: `3px solid ${
              toast.tone === "success" ? zp.semantic.success :
              toast.tone === "warning" ? zp.semantic.warning :
                                         zp.semantic.danger
            }`,
          }}
        >
          {toast.tone === "success" ? <Check size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} /> : <AlertCircle size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />}
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProviderBadge({ def }: { def: ProviderDef }) {
  if (def.logoUrl) {
    return (
      <div style={{ width: 44, height: 44, borderRadius: zp.radius.md, overflow: "hidden", background: zp.surface.bg2, position: "relative", flexShrink: 0 }}>
        <Image src={def.logoUrl} alt={def.name} fill sizes="44px" style={{ objectFit: "contain", padding: 6 }} unoptimized />
      </div>
    );
  }
  return (
    <div style={{
      width: 44, height: 44, borderRadius: zp.radius.md,
      background: `linear-gradient(135deg, ${def.accent} 0%, ${def.accent}99 100%)`,
      color: "#fff", fontWeight: zp.weight.semibold, fontSize: 16,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {def.name.slice(0, 2)}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "muted" }) {
  const m =
    tone === "success"
      ? { bg: zp.semantic.successBg, fg: zp.semantic.success }
      : { bg: zp.surface.bg3,        fg: zp.text.muted };
  return (
    <span style={{
      fontSize: 9, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999,
      background: m.bg, color: m.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>{label}</span>
  );
}

function labelFor(p: Provider): string {
  const d = PROVIDERS.find((x) => x.id === p);
  return d?.name ?? p;
}

export default AccountingConnectionsPanel;
