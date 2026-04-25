// Reusable "Connected bank accounts" panel.
//
// Drops into /app/wallets (business) and /personal/wallets (personal).
// Handles three states:
//   - MX disabled       → Coming soon banner
//   - no connections    → "Connect my bank" CTA → opens MX widget modal
//   - existing rows     → one card per connection with Sync + Fund +
//                         Disconnect actions.

"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw, Trash2, X, Link as LinkIcon, Mail, Lock, ArrowRight } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

export interface BankConnection {
  id: string;
  merchant_id: string;
  connection_type: "business" | "personal";
  provider: string;
  institution_name: string;
  institution_logo_url: string | null;
  account_type: string;
  account_number_last4: string | null;
  routing_number: string | null;
  currency: string;
  balance_synced: number;
  balance_synced_at: string | null;
  status: string;
}

export interface BankConnectionsPanelProps {
  merchantId: string;
  connectionType: "business" | "personal";
  accent?: "cyan" | "pink" | "green" | "violet";
}

export function BankConnectionsPanel({
  merchantId, connectionType, accent = "cyan",
}: BankConnectionsPanelProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connectUserGuid, setConnectUserGuid] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "danger" } | null>(null);
  const [funding, setFunding] = useState<BankConnection | null>(null);

  const accentColor =
    accent === "pink"   ? zp.brand.pink   :
    accent === "green"  ? zp.brand.green  :
    accent === "violet" ? zp.brand.violet :
                          zp.brand.cyan;

  const load = useCallback(async (opts?: { reconcile?: boolean }) => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const ts = Date.now();
      // Optional reconcile: pull any MX-linked accounts (including ones
      // connected outside our callback flow, e.g. recovered widget sessions)
      // and upsert them as zenipay_bank_connections rows.
      if (opts?.reconcile) {
        try {
          await fetch(`/api/v1/bank/mx/accounts?merchant_id=${encodeURIComponent(merchantId)}&type=${connectionType}&_=${ts}`, { cache: "no-store" });
        } catch { /* best-effort */ }
      }
      const [statusRes, connRes] = await Promise.all([
        fetch(`/api/v1/bank/status?_=${ts}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/v1/bank/connections?merchant_id=${encodeURIComponent(merchantId)}&type=${connectionType}&_=${ts}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setAvailable(!!statusRes.available);
      setConnections((connRes.connections ?? []) as BankConnection[]);
    } finally { setLoading(false); }
  }, [merchantId, connectionType]);
  useEffect(() => { void load(); }, [load]);

  const openConnectWidget = async () => {
    setConnecting(true);
    try {
      const r = await fetch(
        `/api/v1/bank/connect-url?merchant_id=${encodeURIComponent(merchantId)}&type=${connectionType}`,
        { cache: "no-store" },
      );
      const data = await r.json();
      if (!r.ok || !data.available || !data.url) {
        setToast({ msg: data?.error?.message ?? "Unable to open the bank-connect widget.", tone: "danger" });
        return;
      }
      setConnectUrl(data.url);
      setConnectUserGuid(data.user_guid ?? null);
    } finally { setConnecting(false); }
  };

  // Intercept MX's postMessage events. The listener is always
  // active (not gated on connectUrl) because we now open the widget
  // in a popup window by default — the iframe modal is only a
  // fallback. Popups post back to the opener window, which is us.
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      const type = String((payload as { type?: string }).type ?? "");
      if (type.endsWith("memberConnected")) {
        const meta = (payload as { metadata?: { user_guid?: string; member_guid?: string } }).metadata ?? {};
        const userGuid = meta.user_guid ?? connectUserGuid ?? "";
        const memberGuid = meta.member_guid ?? "";
        if (!memberGuid) return;
        await fetch("/api/v1/bank/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            user_guid: userGuid,
            member_guid: memberGuid,
            connection_type: connectionType,
          }),
        });
        setConnectUrl(null);
        setConnectUserGuid(null);
        // Reconcile pulls every account the user now has at MX so
        // multi-account connections show up on first load.
        await load({ reconcile: true });
        setToast({ msg: "Bank account connected", tone: "success" });
      } else if (type.endsWith("memberError") || type.endsWith("connectError")) {
        setConnectUrl(null);
        setConnectUserGuid(null);
        setToast({ msg: "Connection failed. Please try again.", tone: "danger" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [connectUrl, connectUserGuid, merchantId, connectionType, load]);

  const sync = async (id: string) => {
    const r = await fetch("/api/v1/bank/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, connection_id: id }),
    });
    if (r.ok) { await load(); setToast({ msg: "Balance synced", tone: "success" }); }
    else { setToast({ msg: "Sync failed", tone: "danger" }); }
  };

  const disconnect = async (id: string) => {
    if (!window.confirm("Disconnect this bank account?")) return;
    const r = await fetch(`/api/v1/bank/connections/${encodeURIComponent(id)}?merchant_id=${encodeURIComponent(merchantId)}`, {
      method: "DELETE",
    });
    if (r.ok) { await load(); setToast({ msg: "Disconnected", tone: "success" }); }
  };

  if (available === null && loading) {
    return (
      <BankingCard accent={accent}>
        <div style={{ fontSize: 13, color: zp.text.muted }}>Loading bank connections…</div>
      </BankingCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>
          Connected bank accounts
        </h2>
        {available && connections.length > 0 && (
          <GradientButton size="sm" variant="ghost" icon={<LinkIcon size={12} />} onClick={openConnectWidget} disabled={connecting}>
            Connect another
          </GradientButton>
        )}
      </div>

      {!available && (
        <BankingCard style={{ padding: "18px 22px", borderLeft: `3px solid ${zp.semantic.warning}` }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" as const }}>
            <div style={{ width: 40, height: 40, borderRadius: zp.radius.md, background: zp.semantic.warningBg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={18} color={zp.semantic.warning} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Bank connections — coming soon</div>
              <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>We&apos;re finalizing our bank-data provider. Link Desjardins, TD, RBC, BMO, Scotiabank and more the moment it ships.</div>
            </div>
            <GradientButton variant="secondary" size="sm" icon={<Mail size={12} />} onClick={() => { window.location.href = "mailto:info@zeniva.ca?subject=Notify%20me%20about%20bank%20connections"; }}>
              Get notified
            </GradientButton>
          </div>
        </BankingCard>
      )}

      {available && connections.length === 0 && (
        <BankingCard accent={accent} style={{ padding: "26px 24px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" as const }}>
            <div style={{ width: 48, height: 48, borderRadius: zp.radius.md, background: `${accentColor}18`, color: accentColor, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.1px" }}>
                Connect your bank account
              </div>
              <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 4, lineHeight: 1.5 }}>
                Link Desjardins, TD, RBC, BMO, Scotiabank, CIBC, or any North American bank in seconds. Secured by MX Technologies · SOC2 Type II.
              </div>
            </div>
            <GradientButton
              variant="primary" size="md"
              icon={<ArrowRight size={14} />}
              onClick={openConnectWidget}
              disabled={connecting}
              style={accent === "pink" ? { background: zp.gradient.personal } : undefined}
            >
              {connecting ? "Opening…" : "Connect my bank"}
            </GradientButton>
          </div>
        </BankingCard>
      )}

      {available && connections.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              c={c}
              accent={accent}
              onSync={() => sync(c.id)}
              onDisconnect={() => disconnect(c.id)}
              onFund={() => setFunding(c)}
            />
          ))}
        </div>
      )}

      {/* MX Connect widget modal */}
      {connectUrl && (
        <div onClick={() => setConnectUrl(null)} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 100vw)", height: "min(640px, 95vh)", background: zp.surface.bg1, borderRadius: zp.radius.lg, overflow: "hidden", position: "relative", boxShadow: zp.elevation.lg }}>
            <button
              onClick={() => setConnectUrl(null)}
              aria-label="Close"
              style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: zp.radius.sm, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, cursor: "pointer", zIndex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={14} />
            </button>
            <iframe
              src={connectUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="camera; microphone"
              title="Bank connection widget"
            />
          </div>
        </div>
      )}

      {/* Fund sheet */}
      {funding && (
        <FundSheet
          connection={funding}
          merchantId={merchantId}
          accent={accent}
          onClose={() => setFunding(null)}
          onDone={async (msg) => { setFunding(null); await load(); setToast({ msg, tone: "success" }); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          onAnimationEnd={() => setTimeout(() => setToast(null), 300)}
          style={{
            position: "fixed", bottom: 24, right: 24,
            padding: "10px 14px", borderRadius: zp.radius.sm,
            background: "#0F172A", color: "#fff", boxShadow: zp.elevation.lg,
            fontSize: 13, fontWeight: zp.weight.semibold,
            zIndex: zp.zIndex.modal,
            borderLeft: `3px solid ${toast.tone === "success" ? zp.semantic.success : zp.semantic.danger}`,
          }}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} style={{ marginLeft: 12, background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ConnectionCard({
  c, accent, onSync, onDisconnect, onFund,
}: {
  c: BankConnection;
  accent: "cyan" | "pink" | "green" | "violet";
  onSync: () => void;
  onDisconnect: () => void;
  onFund: () => void;
}) {
  const synced = c.balance_synced_at
    ? relativeTime(c.balance_synced_at)
    : "—";
  return (
    <BankingCard accent={accent}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        {c.institution_logo_url ? (
          <div style={{ width: 40, height: 40, borderRadius: zp.radius.sm, overflow: "hidden", background: zp.surface.bg2, flexShrink: 0, position: "relative" }}>
            <Image
              src={c.institution_logo_url}
              alt={c.institution_name}
              fill
              sizes="40px"
              style={{ objectFit: "contain", padding: 4 }}
              unoptimized
            />
          </div>
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: zp.radius.sm, background: zp.surface.bg2, display: "inline-flex", alignItems: "center", justifyContent: "center", color: zp.text.muted, flexShrink: 0 }}>
            <Building2 size={18} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {c.institution_name}
          </div>
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>
            {capitalize(c.account_type)} · •••• {c.account_number_last4 ?? "----"}
          </div>
        </div>
        <span style={{ fontSize: 9, fontWeight: zp.weight.semibold, padding: "3px 8px", borderRadius: 999, background: zp.semantic.successBg, color: zp.semantic.success, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
          Linked
        </span>
      </div>

      <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary }}>
        {zp.fmtCurrency(Number(c.balance_synced ?? 0), c.currency || "CAD")}
      </div>
      <div style={{ fontSize: 11, color: zp.text.dim, marginTop: 4, fontFamily: zp.font.mono }}>
        Synced {synced}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" as const }}>
        <GradientButton size="sm" variant="primary" onClick={onFund}>
          Fund ZeniPay
        </GradientButton>
        <GradientButton size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={onSync}>
          Sync
        </GradientButton>
        <GradientButton size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={onDisconnect}>
          Disconnect
        </GradientButton>
      </div>
    </BankingCard>
  );
}

function FundSheet({
  connection, merchantId, accent, onClose, onDone,
}: {
  connection: BankConnection;
  merchantId: string;
  accent: "cyan" | "pink" | "green" | "violet";
  onClose: () => void;
  onDone: (msg: string) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const max = Number(connection.balance_synced ?? 0);
  const amountNum = Number(amount);

  const submit = async () => {
    setErr(null);
    if (!Number.isFinite(amountNum) || amountNum <= 0) { setErr("Enter an amount"); return; }
    if (amountNum > max) { setErr(`Max ${zp.fmtCurrency(max, connection.currency)}`); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/bank/fund", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          connection_id: connection.id,
          amount_units: amountNum,
          currency: connection.currency,
          memo: memo || undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Fund failed"); return; }
      await onDone(`Transfer initiated · ${zp.fmtCurrency(amountNum, connection.currency)} · 2–3 business days`);
    } finally { setBusy(false); }
  };

  const accentColor =
    accent === "pink"   ? zp.brand.pink   :
    accent === "green"  ? zp.brand.green  :
    accent === "violet" ? zp.brand.violet :
                          zp.brand.cyan;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: zp.surface.bg1, borderRadius: zp.radius.lg, padding: 22, boxShadow: zp.elevation.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Fund ZeniPay
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: zp.text.muted, cursor: "pointer" }}><X size={16} /></button>
        </div>

        <div style={{ fontSize: 12, color: zp.text.muted, marginBottom: 10 }}>
          From <strong style={{ color: zp.text.primary }}>{connection.institution_name}</strong> · •••• {connection.account_number_last4 ?? "----"}
        </div>
        <div style={{ fontSize: 12, color: zp.text.muted, marginBottom: 14 }}>
          To <strong style={{ color: zp.text.primary }}>ZeniPay Business Checking</strong>
        </div>

        <Label>Amount ({connection.currency})</Label>
        <input
          type="number" min={0} max={max} step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: zp.text.dim, marginTop: 4 }}>
          Available {zp.fmtCurrency(max, connection.currency)}
        </div>

        <Label style={{ marginTop: 12 }}>Memo (optional)</Label>
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Funding" style={inputStyle} />

        <div style={{ marginTop: 12, fontSize: 11, color: zp.text.dim, lineHeight: 1.5 }}>
          ACH transfer · typically 2–3 business days. The debit shows up on your bank statement tomorrow; the credit lands in ZeniPay on settlement.
        </div>

        {err && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
          <GradientButton
            variant="primary" size="md"
            onClick={submit} disabled={busy}
            style={{ flex: 1, background: accent === "pink" ? zp.gradient.personal : `linear-gradient(135deg, ${accentColor} 0%, ${zp.brand.violet} 100%)` }}
          >
            {busy ? "Transferring…" : "Transfer"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, ...style }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none",
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default BankConnectionsPanel;
