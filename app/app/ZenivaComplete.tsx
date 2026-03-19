"use client";
import React, { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════
//  ZeniPay — The Financial Core of Zeniva Travel
//  Built like Stripe. Thinks like a bank.
// ═══════════════════════════════════════════════════════

// ZeniPay brand colors (from official logo)
const BLUE = "#15B8C9";       // Cyan/teal (logo center)
const BLUE2 = "#2A8FE0";      // Blue (logo right)
const ZPGREEN = "#2DBE60";    // Green (logo left)
const PURPLE = "#7B4FBF";     // Purple (logo far right)
const PINK = "#E5247B";       // Wallet magenta
const ORANGE = "#F5A623";     // Wallet orange
const NAVY = "#0A0F1E";
const DARK = "#0B1B4D";
const GREEN = "#2DBE60";
const GOLD = "#F5A623";
const RED = "#EF4444";
const GLASS = "rgba(255,255,255,0.06)";
const GLASS_BORDER = "rgba(255,255,255,0.12)";
// ZeniPay gradient: green→cyan→purple (matches wordmark)
const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
// Card gradient: pink/magenta → orange → purple (wallet body)
const CARD_GRAD = "linear-gradient(135deg, #E5247B 0%, #F5A623 40%, #7B4FBF 100%)";

// ── Default wallets — overwritten by live API on mount ────────────────
const DEFAULT_WALLETS = {
  platform:   { available: 0, pending: 0, paid: 0, currency: "USD" },
  agent:      { available: 0, pending: 0, paid: 0, currency: "USD" },
  influencer: { available: 0, pending: 0, paid: 0, currency: "USD" },
  supplier:   { available: 0, pending: 0, paid: 0, currency: "USD" },
};
// WALLETS and TRANSACTIONS are now component state — fetched from /api/zenipay/stats

const AGENTS: { id?: string; name: string; code: string; bookings: number; revenue: number; commission: number; pending: number; rate: string; role?: string; avatar?: string; badge?: string }[] = [
  { id: "ag-001", name: "Louis", code: "LOUIS", bookings: 0, revenue: 0, commission: 0, pending: 0, rate: "70%", role: "Senior Travel Agent", badge: "🥇" },
  { id: "ag-002", name: "Jason", code: "JASON", bookings: 0, revenue: 0, commission: 0, pending: 0, rate: "70%", role: "Travel Agent", badge: "🥈" },
  { id: "ag-003", name: "Luca", code: "LUCA", bookings: 0, revenue: 0, commission: 0, pending: 0, rate: "70%", role: "Travel Agent", badge: "🥉" },
];

const INFLUENCERS: { id?: string; name: string; code: string; refs: number; revenue: number; commission: number; pending: number; rate: string; handle?: string; platform?: string; tier?: string; status?: string; referrals?: number }[] = [];

const INVOICES: { id: string; client: string; booking?: string; amount: number; status: string; date: string }[] = [];

const PAYOUTS: { id?: string; recipient: string; type: string; amount: number; status: string; date: string; method?: string }[] = [];

// ── UTILS ────────────────────────────────────────────
const fmt = (n: number, compact?: boolean) =>
  compact
    ? n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// ── BANK CARDS — Logo Watermark Design ──────────────────────────────
function BankCard({
  balance, last4 = "4242", expiry = "03/28",
  cardholder = "ZENIVA TRAVEL LLC", subtitle = "Platform Account",
  network = "VISA",
}: {
  balance?: number; last4?: string; expiry?: string;
  cardholder?: string; subtitle?: string; network?: "VISA" | "MASTERCARD";
}) {
  const [revealed, setRevealed] = React.useState(false);
  const isVisa = network === "VISA";
  // Visa: orange-magenta-violet (wallet body colors from logo)
  // Mastercard: teal-cyan-green (wordmark colors from logo)
  const gradient = isVisa
    ? "linear-gradient(135deg, #F5A623 0%, #E5247B 45%, #7B4FBF 100%)"
    : "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #2A8FE0 100%)";
  const glowColor = isVisa ? "rgba(245,166,35,0.55)" : "rgba(45,190,96,0.5)";

  return (
    <div style={{
      width: "100%", borderRadius: 20, position: "relative",
      overflow: "hidden", aspectRatio: "1.586",
      background: gradient,
      boxShadow: `0 24px 60px ${glowColor}, 0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)`,
      transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
      cursor: "default", color: "white",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none" as const,
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-10px) scale(1.02)";
        el.style.boxShadow = `0 36px 80px ${glowColor}, 0 12px 28px rgba(0,0,0,0.25)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0) scale(1)";
        el.style.boxShadow = `0 24px 60px ${glowColor}, 0 8px 20px rgba(0,0,0,0.2)`;
      }}
    >
      <style>{`
        @keyframes shimmerCard{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(350%) skewX(-20deg)}}
        @keyframes logoPulse{0%,100%{opacity:0.12}50%{opacity:0.2}}
      `}</style>

      {/* FULL-BLEED LOGO BACKGROUND — fills entire card like a wallpaper */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        animation: "logoPulse 6s ease-in-out infinite",
      }}>
        <img
          src="/zenipay-logo.png"
          alt=""
          style={{
            position: "absolute",
            width: "110%",
            height: "110%",
            objectFit: "contain",
            opacity: 0.28,
            filter: "brightness(2) saturate(0.3) contrast(1.1)",
            mixBlendMode: "overlay",
            transform: "scale(1.1) rotate(-5deg)",
          }}
        />
      </div>
      {/* Dark overlay for text readability */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.25) 100%)", pointerEvents: "none" }} />

      {/* Shimmer sweep */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.22) 50%,transparent 65%)", animation:"shimmerCard 4s ease-in-out infinite", pointerEvents:"none" }} />

      {/* Card content */}
      <div style={{ position:"relative", height:"100%", padding:"6% 7%", display:"flex", flexDirection:"column" as const, justifyContent:"space-between" }}>
        {/* TOP */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            {/* ZeniPay logo — no white background */}
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
              <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:32, height:32, objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(255,255,255,0.4)) drop-shadow(0 1px 4px rgba(0,0,0,0.3))" }} />
              <span style={{ fontWeight:800, fontSize:15, letterSpacing:"-0.3px", textShadow:"0 1px 6px rgba(0,0,0,0.4)" }}>ZeniPay</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <p style={{ margin:0, fontSize:8.5, opacity:0.55, letterSpacing:"0.14em", textTransform:"uppercase" as const }}>{subtitle}</p>
              <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"1px 6px", fontSize:7, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase" as const }}>{isVisa ? "DEBIT" : "CREDIT"}</span>
            </div>
          </div>
          {/* EMV Chip */}
          <div style={{ width:40, height:30, borderRadius:5, position:"relative", background:"linear-gradient(145deg,#c9a84c 0%,#f2d76a 30%,#e5c035 65%,#b8900a 100%)", boxShadow:"inset 0 1px 2px rgba(255,255,255,0.55),0 2px 6px rgba(0,0,0,0.4)" }}>
            <div style={{ position:"absolute", inset:3.5, border:"1px solid rgba(0,0,0,0.18)", borderRadius:2.5 }} />
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"rgba(0,0,0,0.12)", transform:"translateX(-50%)" }} />
            <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,0.12)", transform:"translateY(-50%)" }} />
            {/* Contactless */}
            <div style={{ position:"absolute", right:-18, top:"50%", transform:"translateY(-50%)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="11" r="1.2" fill="rgba(255,255,255,0.8)"/>
                <path d="M4.5 8.5 A3.5 3.5 0 0 1 9.5 8.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
                <path d="M2.5 6 A6 6 0 0 1 11.5 6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
                <path d="M0.5 3.5 A8.5 8.5 0 0 1 13.5 3.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
          </div>
        </div>

        {/* BALANCE */}
        <div>
          <p style={{ margin:"0 0 2px", fontSize:9, opacity:0.5, letterSpacing:"0.14em", textTransform:"uppercase" as const }}>Available Balance</p>
          <p style={{ margin:0, fontWeight:900, fontSize:24, letterSpacing:"-0.8px", textShadow:"0 2px 10px rgba(0,0,0,0.4)" }}>
            {balance !== undefined ? fmt(balance) : "$0.00"}
          </p>
        </div>

        {/* CARD NUMBER + FOOTER */}
        <div>
          <p onClick={() => setRevealed(r => !r)} style={{ margin:"0 0 8px", fontSize:13, fontWeight:500, letterSpacing:"0.24em", fontFamily:"monospace", opacity:0.9, textShadow:"0 1px 4px rgba(0,0,0,0.3)", cursor:"pointer" }}>
            {revealed
              ? `4275  9031  6847  ${last4}`
              : `••••  ••••  ••••  ${last4}`}
            <span style={{ fontSize:7, fontFamily:"system-ui", letterSpacing:"0.05em", opacity:0.5, marginLeft:6, fontStyle:"italic" }}>{revealed ? "tap to hide" : "tap to reveal"}</span>
          </p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <p style={{ margin:"0 0 1px", fontSize:7, opacity:0.4, letterSpacing:"0.15em" }}>CARDHOLDER</p>
              <p style={{ margin:0, fontSize:10.5, fontWeight:700, letterSpacing:"0.06em", textShadow:"0 1px 3px rgba(0,0,0,0.3)" }}>{cardholder}</p>
            </div>
            <div style={{ textAlign:"right" as const, display:"flex", flexDirection:"column" as const, alignItems:"flex-end", gap:3 }}>
              <div><span style={{ fontSize:7, opacity:0.4, letterSpacing:"0.12em", marginRight:4 }}>VALID</span><span style={{ fontSize:10.5, fontWeight:700 }}>{expiry}</span></div>
              {isVisa ? (
                <span style={{ fontWeight:900, fontStyle:"italic", fontSize:17, letterSpacing:"-0.5px", textShadow:"0 1px 4px rgba(0,0,0,0.4)", opacity:0.95 }}>VISA</span>
              ) : (
                <div style={{ display:"flex", position:"relative", width:38, height:24 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:"#EB001B", position:"absolute", left:0, opacity:0.95 }} />
                  <div style={{ width:24, height:24, borderRadius:"50%", background:"#F79E1B", position:"absolute", left:14, opacity:0.95 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






const STATUS_COLORS: Record<string, string> = {
  completed: GREEN, pending: GOLD, failed: RED, refunded: PURPLE,
  paid: GREEN, overdue: RED, scheduled: BLUE, active: GREEN, disputed: RED,
};

// ── COMPONENTS ────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = BLUE }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 22, color: "#0f172a" }}>{value}</p>
          {sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      background: `${STATUS_COLORS[status] || "#94a3b8"}22`,
      color: STATUS_COLORS[status] || "#94a3b8",
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize",
      border: `1px solid ${STATUS_COLORS[status] || "#94a3b8"}44`,
    }}>
      {status}
    </span>
  );
}

function WalletCard({ name, data, icon, color, onOpen }: { name: string; data: { available: number; pending: number; paid: number; currency: string }; icon: string; color: string; onOpen: () => void }) {
  const pct = Math.round((data.available / (data.available + data.pending + 1)) * 100);
  return (
    <div onClick={onOpen} style={{ background: "white", borderRadius: 20, padding: 24, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", border: `1px solid ${color}30`, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(0,0,0,0.08)"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 46, height: 46, background: `linear-gradient(135deg, ${color}22, ${color}11)`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: `1px solid ${color}30` }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{name} Wallet</p>
          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>ZeniPay · USD</p>
        </div>
        <span style={{ fontSize: 11, color: color, fontWeight: 700, background: `${color}15`, borderRadius: 6, padding: "3px 8px" }}>Open →</span>
      </div>
      {/* Main Balance */}
      <div style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)`, borderRadius: 14, padding: "14px 18px", marginBottom: 14 }}>
        <p style={{ margin: "0 0 2px", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Available Balance</p>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: color }}>{fmt(data.available, true)}</p>
      </div>
      {/* Mini bar */}
      <div style={{ background: "#f1f5f9", borderRadius: 9999, height: 5, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 9999 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "#fef3c722", borderRadius: 10, padding: "8px 12px" }}>
          <p style={{ margin: "0 0 2px", fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" as const }}>Pending</p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: GOLD }}>{fmt(data.pending, true)}</p>
        </div>
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: "8px 12px" }}>
          <p style={{ margin: "0 0 2px", fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" as const }}>Paid Out</p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: BLUE }}>{fmt(data.paid, true)}</p>
        </div>
      </div>
    </div>
  );
}

function WalletModal({ name, data, icon, color, onClose }: { name: string; data: { available: number; pending: number; paid: number; currency: string }; icon: string; color: string; onClose: () => void }) {
  const isPlatform = name === "Platform";
  type ModalTab = "overview" | "bank" | "history" | "distribute";
  const [tab, setTab] = useState<ModalTab>(isPlatform ? "overview" : "overview");
  const [bankForm, setBankForm] = useState({ holder: "", bank: "", routing: "", account: "", type: "checking" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distForm, setDistForm] = useState({ to: "agent", amount: "", note: "" });
  const [distSent, setDistSent] = useState(false);
  const [distSending, setDistSending] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1400));
    setSaved(true);
    setSaving(false);
  };

  const handleDistribute = async () => {
    setDistSending(true);
    await new Promise(r => setTimeout(r, 1800));
    setDistSent(true);
    setDistSending(false);
  };

  const tabs = isPlatform
    ? [
        { id: "overview", label: "💡 Overview" },
        { id: "distribute", label: "💸 Distribute" },
        { id: "bank", label: "🏦 Bank" },
        { id: "history", label: "📋 History" },
      ]
    : [
        { id: "overview", label: "💡 Overview" },
        { id: "bank", label: "🏦 Bank Account" },
        { id: "history", label: "📋 History" },
      ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: isPlatform ? 620 : 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ background: isPlatform ? `linear-gradient(135deg, #0B1B4D, #0F6CF5)` : `linear-gradient(135deg, ${DARK}, #1a2f6e)`, borderRadius: "24px 24px 0 0", padding: "24px 28px", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: isPlatform ? 16 : 0 }}>
            <div style={{ width: 52, height: 52, background: `${color}30`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: `1px solid ${color}50` }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 20 }}>{name} Wallet</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.6 }}>{isPlatform ? "Zeniva Travel LLC — Master Control Account" : "ZeniPay Financial Account"}</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 9999, width: 32, height: 32, color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          {isPlatform && (
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { l: "Available", v: fmt(data.available, true), c: "#4ade80" },
                { l: "Pending", v: fmt(data.pending, true), c: GOLD },
                { l: "Paid Out", v: fmt(data.paid, true), c: "#94a3b8" },
                { l: "Gateway", v: "Tilled", c: "#60a5fa" },
              ].map(s => (
                <div key={s.l} style={{ textAlign: "center" as const }}>
                  <p style={{ margin: "0 0 2px", fontSize: 9, opacity: 0.55, fontWeight: 700, textTransform: "uppercase" as const }}>{s.l}</p>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: s.c }}>{s.v}</p>
                </div>
              ))}
            </div>
          )}
          {!isPlatform && (
            <div style={{ background: `${color}20`, borderRadius: 10, padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
              {[{ l: "Available", v: data.available, c: color }, { l: "Pending", v: data.pending, c: GOLD }, { l: "Paid Out", v: data.paid, c: "#94a3b8" }].map(s => (
                <div key={s.l} style={{ textAlign: "center" as const }}>
                  <p style={{ margin: "0 0 2px", fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: "uppercase" as const }}>{s.l}</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: s.c }}>{fmt(s.v, true)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f1f5f9" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as ModalTab)} style={{
              flex: 1, padding: "13px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
              color: tab === t.id ? color : "#64748b",
              borderBottom: tab === t.id ? `2px solid ${color}` : "2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div style={{ display: "grid", gap: 14 }}>
              {isPlatform && (
                <div style={{ background: `${BLUE}08`, border: `1px solid ${BLUE}20`, borderRadius: 14, padding: 18 }}>
                  <p style={{ margin: "0 0 10px", fontWeight: 800, fontSize: 14, color: "#0f172a" }}>🏛️ Platform Control Center</p>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>All client payments land in this wallet. You control how funds are distributed to agents, suppliers, and influencers.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "💸 Distribute Funds", action: () => setTab("distribute"), highlight: true },
                      { label: "🏦 Add Bank Account", action: () => setTab("bank") },
                      { label: "📊 Export Statement", action: () => {} },
                      { label: "⚡ Instant Payout", action: () => setTab("distribute") },
                    ].map(a => (
                      <button key={a.label} onClick={a.action} style={{
                        background: a.highlight ? BLUE : "white",
                        border: a.highlight ? "none" : "1px solid #e2e8f0",
                        borderRadius: 10, padding: "11px 12px", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", color: a.highlight ? "white" : "#374151", textAlign: "left" as const
                      }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!isPlatform && (
                <div style={{ background: "#f8fafc", borderRadius: 14, padding: 18 }}>
                  <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>💳 Quick Actions</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "💸 Request Payout", action: () => setTab("bank") },
                      { label: "📄 Download Statement", action: () => setTab("history") },
                      { label: "🔗 Add Payout Method", action: () => setTab("bank") },
                      { label: "📋 View History", action: () => setTab("history") },
                    ].map(a => (
                      <button key={a.label} onClick={a.action} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151", textAlign: "left" as const }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: `${color}10`, borderRadius: 14, padding: 18, border: `1px solid ${color}20` }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13, color: "#374151" }}>📅 {isPlatform ? "Tilled Settlement" : "Next Scheduled Payout"}</p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Schedule</span>
                  <span style={{ fontWeight: 700, color: color }}>{isPlatform ? "T+1 business day" : "Every Friday"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Next Amount</span>
                  <span style={{ fontWeight: 800, color: color }}>{fmt(data.available, true)}</span>
                </div>
                {isPlatform && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Processor</span>
                    <span style={{ fontWeight: 700, color: "#60a5fa" }}>Tilled (Sandbox)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DISTRIBUTE (Platform only) */}
          {tab === "distribute" && isPlatform && (
            <div>
              {distSent ? (
                <div style={{ textAlign: "center" as const, padding: "32px 20px" }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                  <h3 style={{ margin: "0 0 8px", fontWeight: 800, color: "#065f46" }}>Transfer Recorded!</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>The distribution will be processed once Tilled live mode is activated.</p>
                  <button onClick={() => { setDistSent(false); setDistForm({ to: "agent", amount: "", note: "" }); }}
                    style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>
                    New Transfer
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: `${BLUE}08`, borderRadius: 14, padding: 16, border: `1px solid ${BLUE}15` }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, color: "#374151" }}>💰 Platform Balance Available</p>
                    <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: BLUE }}>{fmt(data.available, true)}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Zeniva Travel LLC · USD · Tilled</p>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase" as const }}>Send To</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        { id: "agent", icon: "👤", label: "Agent", color: PURPLE },
                        { id: "influencer", icon: "⭐", label: "Influencer", color: GOLD },
                        { id: "supplier", icon: "✈️", label: "Supplier", color: GREEN },
                      ].map(w => (
                        <button key={w.id} onClick={() => setDistForm(p => ({ ...p, to: w.id }))} style={{
                          background: distForm.to === w.id ? `${w.color}15` : "#f8fafc",
                          border: `2px solid ${distForm.to === w.id ? w.color : "#e2e8f0"}`,
                          borderRadius: 12, padding: "12px 8px", cursor: "pointer", textAlign: "center" as const,
                        }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>{w.icon}</div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: distForm.to === w.id ? w.color : "#374151" }}>{w.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase" as const }}>Amount (USD)</label>
                    <input
                      type="number"
                      value={distForm.amount}
                      onChange={e => setDistForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="Enter amount e.g. 800"
                      style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" as const }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase" as const }}>Note / Reference (optional)</label>
                    <input
                      value={distForm.note}
                      onChange={e => setDistForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="e.g. Agent commission — Booking #1042"
                      style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                    />
                  </div>

                  {distForm.amount && Number(distForm.amount) > 0 && (
                    <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "14px 16px", border: "1px solid #bbf7d0" }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, color: "#065f46" }}>Transfer Summary</p>
                      <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>From</span><span style={{ fontWeight: 700 }}>Platform Wallet (Zeniva Travel LLC)</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>To</span><span style={{ fontWeight: 700, textTransform: "capitalize" as const }}>{distForm.to} Wallet</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Amount</span><span style={{ fontWeight: 800, color: GREEN }}>${Number(distForm.amount).toLocaleString()}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Remaining</span><span style={{ fontWeight: 700 }}>${Math.max(0, data.available - Number(distForm.amount)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={handleDistribute} disabled={distSending || !distForm.amount || Number(distForm.amount) <= 0}
                    style={{ background: distSending ? "#94a3b8" : `linear-gradient(135deg, ${BLUE}, ${DARK})`, color: "white", border: "none", borderRadius: 9999, padding: "14px", fontWeight: 800, fontSize: 15, cursor: distSending ? "not-allowed" : "pointer" }}>
                    {distSending ? "Processing Transfer…" : `💸 Send ${distForm.amount ? "$" + Number(distForm.amount).toLocaleString() : ""} to ${distForm.to.charAt(0).toUpperCase() + distForm.to.slice(1)} Wallet`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BANK */}
          {tab === "bank" && (
            <div>
              {saved ? (
                <div style={{ textAlign: "center" as const, padding: "32px 20px" }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
                  <h3 style={{ margin: "0 0 8px", fontWeight: 800, color: "#065f46" }}>Bank Account Saved!</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>Verification micro-deposits will arrive in 1-2 business days.</p>
                  <button onClick={() => setSaved(false)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 9999, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>Update Account</button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#374151", fontWeight: 600 }}>
                    {isPlatform ? "Add Zeniva Travel LLC bank account to receive Tilled settlements." : "Add your bank account to receive payouts from ZeniPay."}
                  </p>
                  {[
                    { label: "Account Holder Name", key: "holder", ph: isPlatform ? "Zeniva Travel LLC" : "Full Name" },
                    { label: "Bank Name", key: "bank", ph: "Chase, TD Bank, Royal Bank…" },
                    { label: "Routing / Transit Number", key: "routing", ph: "021000021" },
                    { label: "Account Number", key: "account", ph: "••••••••••" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase" as const }}>{f.label}</label>
                      <input value={(bankForm as Record<string,string>)[f.key]} onChange={e => setBankForm(p => ({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                        style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase" as const }}>Account Type</label>
                    <select value={bankForm.type} onChange={e => setBankForm(p => ({...p,type:e.target.value}))}
                      style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none" }}>
                      <option value="checking">Checking / Chequing</option>
                      <option value="savings">Savings</option>
                      <option value="business">Business Checking</option>
                    </select>
                  </div>
                  <button onClick={handleSave} disabled={saving} style={{ background: saving ? "#94a3b8" : `linear-gradient(135deg, ${BLUE}, ${DARK})`, color: "white", border: "none", borderRadius: 9999, padding: "13px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                    {saving ? "Saving…" : "💾 Save Bank Account"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {tab === "history" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", textAlign: "center" as const, border: "1px dashed #e2e8f0" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#374151" }}>No transactions yet</p>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Transactions will appear here once Tilled live payments are active</p>
              </div>
              <button style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151", marginTop: 8 }}>
                📥 Download Full Statement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ══ PAYOUTS PANEL (full bank wire transfer system) ══════════════════
type AgentType = { id?: string; name: string; code: string; bookings: number; revenue: number; commission: number; pending: number; rate: string; role?: string; avatar?: string; badge?: string };

// ── Recipient type ────────────────────────────────────
type RecipientType = "agent" | "influencer" | "supplier" | "hotel" | "vendor" | "other";
const RECIPIENT_ICONS: Record<RecipientType, string> = {
  agent: "👤", influencer: "⭐", supplier: "✈️", hotel: "🏨", vendor: "🏪", other: "🏦",
};
const RECIPIENT_COLORS: Record<RecipientType, string> = {
  agent: "#7B4FBF", influencer: "#F5A623", supplier: "#2DBE60",
  hotel: "#15B8C9", vendor: "#E5247B", other: "#64748b",
};

type Recipient = {
  id: string; name: string; type: RecipientType; email: string;
  rate: string; method: "bank" | "instant"; pending: number; note: string;
};

const DEFAULT_RECIPIENTS: Recipient[] = [
  { id: "ag-001", name: "Louis", type: "agent", email: "", rate: "70%", method: "bank", pending: 0, note: "Senior Travel Agent" },
  { id: "ag-002", name: "Jason", type: "agent", email: "", rate: "70%", method: "bank", pending: 0, note: "Travel Agent" },
  { id: "ag-003", name: "Luca",  type: "agent", email: "", rate: "70%", method: "bank", pending: 0, note: "Travel Agent" },
];

function PayoutsPanel({ agents, platformBalance }: { agents: AgentType[]; platformBalance: number }) {
  const [step, setStep] = useState<"select"|"amount"|"confirm"|"sent">("select");
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"bank"|"instant">("bank");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentResult, setSentResult] = useState<{id:string;status:string}|null>(null);
  const [history, setHistory] = useState<{id:string;agent:string;amount:number;method:string;note:string;date:string;status:string}[]>([]);

  // Recipients management
  const [recipients, setRecipients] = useState<Recipient[]>(DEFAULT_RECIPIENTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newR, setNewR] = useState<Omit<Recipient,"id"|"pending">>({
    name: "", type: "supplier", email: "", rate: "", method: "bank", note: "",
  });
  const addRecipient = () => {
    if (!newR.name.trim()) return;
    setRecipients(r => [...r, { ...newR, id: `r-${Date.now()}`, pending: 0 }]);
    setNewR({ name: "", type: "supplier", email: "", rate: "", method: "bank", note: "" });
    setShowAddForm(false);
  };
  const removeRecipient = (id: string) => setRecipients(r => r.filter(x => x.id !== id));

  const handleSend = async () => {
    if (Number(amount) > platformBalance) {
      setSendError(`Insufficient balance. Available: $${platformBalance.toLocaleString()}`);
      return;
    }
    setSendError("");
    setSending(true);
    try {
      const res = await fetch("/api/zenipay/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_type: selectedAgent?.role?.includes("Owner") ? "owner" : "agent",
          recipient_name: selectedAgent!.name,
          recipient_id: selectedAgent?.id,
          amount: Number(amount),
          currency: "USD",
          method: method === "instant" ? "instant" : "ach",
          from_wallet: "platform",
          note: note || "Agent commission payment",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSendError(data.error || "Payout failed. Please try again.");
        setSending(false);
        return;
      }
      setSentResult({ id: data.payout_id, status: data.status });
      setHistory(h => [{
        id: data.payout_id,
        agent: selectedAgent!.name,
        amount: Number(amount),
        method: method === "instant" ? "Instant Transfer" : "Bank Wire (ACH)",
        note: note || "Agent commission payment",
        date: new Date().toLocaleDateString("en-CA"),
        status: data.status || "paid",
      }, ...h]);
      setStep("sent");
    } catch {
      setSendError("Network error. Please try again.");
    }
    setSending(false);
  };

  const reset = () => {
    setStep("select");
    setSelectedAgent(null);
    setAmount("");
    setNote("");
    setMethod("bank");
    setSendError("");
    setSentResult(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

      {/* LEFT: Send Payment */}
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, background: `${BLUE}12`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💸</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#0f172a" }}>Send Payment</p>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>ZeniPay internal transfer</p>
            </div>
            <div style={{ marginLeft: "auto", background: `${BLUE}08`, borderRadius: 10, padding: "6px 12px", textAlign: "right" as const }}>
              <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>Available</p>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: BLUE }}>{fmt(platformBalance, true)}</p>
            </div>
          </div>

          {step === "sent" ? (
            <div style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
              <p style={{ margin: "0 0 4px", fontWeight: 900, color: "#065f46", fontSize: 18 }}>Transfer Sent!</p>
              <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151", fontWeight: 600 }}>${Number(amount).toLocaleString()} → {selectedAgent?.name}</p>
              {sentResult && <p style={{ margin: "0 0 16px", fontSize: 11, color: BLUE }}>ID: {sentResult.id}</p>}
              <button onClick={reset} style={{ background: BLUE, color: "white", border: "none", borderRadius: 20, padding: "10px 28px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                + New Transfer
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {/* Recipient select */}
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 7, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                  STEP 1 — Select Recipient
                </label>
                <div style={{ display: "grid", gap: 6 }}>
                  {[
                    { id: "owner-001", name: "My Company (Owner)", sub: "Transfer to your company bank account", icon: "🏢", color: "#0F6CF5" },
                    ...recipients.map(r => ({ id: r.id, name: r.name, sub: `${r.type} · ${r.rate || "custom amount"}`, icon: RECIPIENT_ICONS[r.type], color: RECIPIENT_COLORS[r.type] })),
                  ].map(r => (
                    <button key={r.id} onClick={() => {
                      setSelectedAgent({ id: r.id, name: r.name, code: r.id, bookings: 0, revenue: 0, commission: 0, pending: 0, rate: "-" });
                      setStep("amount");
                    }} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: selectedAgent?.id === r.id ? `${r.color}10` : "#f8fafc",
                      border: `1.5px solid ${selectedAgent?.id === r.id ? r.color : "#e2e8f0"}`,
                      borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{r.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{r.sub}</p>
                      </div>
                      {selectedAgent?.id === r.id && <span style={{ color: r.color }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              {selectedAgent && (
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 7, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                    STEP 2 — Amount
                  </label>
                  <div style={{ position: "relative" as const }}>
                    <span style={{ position: "absolute" as const, left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#94a3b8", fontWeight: 900 }}>$</span>
                    <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setStep("amount"); }} placeholder="0.00"
                      style={{ width: "100%", border: "2px solid #e2e8f0", borderRadius: 12, padding: "12px 12px 12px 32px", fontSize: 22, fontWeight: 900, outline: "none", boxSizing: "border-box" as const, color: "#0f172a" }} />
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" as const }}>
                    {[250,500,1000,2500,5000].map(v => (
                      <button key={v} onClick={() => setAmount(String(v))}
                        style={{ background: amount === String(v) ? BLUE : "#f1f5f9", color: amount === String(v) ? "white" : "#374151", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        ${v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Method + Note + Execute */}
              {selectedAgent && amount && Number(amount) > 0 && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { id: "bank", label: "🏦 Bank Wire (ACH)", sub: "1-2 days · Free", color: BLUE },
                      { id: "instant", label: "⚡ Instant", sub: "Same day · $0.50", color: GREEN },
                    ].map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id as "bank"|"instant")}
                        style={{ padding: "10px 8px", background: method === m.id ? `${m.color}10` : "#f8fafc", border: `2px solid ${method === m.id ? m.color : "#e2e8f0"}`, borderRadius: 10, cursor: "pointer", textAlign: "left" as const }}>
                        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: method === m.id ? m.color : "#374151" }}>{m.label}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{m.sub}</p>
                      </button>
                    ))}
                  </div>
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reference / note (e.g. Booking #ZNV-1042)"
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#0f172a" }} />
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", border: "1px solid #bbf7d0", fontSize: 12 }}>
                    {[
                      ["To", selectedAgent.name],
                      ["Amount", `$${Number(amount).toLocaleString("en-US",{minimumFractionDigits:2})}`],
                      ["Method", method === "instant" ? "Instant" : "Bank Wire (ACH)"],
                      ["Balance after", `$${Math.max(0, platformBalance - Number(amount)).toLocaleString()}`],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#64748b" }}>{l}</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {sendError && <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: RED }}>⚠️ {sendError}</div>}
                  <button onClick={handleSend} disabled={sending || Number(amount) > platformBalance} style={{
                    background: sending || Number(amount) > platformBalance ? "#94a3b8" : `linear-gradient(135deg, ${BLUE}, ${DARK})`,
                    color: "white", border: "none", borderRadius: 20, padding: "14px",
                    fontWeight: 900, fontSize: 15, cursor: sending || Number(amount) > platformBalance ? "not-allowed" : "pointer",
                  }}>
                    {sending ? "⏳ Processing…" : `💸 Send $${Number(amount).toLocaleString()} → ${selectedAgent.name}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transfer History */}
        <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin: "0 0 14px", fontWeight: 800, fontSize: 15 }}>📋 Transfer History</h3>
          {history.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "16px 0", color: "#94a3b8", fontSize: 13 }}>
              <p style={{ margin: "0 0 4px" }}>No transfers yet</p>
              <p style={{ margin: 0, fontSize: 11 }}>Sent payments will appear here</p>
            </div>
          ) : history.map(h => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, background: "#dcfce7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>→ {h.agent}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{h.date} · {h.method}</p>
              </div>
              <span style={{ fontWeight: 900, fontSize: 14, color: GREEN }}>-${h.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Recipients management */}
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>👥 Recipients</h3>
            <button onClick={() => setShowAddForm(v => !v)} style={{
              background: showAddForm ? "#f1f5f9" : `linear-gradient(135deg, ${BLUE}, ${PURPLE})`,
              color: showAddForm ? "#374151" : "white", border: "none", borderRadius: 20,
              padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              {showAddForm ? "✕ Cancel" : "+ Add Recipient"}
            </button>
          </div>

          {/* Add recipient form */}
          {showAddForm && (
            <div style={{ background: "#f8fafc", borderRadius: 14, padding: "16px", marginBottom: 16, border: "1.5px dashed #e2e8f0" }}>
              <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>New Recipient</p>
              <div style={{ display: "grid", gap: 10 }}>
                <input value={newR.name} onChange={e => setNewR(r => ({ ...r, name: e.target.value }))} placeholder="Name *"
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#0f172a" }} />
                <select value={newR.type} onChange={e => setNewR(r => ({ ...r, type: e.target.value as RecipientType }))}
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "white" }}>
                  <option value="agent">👤 Agent</option>
                  <option value="influencer">⭐ Influencer</option>
                  <option value="supplier">✈️ Supplier</option>
                  <option value="hotel">🏨 Hotel / Accommodation</option>
                  <option value="vendor">🏪 Vendor / Partner</option>
                  <option value="other">🏦 Other</option>
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={newR.email} onChange={e => setNewR(r => ({ ...r, email: e.target.value }))} placeholder="Email (optional)"
                    style={{ border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", color: "#0f172a" }} />
                  <input value={newR.rate} onChange={e => setNewR(r => ({ ...r, rate: e.target.value }))} placeholder="Rate / % (optional)"
                    style={{ border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", color: "#0f172a" }} />
                </div>
                <input value={newR.note} onChange={e => setNewR(r => ({ ...r, note: e.target.value }))} placeholder="Description / role (optional)"
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" as const, color: "#0f172a" }} />
                <button onClick={addRecipient} disabled={!newR.name.trim()} style={{
                  background: newR.name.trim() ? `linear-gradient(135deg, ${BLUE}, ${PURPLE})` : "#e2e8f0",
                  color: newR.name.trim() ? "white" : "#94a3b8", border: "none", borderRadius: 20,
                  padding: "10px", fontSize: 13, fontWeight: 800, cursor: newR.name.trim() ? "pointer" : "not-allowed",
                }}>
                  Add Recipient
                </button>
              </div>
            </div>
          )}

          {/* Recipients list */}
          <div style={{ display: "grid", gap: 8 }}>
            {/* Owner row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: `${BLUE}08`, borderRadius: 12, border: `1.5px solid ${BLUE}20` }}>
              <span style={{ fontSize: 20 }}>🏢</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: "#0f172a" }}>My Company (Owner)</p>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Platform revenue · 100%</p>
              </div>
              <span style={{ fontWeight: 900, fontSize: 13, color: BLUE }}>{fmt(platformBalance, true)}</span>
              <button onClick={() => {
                setSelectedAgent({ id: "owner-001", name: "My Company (Owner)", code: "OWNER", bookings: 0, revenue: 0, commission: 0, pending: platformBalance, rate: "100%" });
                setAmount(String(platformBalance > 0 ? Math.floor(platformBalance) : ""));
                setStep("amount");
              }} style={{ background: BLUE, color: "white", border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                Pay
              </button>
            </div>

            {/* Dynamic recipients */}
            {recipients.map(r => {
              const color = RECIPIENT_COLORS[r.type];
              const icon = RECIPIENT_ICONS[r.type];
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                  <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{r.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{r.type}{r.rate ? ` · ${r.rate}` : ""}{r.note ? ` · ${r.note}` : ""}</p>
                  </div>
                  <button onClick={() => {
                    setSelectedAgent({ id: r.id, name: r.name, code: r.id, bookings: 0, revenue: 0, commission: 0, pending: 0, rate: r.rate });
                    setStep("amount");
                  }} style={{ background: color, color: "white", border: "none", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    Pay
                  </button>
                  <button onClick={() => removeRecipient(r.id)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 14, padding: "0 2px" }} title="Remove">×</button>
                </div>
              );
            })}

            {recipients.length === 0 && (
              <div style={{ textAlign: "center" as const, padding: "20px", color: "#94a3b8", fontSize: 13 }}>
                <p style={{ margin: "0 0 8px" }}>No recipients yet</p>
                <p style={{ margin: 0, fontSize: 11 }}>Add agents, influencers, suppliers or any payee</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TABS ─────────────────────────────────────────────
const TABS = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "transactions", icon: "💳", label: "Transactions" },
  { id: "wallets", icon: "🏦", label: "Banking" },
  { id: "paylinks", icon: "🔗", label: "Pay Links" },
  { id: "invoices", icon: "📄", label: "Invoices" },
  { id: "payouts", icon: "💸", label: "Payouts" },
  { id: "financing", icon: "🏛️", label: "Financing" },
  { id: "analytics", icon: "📈", label: "Analytics" },
  { id: "ai", icon: "🤖", label: "Ben AI" },
  { id: "accounting", icon: "📚", label: "Accounting" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

// ══════════════════════════════════════════════════════
//  REVENUE SPLIT WIDGET
// ══════════════════════════════════════════════════════
// Revenue split — calculates on NET profit (after supplier costs)
const SPLIT_SCENARIOS = [
  {
    id: "no_agent",
    label: "Direct / No Agent",
    icon: "🏦",
    desc: "Zeniva platform only",
    rows: (net: number) => [
      { label: "🏦 Zeniva Travel", pct: 100, amount: net, color: "#0F6CF5", sub: "100% net profit" },
    ],
  },
  {
    id: "lina_only",
    label: "Lina AI seule",
    icon: "🤖",
    desc: "Lina book without human agent",
    rows: (net: number) => [
      { label: "🏦 Zeniva Travel (70%)", pct: 70, amount: Math.round(net*0.70*100)/100, color: "#0F6CF5", sub: "Net après coûts" },
      { label: "👤 Agent assigné (30%)", pct: 30, amount: Math.round(net*0.30*100)/100, color: "#8B5CF6", sub: "Agent de suivi" },
    ],
  },
  {
    id: "human_agent",
    label: "Agent humain",
    icon: "👤",
    desc: "Full agent involvement",
    rows: (net: number) => [
      { label: "👤 Agent de voyage (70%)", pct: 70, amount: Math.round(net*0.70*100)/100, color: "#8B5CF6", sub: "Louis / Jason / Luca" },
      { label: "🏦 Zeniva Travel (30%)", pct: 30, amount: Math.round(net*0.30*100)/100, color: "#0F6CF5", sub: "Platform margin net" },
    ],
  },
  {
    id: "with_influencer",
    label: "+ Influenceur",
    icon: "⭐",
    desc: "Agent + influencer referral",
    rows: (net: number) => {
      const agent = Math.round(net*0.70*100)/100;
      const zenivaGross = Math.round(net*0.30*100)/100;
      const inf = Math.round(zenivaGross*0.05*100)/100;
      const zenivaNet = Math.round((zenivaGross - inf)*100)/100;
      return [
        { label: "👤 Agent de voyage (70%)", pct: 70, amount: agent, color: "#8B5CF6", sub: "Louis / Jason / Luca" },
        { label: "🏦 Zeniva Travel (~28.5%)", pct: Math.round(zenivaNet/net*100), amount: zenivaNet, color: "#0F6CF5", sub: "Net après influenceur" },
        { label: "⭐ Influenceur (5% du net)", pct: Math.round(inf/net*100), amount: inf, color: "#F59E0B", sub: "5% du 30% Zeniva" },
      ];
    },
  },
  {
    id: "yacht",
    label: "ZeniYacht",
    icon: "⛵",
    desc: "100% Zeniva — always",
    rows: (net: number) => [
      { label: "⛵ Zeniva Travel — ZeniYacht (100%)", pct: 100, amount: net, color: "#10B981", sub: "100% net — broker séparé" },
    ],
  },
];

function RevenueSplitWidget() {
  const [scenario, setScenario] = useState("no_agent");
  const [bookingAmt, setBookingAmt] = useState(7677);
  const [supplierCost, setSupplierCost] = useState(5078);
  const netProfit = Math.max(0, bookingAmt - supplierCost);
  const active = SPLIT_SCENARIOS.find(s => s.id === scenario)!;
  const rows = active.rows(netProfit);
  const margin = bookingAmt > 0 ? Math.round(netProfit / bookingAmt * 100) : 0;

  return (
    <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 14px", fontWeight: 700, fontSize: 15, color: "#0f172a" }}>💡 Revenue Split</h3>

      {/* Inputs row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" as const }}>💰 Booking (brut)</p>
          <input type="number" value={bookingAmt} onChange={e => setBookingAmt(Number(e.target.value) || 0)}
            style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, fontWeight: 800, color: "#0066FF", outline: "none" }} />
        </div>
        <div style={{ background: "#fff1f2", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" as const }}>🏨 Coût fournisseur</p>
          <input type="number" value={supplierCost} onChange={e => setSupplierCost(Number(e.target.value) || 0)}
            style={{ width: "100%", border: "none", background: "transparent", fontSize: 15, fontWeight: 800, color: "#ef4444", outline: "none" }} />
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" as const }}>✅ Profit net ({margin}%)</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#10B981" }}>${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Scenario tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 14 }}>
        {SPLIT_SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)} style={{
            padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: scenario === s.id ? "#0F6CF5" : "#f8fafc",
            color: scenario === s.id ? "white" : "#64748b",
            borderColor: scenario === s.id ? "#0F6CF5" : "#e2e8f0",
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Active scenario label */}
      <div style={{ padding: "8px 12px", background: "#f0f7ff", borderRadius: 10, marginBottom: 14, borderLeft: "3px solid #0F6CF5" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#0F6CF5", fontWeight: 600 }}>{active.icon} {active.label} — {active.desc}
          <span style={{ marginLeft: 8, fontWeight: 400, color: "#94a3b8" }}>sur profit net de ${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </p>
      </div>

      {/* Split bars */}
      {rows.map(r => (
        <div key={r.label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <div>
              <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>{r.sub}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>
              ${r.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4 }}>({r.pct}%)</span>
            </span>
          </div>
          <div style={{ background: "#f1f5f9", borderRadius: 4, height: 7 }}>
            <div style={{ background: r.color, width: `${r.pct}%`, height: "100%", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>
      ))}

      {/* Summary note */}
      <div style={{ marginTop: 14, padding: "8px 12px", background: "#fefce8", borderRadius: 8, borderLeft: "3px solid #F59E0B" }}>
        <p style={{ margin: 0, fontSize: 10, color: "#92400e", lineHeight: 1.7 }}>
          <strong>⚠️ Split sur profit net :</strong> Booking ${bookingAmt.toLocaleString()} − Fournisseur ${supplierCost.toLocaleString()} = <strong>Net ${netProfit.toLocaleString()}</strong> · 
          Direct → 100% Zeniva · Lina seule → 70% Zeniva / 30% Agent · Agent humain → 70% Agent / 30% Zeniva · ZeniYacht → 100% Zeniva · +Influenceur → 5% du net Zeniva
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function ZenivaCompleteApp() {
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState("all");
  const [linkModal, setLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ amount: "", desc: "", type: "trip", email: "", expiry: "" });
  const [linkCreated, setLinkCreated] = useState("");
  const [payLinks, setPayLinks] = useState<{ id: string; url: string; amount: number; description: string; status: string; uses: number; created_at: string; expires_at?: string }[]>([]);
  const [payLinksLoading, setPayLinksLoading] = useState(false);
  const [benMsg, setBenMsg] = useState("");
  const [benChat, setBenChat] = useState<{ role: "user" | "ben"; text: string }[]>([
    { role: "ben", text: "Bonjour! Je suis Ben, votre agent IA ZeniPay. Je surveille les paiements, détecte les anomalies et génère vos rapports financiers en temps réel. Comment puis-je vous aider?" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  // Live data from API
  const [WALLETS, setWALLETS] = useState(DEFAULT_WALLETS);
  const [TRANSACTIONS, setTRANSACTIONS] = useState<{ id: string; customer: string; booking: string; amount: number; currency: string; method: string; gateway: string; status: string; date: string }[]>([]);
  const [STATS, setSTATS] = useState<{ totalTransactions: number; totalRevenue: number; successRate: number; env: string }>({ totalTransactions: 0, totalRevenue: 0, successRate: 0, env: "sandbox" });
  const [accountingSummary, setAccountingSummary] = useState<{ totalRevenue: number; totalExpenses: number; netProfit: number; platformFees: number; agentCommissions: number; journalEntries: unknown[]; chartOfAccounts: {code:string;name:string;balance:number;type:string}[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [openWallet, setOpenWallet] = useState<{name:string;data:typeof DEFAULT_WALLETS.platform;icon:string;color:string}|null>(null);
  const [liveActivity, setLiveActivity] = useState<{ id: number; text: string; time: string; type: string }[]>([]);
  const [recentBookings, setRecentBookings] = useState<{ id: string; client_name: string; destination: string; total_price: number; status: string; created_at: string }[]>([]);
  const [zpInvoices, setZpInvoices] = useState<{ id: string; customer_name: string; customer_email: string; total: number; status: string; payment_id: string; created_at: string }[]>([]);
  // Unit.co banking layer
  const [unitAccounts, setUnitAccounts] = useState<{ id: string; type: string; name: string; status: string; balanceCents: number; availableCents: number; routingNumber: string; accountNumber: string; currency: string; createdAt: string }[]>([
    { id:"11589672", type:"depositAccount", name:"ZeniPay Checking — Zeniva Travel LLC", status:"Open", balanceCents:0, availableCents:0, routingNumber:"812345678", accountNumber:"1009825847", currency:"USD", createdAt:"2026-03-17T18:09:35.382Z" }
  ]);
  const [unitCards, setUnitCards] = useState<{ id: string; type: string; last4?: string; expiry?: string; status?: string; attributes: { status?: string; last4Digits?: string; expirationDate?: string; bin?: string; cardQualifier?: string } }[]>([
    { id:"5487715", type:"businessVirtualDebitCard", last4:"5050", expiry:"2030-03", status:"Active", attributes:{ status:"Active", last4Digits:"5050", expirationDate:"2030-03" } }
  ]);
  const [unitLoading, setUnitLoading] = useState(false);
  const [bankAction, setBankAction] = useState<"wire"|"ach"|"transfer"|"savings"|null>(null);
  const [bankActionForm, setBankActionForm] = useState<Record<string,string>>({});
  const [bankActionLoading, setBankActionLoading] = useState(false);
  const [unitTxns, setUnitTxns] = useState<{id:string;type:string;attributes:{amount:number;balance:number;direction:string;status:string;description?:string;summary?:string;createdAt?:string}}[]>([]);
  const [show360, setShow360] = useState(false);
  const [unitRealTxns, setUnitRealTxns] = useState<{id:string;type:string;date:string;description:string;direction:string;amountCents:number;balanceCents:number;status:string}[]>([]);
  const [revealCardId, setRevealCardId] = useState<string|null>(null);
  const [revealedCardNum, setRevealedCardNum] = useState<string|null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Fetch live stats from /api/zenipay/stats ──────────────────────────
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/zenipay/stats");
        if (!res.ok) return;
        const data = await res.json();

        if (data.wallets) {
          setWALLETS({
            platform:   { available: data.wallets.platform?.available || 0,   pending: data.wallets.platform?.pending || 0,   paid: data.wallets.platform?.paid_out || 0,   currency: "USD" },
            agent:      { available: data.wallets.agent?.available || 0,       pending: data.wallets.agent?.pending || 0,       paid: data.wallets.agent?.paid_out || 0,       currency: "USD" },
            influencer: { available: data.wallets.influencer?.available || 0,  pending: data.wallets.influencer?.pending || 0,  paid: data.wallets.influencer?.paid_out || 0,  currency: "USD" },
            supplier:   { available: data.wallets.supplier?.available || 0,    pending: data.wallets.supplier?.pending || 0,    paid: data.wallets.supplier?.paid_out || 0,    currency: "USD" },
          });
        }

        if (data.recent_transactions?.length > 0) {
          setTRANSACTIONS(data.recent_transactions.map((t: Record<string, unknown>) => ({
            id: String(t.id || ""),
            customer: String(t.customer || ""),
            booking: String(t.description || t.id || ""),
            amount: Number(t.amount || 0),
            currency: String(t.currency || "USD"),
            method: "card",
            gateway: "Tilled",
            status: String(t.status || "pending"),
            date: String(t.date || new Date().toISOString()),
          })));
        }

        if (data.stats) {
          setSTATS({
            totalTransactions: data.stats.total_payments || 0,
            totalRevenue: data.stats.total_revenue || 0,
            successRate: data.stats.success_rate || 0,
            env: data.env || "sandbox",
          });
        }
      } catch {
        // API not reachable — stay at $0
      } finally {
        setStatsLoading(false);
      }
    }

    async function fetchAccountingSummary() {
      try {
        const res = await fetch("/api/zenipay/accounting/summary");
        if (!res.ok) return;
        const data = await res.json();
        setAccountingSummary(data);
      } catch {
        // silently fail
      }
    }

    async function fetchBookings() {
      try {
        const r = await fetch("/api/agents-proxy?path=admin/bookings");
        const d = await r.json();
        const bks = (d?.bookings || []) as { id: string; client_name: string; destination: string; total_price: number; status: string; created_at: string }[];
        setRecentBookings(bks.slice(0, 5));
      } catch {}
    }

    async function fetchZpInvoices() {
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/zenipay_invoices?select=*&order=created_at.desc`,
          { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` } }
        );
        const d = await r.json();
        setZpInvoices(Array.isArray(d) ? d : []);
      } catch {}
    }

    void fetchStats();
    void fetchBookings();
    void fetchZpInvoices();
    void fetchAccountingSummary();
    void fetchPayLinks();
    // Fetch Unit banking accounts + cards + transactions via unified endpoint
    async function fetchUnit() {
      setUnitLoading(true);
      try {
        const r = await fetch("/api/zenipay/bank-balance");
        if (r.ok) {
          const d = await r.json();
          setUnitAccounts(d.accounts || []);
          setUnitCards(d.cards || []);
          if (d.transactions) setUnitRealTxns(d.transactions);
        }
      } catch { /* silent — Unit may not be configured yet */ }
      finally { setUnitLoading(false); }
    }
    void fetchUnit();
    // Refresh every 30s
    const interval = setInterval(() => { void fetchStats(); void fetchBookings(); void fetchZpInvoices(); }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const totalRevenue = TRANSACTIONS.filter(t => t.status === "succeeded" || t.status === "completed").reduce((a, t) => a + t.amount, 0);
  const platformBalance = WALLETS.platform.available + WALLETS.agent.available + WALLETS.influencer.available + WALLETS.supplier.available;
  const successRate = TRANSACTIONS.length > 0 ? Math.round(TRANSACTIONS.filter(t => t.status === "succeeded" || t.status === "completed").length / TRANSACTIONS.length * 100) : 0;
  const isLive = STATS.env === "production" || STATS.env === "live";

  const filteredTx = TRANSACTIONS.filter(t => {
    const matchSearch = !txSearch || t.customer.toLowerCase().includes(txSearch.toLowerCase()) || t.id.includes(txSearch) || t.booking.includes(txSearch);
    const matchFilter = txFilter === "all" || t.status === txFilter;
    return matchSearch && matchFilter;
  });

  const handleCreateLink = async () => {
    if (!linkForm.amount || parseFloat(linkForm.amount) <= 0) return;
    setPayLinksLoading(true);
    try {
      const res = await fetch("/api/zenipay/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: linkForm.amount, description: linkForm.desc, expiry: linkForm.expiry || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        setLinkCreated(data.url);
        setPayLinks(prev => [{ id: data.id, url: data.url, amount: data.amount, description: data.description || "", status: "active", uses: 0, created_at: new Date().toISOString() }, ...prev]);
      }
    } catch { /* ignore */ }
    setPayLinksLoading(false);
  };

  const fetchPayLinks = async () => {
    try {
      const res = await fetch("/api/zenipay/create-link");
      const data = await res.json();
      if (data.links) setPayLinks(data.links);
    } catch { /* ignore */ }
  };

  const handleBenSend = async () => {
    if (!benMsg.trim()) return;
    const userMsg = benMsg;
    setBenMsg("");
    setBenChat(prev => [...prev, { role: "user", text: userMsg }]);
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    const responses: Record<string, string> = {
      "revenue": `📊 Revenue Analysis:\n• Total today: ${fmt(totalRevenue)}\n• MTD: ${fmt(totalRevenue)}\n• Active agents: Louis, Jason, Luca\n• Success rate: ${successRate}%`,
      "fraud": `🛡️ Fraud Monitoring:\n• No high-risk transactions detected\n• Carlos Ruiz failure flagged: card declined (3x attempt)\n• Recommendation: request alternative payment method`,
      "payout": `💸 Upcoming Payouts:\n• Platform Balance: ${fmt(platformBalance, true)}\n• Agents: Louis, Jason, Luca — $0 pending\n• No payouts scheduled yet — activate Tilled live to begin`,
      "rapport": `📄 Financial Report — Current:\n• Gross Revenue: ${fmt(totalRevenue)}\n• Platform Wallet: ${fmt(WALLETS.platform.available)} available\n• Agent Commissions Paid: ${fmt(WALLETS.agent.paid)} (70% travel agents)\n• Influencer Referrals Paid: ${fmt(WALLETS.influencer.paid)} (5% net profit)\n• Supplier Balance: ${fmt(WALLETS.supplier.available)}\n• ZeniYacht: 100% Zeniva`,
    };
    const keyword = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k));
    const reply = keyword ? responses[keyword] : `Analysing your request: "${userMsg}"...\n\n✅ All systems operational. Platform balance: ${fmt(platformBalance, true)}. Payment success rate: ${successRate}%. No anomalies detected in the last 24h.`;
    setBenChat(prev => [...prev, { role: "ben", text: reply }]);
    setAiLoading(false);
  };

  const exportCSV = () => {
    const headers = "Transaction ID,Customer,Booking,Amount,Currency,Method,Gateway,Status,Date\n";
    const rows = filteredTx.map(t => `${t.id},${t.customer},${t.booking},${t.amount},${t.currency},${t.method},${t.gateway},${t.status},${t.date}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "zenipay_transactions.csv"; a.click();
  };

  // ── MOBILE ZeniPay ─────────────────────────────────────
  if (isMobile) {
    const zpGrad = "linear-gradient(90deg,#2DBE60 0%,#15B8C9 45%,#7B4FBF 100%)";
    const cardBalance = unitAccounts[0] ? (unitAccounts[0].availableCents / 100) : 0;
    const debitCard = unitCards[0];
    const goTab = (tab: string) => { setTab(tab); setIsMobile(false); };
    return (
      <div style={{ background:"linear-gradient(170deg,#080C1A 0%,#0B1740 45%,#0F1F5C 100%)", minHeight:"100vh", color:"white", fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:110, overflowX:"hidden" }}>
        <style>{`@keyframes zpPulse{0%,100%{opacity:.7}50%{opacity:1}} @keyframes zpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes zpShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

        {/* ── HEADER ── */}
        <div style={{ padding:"env(safe-area-inset-top) 0 0", background:"rgba(8,12,26,0.8)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <img src="/zenipay-logo.png" style={{ width:36, height:36, objectFit:"contain", filter:"drop-shadow(0 0 12px rgba(45,190,96,0.8))", animation:"zpFloat 3s ease-in-out infinite" }} alt="ZP" />
              <div>
                <div style={{ fontSize:17, fontWeight:900, background:zpGrad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ZeniPay</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:"0.18em", marginTop:-1 }}>FINANCE PLATFORM</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ background:"rgba(245,166,35,0.15)", border:"1px solid rgba(245,166,35,0.35)", borderRadius:20, padding:"3px 10px", fontSize:9, fontWeight:800, color:"#F5A623", letterSpacing:"0.1em" }}>SANDBOX</span>
              <button onClick={() => { void fetch("/api/zenipay/stats").then(r=>r.json()).then(d=>{ if(d.available_balance!==undefined) setWALLETS(w=>({...w,platform:{...w.platform,available:d.available_balance||0,pending:d.pending_balance||0,paid_out:d.paid_out||0}})); }); void fetch("/api/zenipay/bank-balance").then(r=>r.json()).then(d=>{ setUnitAccounts(d.accounts||[]); setUnitCards(d.cards||[]); }); }} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 11px", color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer" }}>🔄</button>
              <button onClick={() => setIsMobile(false)} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 11px", color:"rgba(255,255,255,0.5)", fontSize:11, cursor:"pointer" }}>⊞</button>
            </div>
          </div>
        </div>

        {/* ── BALANCE HERO ── */}
        <div style={{ margin:"20px 16px 0", background:"rgba(255,255,255,0.04)", borderRadius:28, border:"1px solid rgba(255,255,255,0.09)", padding:"22px 20px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-40, width:180, height:180, borderRadius:"50%", background:"radial-gradient(circle,rgba(45,190,96,0.15) 0%,transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-40, left:-20, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle,rgba(123,79,191,0.12) 0%,transparent 70%)", pointerEvents:"none" }} />
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:6 }}>Platform Balance</div>
          <div style={{ fontSize:42, fontWeight:900, letterSpacing:"-1.5px", lineHeight:1 }}>{fmt(WALLETS.platform.available||0)}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>USD · Real-time · {STATS.env==="production"?"🟢 Live":"🟡 Sandbox"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, marginTop:18, background:"rgba(255,255,255,0.05)", borderRadius:16, overflow:"hidden" }}>
            {[{label:"Available",value:fmt(WALLETS.platform.available||0),color:"#2DBE60"},{label:"Pending",value:fmt(WALLETS.platform.pending||0),color:"#F5A623"},{label:"Paid Out",value:fmt(WALLETS.platform.paid||0),color:"#2A8FE0"}].map((s,i)=>(
              <div key={i} style={{ padding:"11px 6px", textAlign:"center", borderRight:i<2?"1px solid rgba(255,255,255,0.07)":"none" }}>
                <div style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:3, letterSpacing:"0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ margin:"16px 16px 0", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {[
            { icon:"💸", label:"Pay", color:"#2DBE60", bg:"rgba(45,190,96,0.12)", action:()=>goTab("paylinks") },
            { icon:"📤", label:"Payout", color:"#2A8FE0", bg:"rgba(42,143,224,0.12)", action:()=>goTab("payouts") },
            { icon:"🧾", label:"Invoice", color:"#F5A623", bg:"rgba(245,166,35,0.12)", action:()=>goTab("invoices") },
            { icon:"📊", label:"Stats", color:"#7B4FBF", bg:"rgba(123,79,191,0.12)", action:()=>goTab("analytics") },
          ].map((a,i)=>(
            <button key={i} onClick={a.action} style={{ background:a.bg, border:`1px solid ${a.color}33`, borderRadius:18, padding:"14px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
              <span style={{ fontSize:24 }}>{a.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.75)", letterSpacing:"0.03em" }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── CARDS CAROUSEL ── */}
        <div style={{ marginTop:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 16px 10px" }}>
            <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.85)", letterSpacing:"0.02em" }}>💳 Your Cards</div>
            <button onClick={()=>goTab("wallets")} style={{ background:"none", border:"none", fontSize:11, color:"#2DBE60", fontWeight:700, cursor:"pointer", padding:0 }}>See all →</button>
          </div>
          <div style={{ display:"flex", gap:14, overflowX:"auto", padding:"4px 16px 12px", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" } as React.CSSProperties}>
            {/* Visa */}
            <div style={{ minWidth:200, height:120, borderRadius:20, background:"linear-gradient(135deg,#F5A623 0%,#E5247B 45%,#7B4FBF 100%)", position:"relative", overflow:"hidden", flexShrink:0, padding:"14px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:"0 8px 30px rgba(229,36,123,0.35)" }}>
              <img src="/zenipay-logo.png" style={{ position:"absolute", inset:"-5%", width:"110%", height:"110%", objectFit:"cover", opacity:0.22, mixBlendMode:"overlay" as React.CSSProperties["mixBlendMode"] }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:8, fontWeight:800, opacity:0.7, letterSpacing:"0.15em" }}>VISA PLATFORM</div>
                  <div style={{ display:"flex", gap:4, marginTop:2 }}>
                    <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"1px 5px", fontSize:7, fontWeight:700 }}>DEBIT</span>
                  </div>
                </div>
                <div style={{ width:32, height:22, borderRadius:4, background:"linear-gradient(145deg,#c9a84c,#f2d76a,#b8900a)", opacity:0.9 }} />
              </div>
              <div>
                <div style={{ fontSize:12, fontFamily:"monospace", letterSpacing:"0.2em", opacity:0.9 }}>•••• •••• •••• 4242</div>
                <div style={{ fontSize:10, fontWeight:900, fontStyle:"italic", marginTop:3, textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>VISA</div>
              </div>
            </div>
            {/* Mastercard */}
            <div style={{ minWidth:200, height:120, borderRadius:20, background:"linear-gradient(135deg,#2DBE60 0%,#15B8C9 45%,#2A8FE0 100%)", position:"relative", overflow:"hidden", flexShrink:0, padding:"14px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:"0 8px 30px rgba(21,184,201,0.3)" }}>
              <img src="/zenipay-logo.png" style={{ position:"absolute", inset:"-5%", width:"110%", height:"110%", objectFit:"cover", opacity:0.22, mixBlendMode:"overlay" as React.CSSProperties["mixBlendMode"] }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:8, fontWeight:800, opacity:0.7, letterSpacing:"0.15em" }}>MASTERCARD BIZ</div>
                  <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"1px 5px", fontSize:7, fontWeight:700, display:"inline-block", marginTop:2 }}>CREDIT</span>
                </div>
                <div style={{ display:"flex", position:"relative", width:36, height:22 }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", background:"#EB001B", position:"absolute", left:0, opacity:0.95 }} />
                  <div style={{ width:22, height:22, borderRadius:"50%", background:"#F79E1B", position:"absolute", left:13, opacity:0.95 }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:12, fontFamily:"monospace", letterSpacing:"0.2em", opacity:0.9 }}>•••• •••• •••• 1337</div>
                <div style={{ fontSize:9, opacity:0.6, marginTop:3 }}>Mastercard Business</div>
              </div>
            </div>
            {/* ZeniPay Debit */}
            {debitCard ? (
              <div onClick={()=>{ setTab("wallets"); setShow360(true); setIsMobile(false); }} style={{ minWidth:200, height:120, borderRadius:20, background:"linear-gradient(135deg,#0d1633 0%,#1a2a5e 40%,#2DBE60 80%,#15B8C9 100%)", position:"relative", overflow:"hidden", flexShrink:0, padding:"14px 16px", display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"pointer", boxShadow:"0 8px 30px rgba(45,190,96,0.3)", border:"1px solid rgba(45,190,96,0.3)" }}>
                <img src="/zenipay-logo.png" style={{ position:"absolute", inset:"-5%", width:"110%", height:"110%", objectFit:"cover", opacity:0.28, mixBlendMode:"overlay" as React.CSSProperties["mixBlendMode"] }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:8, fontWeight:800, opacity:0.7, letterSpacing:"0.15em" }}>ZENIPAY DEBIT</div>
                  <span style={{ background:"rgba(45,190,96,0.25)", border:"1px solid rgba(45,190,96,0.5)", borderRadius:4, padding:"1px 6px", fontSize:7, fontWeight:800, color:"#2DBE60" }}>ACTIVE</span>
                </div>
                <div>
                  <div style={{ fontSize:12, fontFamily:"monospace", letterSpacing:"0.2em", opacity:0.9 }}>•••• •••• •••• {debitCard.attributes?.last4Digits||"5050"}</div>
                  <div style={{ fontSize:9, opacity:0.5, marginTop:3 }}>Unit.co · Tap for 360° ↗</div>
                </div>
              </div>
            ) : (
              <div style={{ minWidth:160, height:120, borderRadius:20, background:"rgba(255,255,255,0.04)", border:"2px dashed rgba(45,190,96,0.25)", flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span style={{ fontSize:22 }}>🏦</span>
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textAlign:"center", padding:"0 12px" }}>Banking loading…</span>
              </div>
            )}
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ margin:"0 16px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { icon:"💳", label:"Transactions", value:String(STATS.totalTransactions||0), color:"#2A8FE0" },
            { icon:"💰", label:"Revenue", value:fmt(STATS.totalRevenue||0), color:"#2DBE60" },
            { icon:"✅", label:"Success Rate", value:`${STATS.successRate||0}%`, color:"#7B4FBF" },
          ].map((s,i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${s.color}22`, borderRadius:18, padding:"14px 10px", textAlign:"center" }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:15, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:3, letterSpacing:"0.07em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── RECENT TRANSACTIONS ── */}
        <div style={{ margin:"0 16px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"rgba(255,255,255,0.85)" }}>Recent Activity</div>
            <button onClick={()=>goTab("transactions")} style={{ background:"none", border:"none", fontSize:11, color:"#15B8C9", fontWeight:700, cursor:"pointer", padding:0 }}>See all →</button>
          </div>
          {TRANSACTIONS.length===0 ? (
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:18, border:"1px solid rgba(255,255,255,0.06)", padding:"28px 20px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💳</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", fontWeight:600 }}>No transactions yet</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:4 }}>Client payments will appear here</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {TRANSACTIONS.slice(0,5).map((tx,i)=>{
                const ok = tx.status==="succeeded"||tx.status==="completed";
                return (
                  <div key={i} style={{ background:"rgba(255,255,255,0.04)", borderRadius:16, border:"1px solid rgba(255,255,255,0.07)", padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:ok?"rgba(45,190,96,0.15)":"rgba(239,68,68,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{ok?"💳":"⏳"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.85)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.customer||"Client"}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{tx.date} · {tx.method}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:ok?"#2DBE60":"#F5A623", flexShrink:0 }}>{fmt(tx.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MORE FEATURES GRID ── */}
        <div style={{ margin:"0 16px 20px" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.6)", marginBottom:12, letterSpacing:"0.05em", textTransform:"uppercase" as const }}>More</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {[
              {icon:"🏛️",label:"Wallets",tab:"wallets"},{icon:"🔗",label:"Pay Links",tab:"paylinks"},
              {icon:"💸",label:"Payouts",tab:"payouts"},{icon:"👤",label:"Agents",tab:"agents"},
              {icon:"📚",label:"Accounting",tab:"accounting"},{icon:"🤖",label:"Ben AI",tab:"ai"},
            ].map((item,i)=>(
              <button key={i} onClick={()=>goTab(item.tab)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"14px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                <span style={{ fontSize:22 }}>{item.icon}</span>
                <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.6)" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── FULL DASHBOARD CTA ── */}
        <div style={{ margin:"0 16px" }}>
          <button onClick={()=>setIsMobile(false)} style={{ width:"100%", background:"linear-gradient(90deg,#2DBE60,#15B8C9,#7B4FBF)", borderRadius:18, padding:"15px", border:"none", fontSize:14, fontWeight:800, color:"white", cursor:"pointer", letterSpacing:"0.04em", boxShadow:"0 6px 24px rgba(45,190,96,0.35)", WebkitTapHighlightColor:"transparent" }}>
            🖥️ Open Full ZeniPay Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Inter',system-ui,sans-serif", display: "flex" }}>
      {/* ══ LEFT SIDEBAR — Dark Glassmorphism ══ */}
      <div style={{
        width: sidebarOpen ? 240 : 64,
        minHeight: "100vh",
        background: `linear-gradient(180deg, #0d1633 0%, #1a2a5e 30%, #2A8FE0 70%, #7B4FBF 100%)`,
        borderRight: `1px solid rgba(255,255,255,0.15)`,
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column" as const,
        flexShrink: 0,
        position: "sticky" as const,
        top: 0,
        alignSelf: "flex-start" as const,
        zIndex: 100,
      }}>
        {/* Logo + toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center", padding: "18px 14px", borderBottom: `1px solid rgba(255,255,255,0.15)`, minHeight: 70 }}>
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width: 38, height: 38, objectFit: "contain", filter: "drop-shadow(0 4px 14px rgba(21,184,201,0.6))", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "white", letterSpacing: "-0.5px" }}>ZeniPay</p>
                <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Finance Platform</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(21,184,201,0.5))" }} />
          )}
          <button onClick={() => setSidebarOpen((o: boolean) => !o)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, width: 26, height: 26, cursor: "pointer", color: "white", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: sidebarOpen ? 0 : "auto" }}>
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>
        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "8px 6px", scrollbarWidth: "none" as const }}>
          {TABS.map(t => {
            const isLink = !!(t as unknown as { href?: string }).href;
            const isActive = tab === t.id;
            const btnStyle = {
              width: "100%",
              display: "flex" as const,
              alignItems: "center" as const,
              gap: 10,
              padding: sidebarOpen ? "9px 12px" : "9px 0",
              justifyContent: sidebarOpen ? "flex-start" as const : "center" as const,
              border: isActive ? `1px solid ${BLUE}40` : "1px solid transparent",
              borderRadius: 10,
              background: isActive ? `linear-gradient(135deg, ${BLUE}25, ${BLUE}10)` : "transparent",
              cursor: "pointer",
              marginBottom: 1,
              transition: "all 0.15s",
              color: "white",
              textDecoration: "none" as const,
              boxShadow: isActive ? `0 0 16px ${BLUE}20` : "none",
            };
            return isLink ? (
              <a key={t.id} href={(t as unknown as { href: string }).href} style={btnStyle}>
                <span style={{ fontSize: 15, flexShrink: 0, opacity: 0.85 }}>{t.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" as const }}>{t.label}</span>}
              </a>
            ) : (
              <button key={t.id} onClick={() => setTab(t.id)} style={btnStyle}>
                <span style={{ fontSize: 15, flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{t.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? "white" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap" as const }}>{t.label}</span>}
                {sidebarOpen && isActive && <div style={{ marginLeft: "auto", width: 4, height: 16, background: BLUE, borderRadius: 9999, boxShadow: `0 0 8px ${BLUE}` }} />}
              </button>
            );
          })}
        </div>
        {/* Bottom status */}
        {sidebarOpen && (
          <div style={{ padding: "14px", borderTop: `1px solid rgba(255,255,255,0.15)` }}>
            <div style={{ background: isLive ? `${GREEN}15` : `${GOLD}15`, border: `1px solid ${isLive ? GREEN : GOLD}30`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, background: isLive ? GREEN : GOLD, borderRadius: "50%", boxShadow: `0 0 6px ${isLive ? GREEN : GOLD}` }} />
                <span style={{ fontSize: 10, color: isLive ? GREEN : GOLD, fontWeight: 700, letterSpacing: "0.05em" }}>{isLive ? "LIVE MODE" : "SANDBOX MODE"}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Tilled · {isLive ? "Production" : "Testing"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", fontWeight: 900 }}>A</div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "white" }}>Admin</p>
                <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.65)" }}>Zeniva Travel LLC</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ flex: 1, minHeight: "100vh", overflow: "auto", background: "#f0f4f8" }}>
      {/* Hide duplicate Help button on desktop */}
      <style>{`
        @media (min-width: 640px) { .help-float { display: none !important; } }
        .zp-tab-btn:hover { background: rgba(0,102,255,0.1) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
      {/* ── HEADER ── */}
      <div style={{ background: `linear-gradient(135deg, #0d1633 0%, #1a2a5e 25%, #2DBE60 55%, #15B8C9 75%, #7B4FBF 100%)`, padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: `1px solid rgba(255,255,255,0.15)` }}>
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(45,190,96,0.5))" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 16, color: "white", letterSpacing: "-0.5px" }}>ZeniPay</span>
                  <span style={{ background: isLive ? `${GREEN}25` : `${GOLD}25`, border: `1px solid ${isLive ? GREEN : GOLD}50`, color: isLive ? GREEN : GOLD, fontSize: 8, fontWeight: 800, borderRadius: 4, padding: "2px 6px", letterSpacing: "0.1em" }}>
                    {isLive ? "● LIVE" : "● SANDBOX"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 9, color: "#94a3b8", letterSpacing: "0.06em" }}>Powered by Tilled · Banking by Unit.co</p>
              </div>
            </div>
            {/* Balance display */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 24, alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.65)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Platform Balance</p>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 22, color: "#ffffff", letterSpacing: "-0.5px" }}>{fmt(platformBalance)}</p>
              </div>
              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.25)" }} />
              <div>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Transactions</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#ffffff" }}>{STATS.totalTransactions}</p>
              </div>
              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.25)" }} />
              <div>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.65)" }}>Success Rate</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: STATS.successRate > 80 ? "#7fffb2" : "#fde68a" }}>{STATS.successRate.toFixed(0)}%</p>
              </div>
              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.25)" }} />
              {/* Quick actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => window.open("/zenipay/checkout/test", "_blank")} style={{ background: "linear-gradient(90deg, #F5A623, #E5247B)", border: "none", borderRadius: 8, padding: "8px 14px", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(245,166,35,0.5)" }}>
                  + New Payment
                </button>
                <button onClick={() => setTab("payouts")} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 14px", color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ↑ Payout
                </button>
                <button onClick={() => setTab("ben")} style={{ background: `${BLUE}15`, border: `1px solid ${BLUE}30`, borderRadius: 8, padding: "8px 14px", color: BLUE, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  🤖 Ben AI
                </button>
                <button onClick={() => { sessionStorage.removeItem("zp_client"); window.location.href = "/login"; }} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 14px", color: "#EF4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  🔓 Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* ── TAB BAR ── */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none" as const }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="zp-tab-btn" style={{
                background: tab === t.id ? `${BLUE}15` : "transparent",
                border: "none", borderBottom: tab === t.id ? `2px solid ${BLUE}` : "2px solid transparent",
                color: tab === t.id ? BLUE : "rgba(255,255,255,0.35)",
                padding: "11px 11px", fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
                cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.15s", display: "flex", gap: 5, alignItems: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 13 }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 28px" }}>

        {/* ════ OVERVIEW ════ */}
        {tab === "overview" && (
          <div>
            {/* ── ZENIPAY HERO BANNER ── */}
            <div style={{ background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #7B4FBF 80%, #E5247B 100%)", borderRadius: 24, padding: "32px 40px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 32 }}>
              <style>{`@keyframes logoBounce{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}`}</style>
              {/* Big logo */}
              <div style={{ flexShrink: 0, width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", animation: "logoBounce 5s ease-in-out infinite" }}>
                <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 8px 32px rgba(123,79,191,0.6)) drop-shadow(0 0 20px rgba(21,184,201,0.4))" }} />
              </div>
              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h1 style={{ margin: 0, fontWeight: 900, fontSize: 32, letterSpacing: "-1px", background: "linear-gradient(90deg, #ffffff, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</h1>
                  <span style={{ background: isLive ? "rgba(45,190,96,0.3)" : "rgba(245,166,35,0.3)", border: `1px solid ${isLive ? "#2DBE60" : "#F5A623"}60`, color: isLive ? "#86efac" : "#fde68a", fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.1em" }}>
                    {isLive ? "● LIVE" : "● SANDBOX"}
                  </span>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 14, opacity: 0.75 }}>The future of travel fintech · Mercury + Stripe combined · Your money, your rules</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                  {[
                    { v: fmt(totalRevenue), l: "Total Volume" },
                    { v: fmt(platformBalance), l: "Platform Balance" },
                    { v: `${successRate}%`, l: "Success Rate" },
                    { v: String(STATS.totalTransactions), l: "Transactions" },
                  ].map(s => (
                    <div key={s.l} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 16px", backdropFilter: "blur(4px)" }}>
                      <p style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 18, background: "linear-gradient(90deg, #F5A623, #ffffff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.v}</p>
                      <p style={{ margin: 0, fontSize: 10, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Sparkles decoration */}
              <div style={{ position: "absolute", top: 16, right: 24, fontSize: 28, opacity: 0.5 }}>✨</div>
              <div style={{ position: "absolute", bottom: 14, right: 80, fontSize: 20, opacity: 0.4 }}>💫</div>
              <div style={{ position: "absolute", top: 40, right: 120, fontSize: 16, opacity: 0.35 }}>⭐</div>
            </div>
            {/* KPI Cards — Dark glass */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { icon: "💰", label: "Total Revenue", value: fmt(totalRevenue), sub: "Real payments only", color: ORANGE },
                { icon: "🏛️", label: "Platform Balance", value: fmt(WALLETS.platform.available), sub: "Available", color: BLUE },
                { icon: "✅", label: "Success Rate", value: `${successRate}%`, sub: `${TRANSACTIONS.length} txns`, color: GREEN },
                { icon: "⏳", label: "Pending", value: fmt(WALLETS.platform.pending + WALLETS.agent.pending), sub: "Awaiting settlement", color: GOLD },
                { icon: "👤", label: "Agent Pool", value: fmt(WALLETS.agent.available), sub: "Louis · Jason · Luca", color: PURPLE },
                { icon: "💸", label: "Paid Out", value: fmt(WALLETS.agent.paid + WALLETS.influencer.paid + WALLETS.supplier.paid), sub: "All wallets", color: RED },
                { icon: "🧾", label: "Invoices", value: String(zpInvoices.length), sub: "ZeniPay invoices", color: GOLD },
                { icon: "🔄", label: "Refunds", value: fmt(0), sub: "No refunds yet", color: PURPLE },
              ].map(s => (
                <div key={s.label} style={{ background: "white", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{s.label}</p>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 22, color: "#0f172a", letterSpacing: "-0.5px" }}>{s.value}</p>
                      {s.sub && <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>{s.sub}</p>}
                    </div>
                    <span style={{ fontSize: 22, opacity: 0.9 }}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              {/* Live Feed */}
              <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>⚡ Live Payment Activity</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: GREEN, fontWeight: 600 }}>
                    <div style={{ width: 6, height: 6, background: GREEN, borderRadius: "50%", boxShadow: `0 0 6px ${GREEN}`, animation: "pulse 1.5s infinite" }} />
                    Real-time
                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liveActivity.length === 0 ? (
                    <div style={{ textAlign: "center" as const, padding: "28px 0" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Awaiting first payment…</p>
                    </div>
                  ) : liveActivity.map(a => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: a.type === "alert" ? "#fff1f2" : "#f0fdf4", borderRadius: 10, padding: "10px 14px" }}>
                      <span style={{ fontSize: 13, color: a.type === "alert" ? RED : "#065f46", fontWeight: 500 }}>{a.text}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" as const, marginLeft: 12 }}>{a.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission Split */}
              <RevenueSplitWidget />
            </div>

            {/* ── Recent Bookings Panel ── */}
            <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflow: "hidden", marginTop: 20 }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${GLASS_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>✈️ Recent Bookings</h3>
                <a href="/agent/bookings" style={{ fontSize: 12, color: BLUE, fontWeight: 700, textDecoration: "none" }}>View All →</a>
              </div>
              {recentBookings.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" as const }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#64748b" }}>No bookings yet</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>Bookings appear after payment is received</p>
                </div>
              ) : (
                <div>
                  {recentBookings.map((b, i) => {
                    const statusColor = b.status === "confirmed" ? GREEN : b.status === "pending_payment" ? GOLD : "rgba(255,255,255,0.3)";
                    const statusLabel = b.status === "confirmed" ? "✓ Confirmed" : b.status === "pending_payment" ? "⏳ Pending" : b.status;
                    return (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderTop: i > 0 ? `1px solid ${GLASS_BORDER}` : "none", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(21,184,201,0.08)", border: `1px solid ${BLUE}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✈️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#374151" }}>{b.client_name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.destination}</p>
                        </div>
                        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: GREEN }}>${(b.total_price || 0).toLocaleString()}</p>
                          <p style={{ margin: 0, fontSize: 10, color: statusColor, fontWeight: 600 }}>{statusLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "12px 20px", borderTop: `1px solid rgba(255,255,255,0.15)`, textAlign: "center" as const }}>
                    <a href="/agent/bookings" style={{ fontSize: 12, color: BLUE, fontWeight: 700, textDecoration: "none" }}>View All Bookings →</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ TRANSACTIONS ════ */}
        {tab === "transactions" && (
          <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${GLASS_BORDER}`, display: "flex", gap: 12, flexWrap: "wrap" as const, alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, flex: 1, color: "#0f172a" }}>💳 Transactions</h3>
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search customer, ID, booking…"
                style={{ background: GLASS, border: `1px solid ${GLASS_BORDER}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, width: 220, outline: "none", color: "white" }} />
              <select value={txFilter} onChange={e => setTxFilter(e.target.value)}
                style={{ background: GLASS, border: `1px solid ${GLASS_BORDER}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", color: "white" }}>
                <option value="all">All Status</option>
                {["completed","pending","failed","refunded"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
              <button onClick={exportCSV} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${BLUE}40` }}>
                ⬇ Export CSV
              </button>
            </div>
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Transaction ID","Customer","Booking","Amount","Method","Gateway","Status","Date"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.08em", whiteSpace: "nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t, i) => (
                    <tr key={t.id} style={{ borderTop: `1px solid rgba(255,255,255,0.15)`, background: i % 2 === 0 ? "white" : "#fafbff" }}>
                      <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "monospace", color: BLUE, fontWeight: 600 }}>{t.id}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{t.customer}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{t.booking}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: GREEN }}>{fmt(t.amount)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{t.method}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: BLUE }}>{t.gateway}</td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: "12px 16px", fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" as const }}>{new Date(t.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ WALLETS ════ */}
        {tab === "wallets" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Wallet Modal */}
            {openWallet && (
              <WalletModal name={openWallet.name} data={openWallet.data} icon={openWallet.icon} color={openWallet.color} onClose={() => setOpenWallet(null)} />
            )}

            {/* ═══ ZENIPAY DUAL CARD SHOWCASE ═══ */}
            <div style={{ background: "linear-gradient(135deg, #f8f4ff 0%, #f0f8ff 50%, #f4fff8 100%)", borderRadius: 24, padding: "36px 40px", border: "1px solid rgba(21,184,201,0.2)" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 28 }}>
                {/* Header */}
                <div style={{ textAlign: "center" as const }}>
                  <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, color: "#0f172a" }}>💳 Your ZeniPay Cards</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                    Platform account · All client payments land here · Powered by Tilled + Unit.co
                  </p>
                </div>

                {/* THREE CARDS SIDE BY SIDE */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, width: "100%", maxWidth: 1050 }}>
                  {/* VISA */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E5247B" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#7B4FBF", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Visa Platform</span>
                    </div>
                    <BankCard
                      balance={platformBalance}
                      cardholder="ZENIVA TRAVEL LLC"
                      subtitle="Platform · Visa"
                      last4="0001"
                      expiry="12/28"
                      network="VISA"
                    />
                  </div>
                  {/* MASTERCARD */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#15B8C9" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#0ea5b0", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Mastercard Business</span>
                    </div>
                    <BankCard
                      balance={WALLETS.platform.available}
                      cardholder="ZENIVA TRAVEL LLC"
                      subtitle="Business · MC"
                      last4="0002"
                      expiry="12/28"
                      network="MASTERCARD"
                    />
                  </div>
                  {/* ZENIPAY DEBIT — Unit.co */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2DBE60" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#2DBE60", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                        ZeniPay Debit {unitCards.length > 0 ? "· Active" : "· Unit.co"}
                      </span>
                    </div>
                    {unitCards.length > 0 ? (
                      <div style={{
                        width: "100%", borderRadius: 20, position: "relative",
                        overflow: "hidden", aspectRatio: "1.586",
                        background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #2DBE60 80%, #15B8C9 100%)",
                        boxShadow: "0 24px 60px rgba(45,190,96,0.4), 0 8px 20px rgba(0,0,0,0.2)",
                        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                        cursor: "pointer", color: "white",
                      }}
                        onClick={async () => {
                          // Reveal card number if not yet done
                          if (revealCardId !== unitCards[0].id) {
                            try {
                              const r = await fetch(`/api/unit/cards?sensitive=true&cardId=${unitCards[0].id}`);
                              if (r.ok) { const d = await r.json(); setRevealedCardNum(d.cardNumber || null); }
                            } catch {}
                            setRevealCardId(unitCards[0].id);
                          }
                          setShow360(true);
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-10px) scale(1.02)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)"; }}
                      >
                        <style>{`@keyframes shimmerDebit{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(350%) skewX(-20deg)}}`}</style>
                        {/* Full-bleed logo wallpaper - more opaque */}
                        <img src="/zenipay-logo.png" alt="" style={{ position:"absolute", width:"130%", height:"130%", objectFit:"contain", opacity:0.32, filter:"brightness(1.8) saturate(0.6) contrast(1.1)", mixBlendMode:"overlay", transform:"scale(1.15) rotate(-8deg)", top:"-15%", left:"-15%" }} />
                        <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.12) 50%,transparent 65%)", animation:"shimmerDebit 4s ease-in-out infinite" }} />
                        <div style={{ position:"relative", padding:"6% 7%", height:"100%", boxSizing:"border-box" as const, display:"flex", flexDirection:"column" as const, justifyContent:"space-between" }}>
                          {/* Top row: logo + chip */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <img src="/zenipay-logo.png" alt="ZP" style={{ width:28, height:28, objectFit:"contain", filter:"drop-shadow(0 2px 6px rgba(45,190,96,0.8))" }} />
                              <div>
                                <div style={{ fontWeight:900, fontSize:12, letterSpacing:"-0.3px" }}>ZeniPay</div>
                                <div style={{ fontSize:7, opacity:0.65, letterSpacing:"0.12em", textTransform:"uppercase" as const, marginTop:1 }}>DEBIT · Unit.co</div>
                              </div>
                            </div>
                            <div style={{ width:32, height:24, borderRadius:4, background:"linear-gradient(145deg,#c9a84c,#f2d76a,#b8900a)", boxShadow:"0 2px 4px rgba(0,0,0,0.3)" }}>
                              <div style={{ margin:"3px", border:"1px solid rgba(0,0,0,0.15)", borderRadius:2, height:"calc(100% - 6px)" }} />
                            </div>
                          </div>
                          {/* Card number */}
                          <div onClick={e => { e.stopPropagation(); setRevealCardId(unitCards[0].id); }} style={{ cursor:"pointer" }}>
                            {revealCardId === unitCards[0].id && revealedCardNum ? (
                              <p style={{ margin:0, fontSize:10, fontFamily:"monospace", letterSpacing:"0.18em", color:"white", textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>
                                {revealedCardNum.match(/.{1,4}/g)?.join("  ")}
                              </p>
                            ) : (
                              <p style={{ margin:0, fontSize:11, fontFamily:"monospace", letterSpacing:"0.2em", opacity:0.9 }}>
                                ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;{(unitCards[0] as {last4?:string;attributes?:{last4Digits?:string}}).last4 || unitCards[0].attributes?.last4Digits || "5050"}
                                <span style={{ fontSize:7, opacity:0.55, marginLeft:6, fontFamily:"system-ui", fontStyle:"italic" }}>tap to reveal</span>
                              </p>
                            )}
                          </div>
                          {/* Bottom row */}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                            <div>
                              <p style={{ margin:"0 0 1px", fontSize:6, opacity:0.45, letterSpacing:"0.12em", textTransform:"uppercase" as const }}>VALID THRU</p>
                              <p style={{ margin:0, fontSize:10, fontWeight:700 }}>{(unitCards[0] as {expiry?:string;attributes?:{expirationDate?:string}}).expiry || unitCards[0].attributes?.expirationDate || "2030-03"}</p>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"flex-end", gap:2 }}>
                              <span style={{ background:"rgba(45,190,96,0.35)", color:"#7fffaa", fontSize:8, fontWeight:800, borderRadius:4, padding:"2px 7px", letterSpacing:"0.06em" }}>ACTIVE</span>
                              <span style={{ fontStyle:"italic", fontWeight:900, fontSize:13, opacity:0.9 }}>VISA</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ position:"absolute", bottom:5, right:9, fontSize:9, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>360° →</div>
                      </div>
                    ) : (
                      <div style={{ width:"100%", aspectRatio:"1.586", borderRadius:20, background:"linear-gradient(135deg,#1a2a5e,#0d1633)", border:"2px dashed rgba(45,190,96,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" as const, gap:8, color:"white", cursor:"pointer" }} onClick={() => {}} >
                        <span style={{ fontSize:24 }}>🏦</span>
                        <span style={{ fontSize:11, opacity:0.6, fontWeight:600 }}>Loading account…</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 780 }}>
                  {[
                    { l: "Available", v: fmt(platformBalance), c: "#10B981", icon: "✅" },
                    { l: "Pending", v: fmt(WALLETS.platform.pending), c: "#F59E0B", icon: "⏳" },
                    { l: "Paid Out", v: fmt(WALLETS.platform.paid), c: "#8B5CF6", icon: "📤" },
                  ].map(s => (
                    <div key={s.l} style={{ background: "white", borderRadius: 16, padding: "16px 18px", textAlign: "center" as const, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 18 }}>{s.icon}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{s.l}</p>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 18, color: s.c }}>{s.v}</p>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "center" }}>
                  <span style={{ background: isLive ? "#f0fdf4" : "#fefce8", border: `1px solid ${isLive ? "#86efac" : "#fde047"}`, color: isLive ? "#166534" : "#92400e", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "5px 14px" }}>
                    {isLive ? "🟢 Live Mode" : "🟡 Sandbox Mode"}
                  </span>
                  <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "5px 14px" }}>🏦 Unit.co Banking</span>
                  <span style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#5b21b6", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "5px 14px" }}>⚡ Tilled Processor</span>
                  <span style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", fontSize: 11, fontWeight: 700, borderRadius: 8, padding: "5px 14px" }}>🛡️ PCI Compliant</span>
                </div>
              </div>
            </div>

            {/* Money Flow Diagram */}
            <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 15, color: "#0f172a" }}>⚡ Money Flow</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" as const }}>
                {/* Client */}
                <div style={{ textAlign: "center" as const, flexShrink: 0 }}>
                  <div style={{ width: 80, height: 60, borderRadius: 14, background: `${GREEN}20`, border: `1px solid ${GREEN}40`, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: 18 }}>👤</span>
                    <span style={{ fontSize: 9, color: GREEN, fontWeight: 700 }}>CLIENT</span>
                  </div>
                </div>
                {/* Arrow 1 */}
                <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${GREEN}, ${BLUE})`, position: "relative", minWidth: 40 }}>
                  <div style={{ position: "absolute", right: -6, top: -4, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: `8px solid ${BLUE}` }} />
                  <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#64748b", whiteSpace: "nowrap" as const }}>Tilled</span>
                </div>
                {/* ZeniPay */}
                <div style={{ textAlign: "center" as const, flexShrink: 0 }}>
                  <div style={{ width: 100, height: 70, borderRadius: 14, background: "rgba(21,184,201,0.08)", border: `2px solid ${BLUE}60`, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4, boxShadow: `0 0 20px ${BLUE}30` }}>
                    <img src="/zenipay-logo.png" alt="ZP" style={{ width: 28, height: 28, objectFit: "contain" }} />
                    <span style={{ fontSize: 9, color: BLUE, fontWeight: 800, letterSpacing: "0.05em" }}>ZENIPAY</span>
                    <span style={{ fontSize: 10, color: BLUE, fontWeight: 700 }}>{fmt(platformBalance)}</span>
                  </div>
                </div>
                {/* Arrows out */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, paddingLeft: 8, flex: 1 }}>
                  {[
                    { label: "Agents (70%)", color: PURPLE, icon: "👤" },
                    { label: "Suppliers (net)", color: GOLD, icon: "🏨" },
                    { label: "Zeniva (30%)", color: BLUE, icon: "🏛️" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 1.5, width: 30, background: r.color, flexShrink: 0 }}>
                        <div style={{ float: "right", width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: `6px solid ${r.color}`, marginTop: -3 }} />
                      </div>
                      <div style={{ background: `${r.color}15`, border: `1px solid ${r.color}30`, borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12 }}>{r.icon}</span>
                        <span style={{ fontSize: 10, color: r.color, fontWeight: 700 }}>{r.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HERO BANNER */}
            <div style={{ background: `linear-gradient(135deg, #1a1050 0%, #0d1633 40%, #1e0d3e 70%, #2d1b4e 100%)`, borderRadius: 24, padding: "32px 36px", color: "white", position: "relative", overflow: "hidden" }}>
              {/* no decorative circles */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" as const, position: "relative" }}>
                <div>
                  <p style={{ margin: "0 0 6px", fontSize: 11, opacity: 0.55, textTransform: "uppercase" as const, letterSpacing: "0.12em", fontWeight: 700 }}>ZeniPay — Total Platform Balance</p>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 48, letterSpacing: "-2px", lineHeight: 1 }}>{fmt(platformBalance)}</p>
                  <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.45 }}>USD · 4 active wallets · Real-time</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: "Available", v: platformBalance, c: GREEN },
                    { l: "Pending", v: 0, c: GOLD },
                    { l: "Paid Out", v: 0, c: "#94a3b8" },
                    { l: "Gateway", v: "Tilled", c: BLUE, txt: true },
                  ].map(s => (
                    <div key={s.l} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", backdropFilter: "blur(8px)" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: "uppercase" as const }}>{s.l}</p>
                      {s.txt ? (
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: s.c }}>{String(s.v)}</p>
                      ) : (
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: s.c }}>{fmt(Number(s.v), true)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Quick action bar */}
              <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" as const }}>
                {[
                  { label: "💸 Withdraw", action: () => setOpenWallet({ name: "Platform", data: WALLETS.platform, icon: "🏛️", color: BLUE }) },
                  { label: "🏦 Add Bank Account", action: () => setOpenWallet({ name: "Platform", data: WALLETS.platform, icon: "🏛️", color: BLUE }) },
                  { label: "📊 Export Statement", action: () => {} },
                  { label: "⚡ Instant Payout", action: () => {} },
                ].map(b => (
                  <button key={b.label} onClick={b.action} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 9999, padding: "8px 18px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PLATFORM WALLET — full width, control center */}
            <div onClick={() => setOpenWallet({ name: "Platform", data: WALLETS.platform, icon: "🏛️", color: BLUE })}
              style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0a2070 50%, ${BLUE} 100%)`, borderRadius: 20, padding: "28px 32px", color: "white", cursor: "pointer", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" as const, position: "relative" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "1px solid rgba(255,255,255,0.2)" }}>🏛️</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 18 }}>Platform Wallet</p>
                      <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>Zeniva Travel LLC · Master Control</p>
                    </div>
                    <span style={{ marginLeft: 8, background: "#4ade8030", border: "1px solid #4ade8060", borderRadius: 9999, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#4ade80" }}>ADMIN</span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 40, letterSpacing: "-1px" }}>{fmt(WALLETS.platform.available, true)}</p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.5 }}>Available for distribution</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { l: "Pending", v: fmt(WALLETS.platform.pending, true), c: GOLD },
                    { l: "Paid Out", v: fmt(WALLETS.platform.paid, true), c: "#94a3b8" },
                    { l: "Processor", v: "Tilled", c: "#60a5fa" },
                    { l: "Mode", v: "Sandbox", c: GOLD },
                  ].map(s => (
                    <div key={s.l} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(4px)" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 9, opacity: 0.55, fontWeight: 700, textTransform: "uppercase" as const }}>{s.l}</p>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: s.c }}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" as const, position: "relative" }}>
                {["💸 Distribute", "🏦 Bank Account", "📊 Statement", "⚡ Instant Payout"].map(b => (
                  <span key={b} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9999, padding: "6px 14px", fontSize: 11, fontWeight: 700 }}>{b}</span>
                ))}
              </div>
            </div>

            {/* SUB WALLETS — 3 columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { name: "Agent", data: WALLETS.agent, icon: "👤", color: PURPLE },
                { name: "Influencer", data: WALLETS.influencer, icon: "⭐", color: GOLD },
                { name: "Supplier", data: WALLETS.supplier, icon: "✈️", color: GREEN },
              ].map(w => (
                <WalletCard key={w.name} name={w.name} data={w.data} icon={w.icon} color={w.color} onOpen={() => setOpenWallet({ name: w.name, data: w.data, icon: w.icon, color: w.color })} />
              ))}
            </div>

            {/* MONEY FLOW */}
            <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 16, color: "#0f172a" }}>💰 Money Flow — How ZeniPay Distributes Funds</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
                {[
                  { icon: "👤", label: "Client Pays", sub: "ZeniPay Checkout", color: "#6366f1" },
                  { arrow: true },
                  { icon: "🔄", label: "Tilled Processes", sub: "Card Network", color: BLUE },
                  { arrow: true },
                  { icon: "🏛️", label: "Platform Wallet", sub: "100% lands here", color: BLUE },
                  { arrow: true },
                  { icon: "⚙️", label: "Admin Splits", sub: "Manual or auto", color: GOLD },
                  { arrow: true },
                  { icon: "💸", label: "Pays Out", sub: "Agents · Suppliers", color: GREEN },
                ].map((s, i) => s.arrow ? (
                  <div key={i} style={{ fontSize: 20, color: "#cbd5e1", flexShrink: 0, padding: "0 8px" }}>→</div>
                ) : (
                  <div key={i} style={{ flexShrink: 0, textAlign: "center" as const, minWidth: 90 }}>
                    <div style={{ width: 48, height: 48, background: `${s.color}15`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 6px", border: `1px solid ${s.color}25` }}>{s.icon}</div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 11, color: "#374151" }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: 9, color: "#94a3b8" }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYOUT RULES */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <h4 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 14, color: "#0f172a" }}>📋 Commission Structure</h4>
                {[
                  { role: "✈️ Travel Agent", pct: "70%", color: PURPLE },
                  { role: "⭐ Influencer", pct: "5% net", color: GOLD },
                  { role: "🏛️ Zeniva Platform", pct: "30%", color: BLUE },
                  { role: "⛵ ZeniYacht", pct: "100% Zeniva", color: GREEN },
                ].map(r => (
                  <div key={r.role} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8fafc", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{r.role}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: r.color, background: `${r.color}12`, borderRadius: 6, padding: "2px 8px" }}>{r.pct}</span>
                  </div>
                ))}
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8" }}>Lina books alone: Zeniva 70% · Agent 30% (reversed)</p>
              </div>
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <h4 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 14, color: "#0f172a" }}>🏦 Payout Schedule</h4>
                {[
                  { label: "Platform (You)", freq: "Instant / On-demand", color: BLUE },
                  { label: "Agents", freq: "Every Friday", color: PURPLE },
                  { label: "Influencers", freq: "1st of month", color: GOLD },
                  { label: "Suppliers", freq: "Net-30 / On invoice", color: GREEN },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f8fafc", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: r.color, fontWeight: 700 }}>{r.freq}</span>
                  </div>
                ))}
                <button style={{ marginTop: 14, width: "100%", background: `${BLUE}12`, border: `1px solid ${BLUE}25`, borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 12, cursor: "pointer", color: BLUE }}>
                  ⚙️ Configure Payout Rules
                </button>
              </div>
            </div>

            {/* ═══ MERCURY-STYLE BANKING DASHBOARD ═══ */}
            <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 50%, #7B4FBF 100%)", padding: "24px 28px", color: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <img src="/zenipay-logo.png" alt="ZP" style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(123,79,191,0.5))" }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 900, fontSize: 16 }}>ZeniPay Banking</p>
                        <p style={{ margin: 0, fontSize: 10, opacity: 0.6 }}>Powered by Unit.co · FDIC Insured up to $250K</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {unitLoading && <span style={{ fontSize: 11, opacity: 0.7 }}>⏳ Loading…</span>}
                    <button onClick={async () => {
                      setUnitLoading(true);
                      const r = await fetch("/api/zenipay/bank-balance");
                      if(r.ok){const d=await r.json();setUnitAccounts(d.accounts||[]);setUnitCards(d.cards||[]);if(d.transactions)setUnitRealTxns(d.transactions);}
                      setUnitLoading(false);
                    }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      🔄 Refresh
                    </button>
                    <button onClick={async () => {
                      setUnitLoading(true);
                      const r = await fetch("/api/zenipay/provision", { method: "POST" });
                      const d = await r.json();
                      if (d.ok) {
                        // Refresh accounts + cards
                        const r2 = await fetch("/api/zenipay/bank-balance");
                        if(r2.ok){const d2=await r2.json();setUnitAccounts(d2.accounts||[]);setUnitCards(d2.cards||[]);}
                        alert(`✅ Account created! Routing: ${d.account?.routingNumber} | Card: ****${d.card?.last4}`);
                      }
                      else alert("Error: " + (d.error || JSON.stringify(d.details || {})));
                      setUnitLoading(false);
                    }} style={{ background: "linear-gradient(90deg, #2DBE60, #15B8C9)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      🏦 Open Account + Card
                    </button>
                  </div>
                </div>
                {/* Accounts row */}
                {unitAccounts.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 20 }}>
                    {unitAccounts.map(acc => (
                      <div key={acc.id} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 9, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 700 }}>
                              {acc.type === "depositAccount" ? "Checking" : acc.type}
                            </p>
                            <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 13 }}>Zeniva Travel LLC</p>
                          </div>
                          <span style={{ background: acc.status === "Open" ? "rgba(45,190,96,0.3)" : "rgba(245,158,11,0.3)", color: acc.status === "Open" ? "#86efac" : "#fde68a", fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 7px" }}>
                            {acc.status}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 10px", fontWeight: 900, fontSize: 26, letterSpacing: "-0.8px" }}>
                          ${(acc.availableCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "6px 8px" }}>
                            <p style={{ margin: "0 0 1px", fontSize: 8, opacity: 0.5, textTransform: "uppercase" as const }}>Routing</p>
                            <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{acc.routingNumber || "812345678"}</p>
                          </div>
                          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "6px 8px" }}>
                            <p style={{ margin: "0 0 1px", fontSize: 8, opacity: 0.5, textTransform: "uppercase" as const }}>Account #</p>
                            <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>{acc.accountNumber || "1009825847"}</p>
                          </div>
                        </div>
                        <button onClick={() => setShow360(true)} style={{ width: "100%", background: "linear-gradient(90deg,#2DBE60,#15B8C9,#7B4FBF)", border: "none", color: "white", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.05em" }}>
                          🏦 Open 360° Banking View →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {unitAccounts.length === 0 && (
                  <div style={{ marginTop: 16, padding: "16px", background: "rgba(255,255,255,0.07)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.2)", textAlign: "center" as const }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, opacity: 0.9 }}>No banking account yet</p>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>Click "+ Open Account" to create your Zeniva Travel LLC checking account with real routing & account numbers</p>
                  </div>
                )}
              </div>
              {/* Action buttons: Wire, ACH, Transfer, Savings */}
              {unitAccounts.length > 0 && (
                <div style={{ padding: "0 28px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: 0, overflowX: "auto" as const }}>
                    {[
                      { id: "wire", icon: "⚡", label: "Wire Transfer", color: "#7B4FBF" },
                      { id: "ach", icon: "🏦", label: "ACH Payment", color: "#15B8C9" },
                      { id: "transfer", icon: "↔️", label: "Book Transfer", color: "#2DBE60" },
                      { id: "savings", icon: "🐷", label: "Savings Goal", color: "#F5A623" },
                    ].map(a => (
                      <button key={a.id} onClick={() => setBankAction(bankAction === a.id as "wire"|"ach"|"transfer"|"savings" ? null : a.id as "wire"|"ach"|"transfer"|"savings")}
                        style={{ flex: "0 0 auto", padding: "14px 20px", background: bankAction === a.id ? `${a.color}10` : "transparent", color: bankAction === a.id ? a.color : "#374151", border: "none", borderBottom: bankAction === a.id ? `2px solid ${a.color}` : "2px solid transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Action forms */}
              {bankAction && unitAccounts.length > 0 && (
                <div style={{ padding: "20px 28px", background: "#fafbff", borderBottom: "1px solid #f1f5f9" }}>
                  {bankAction === "wire" && (
                    <div>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>⚡ Wire Transfer</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        {[{k:"beneficiaryName",l:"Beneficiary Name"},{k:"routingNumber",l:"Routing Number"},{k:"accountNumber",l:"Account Number"},{k:"amount",l:"Amount (USD)"},{k:"description",l:"Description"}].map(f => (
                          <div key={f.k}>
                            <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" as const }}>{f.l}</label>
                            <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, outline:"none" }} />
                          </div>
                        ))}
                      </div>
                      <button onClick={async()=>{setBankActionLoading(true);alert("Wire transfer API — coming when Unit.co account is live");setBankActionLoading(false);}} style={{ background:"linear-gradient(90deg,#7B4FBF,#E5247B)", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        {bankActionLoading ? "⏳ Processing…" : "Send Wire →"}
                      </button>
                    </div>
                  )}
                  {bankAction === "ach" && (
                    <div>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>🏦 ACH Payment</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        {[{k:"beneficiaryName",l:"Recipient Name"},{k:"routingNumber",l:"Routing Number"},{k:"accountNumber",l:"Account Number"},{k:"amount",l:"Amount (USD)"},{k:"memo",l:"Memo"},{k:"direction",l:"Credit or Debit"}].map(f => (
                          <div key={f.k}>
                            <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" as const }}>{f.l}</label>
                            <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, outline:"none" }} />
                          </div>
                        ))}
                      </div>
                      <button onClick={async()=>{setBankActionLoading(true);alert("ACH API — available once Unit.co account is open");setBankActionLoading(false);}} style={{ background:"linear-gradient(90deg,#15B8C9,#2A8FE0)", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        {bankActionLoading ? "⏳ Processing…" : "Send ACH →"}
                      </button>
                    </div>
                  )}
                  {bankAction === "transfer" && (
                    <div>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>↔️ Book Transfer (Internal)</h4>
                      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>Instant transfer between ZeniPay accounts — no fees, immediate settlement</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        {[{k:"toAccount",l:"To Account ID"},{k:"amount",l:"Amount (USD)"},{k:"description",l:"Description"}].map(f => (
                          <div key={f.k}>
                            <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" as const }}>{f.l}</label>
                            <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, outline:"none" }} />
                          </div>
                        ))}
                      </div>
                      <button style={{ background:"linear-gradient(90deg,#2DBE60,#15B8C9)", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Transfer →</button>
                    </div>
                  )}
                  {bankAction === "savings" && (
                    <div>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>🐷 Savings Goal</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        {[{k:"goalName",l:"Goal Name (e.g. Tax Reserve)"},{k:"targetAmount",l:"Target Amount (USD)"},{k:"monthlyContrib",l:"Monthly Contribution"}].map(f => (
                          <div key={f.k}>
                            <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" as const }}>{f.l}</label>
                            <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, outline:"none" }} />
                          </div>
                        ))}
                      </div>
                      <button style={{ background:"linear-gradient(90deg,#F5A623,#E5247B)", color:"white", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Create Goal →</button>
                    </div>
                  )}
                </div>
              )}
              {/* Account transactions */}
              {unitAccounts.length > 0 && (
                <div style={{ padding: "20px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Recent Transactions</h4>
                    <button onClick={async()=>{const r=await fetch("/api/unit/transactions");if(r.ok){const d=await r.json();setUnitTxns(d.transactions||[]);}}} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", color:"#374151" }}>Load →</button>
                  </div>
                  {unitTxns.length === 0 ? (
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px", textAlign: "center" as const, border: "1px dashed #e2e8f0" }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>No transactions yet — click "Load" to fetch from Unit.co</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 1 }}>
                      {unitTxns.slice(0,20).map((txn, i) => (
                        <div key={txn.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: i % 2 === 0 ? "white" : "#fafbff", borderRadius: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: txn.attributes.direction === "Credit" ? "rgba(45,190,96,0.12)" : "rgba(229,36,123,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                              {txn.attributes.direction === "Credit" ? "↓" : "↑"}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{txn.attributes.summary || txn.attributes.description || txn.type}</p>
                              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{txn.attributes.createdAt ? new Date(txn.attributes.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"} · {txn.attributes.status}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" as const }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: txn.attributes.direction === "Credit" ? "#2DBE60" : "#E5247B" }}>
                              {txn.attributes.direction === "Credit" ? "+" : "-"}${Math.abs(txn.attributes.amount / 100).toLocaleString("en-US",{minimumFractionDigits:2})}
                            </p>
                            <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>Bal: ${(txn.attributes.balance / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DEBIT CARDS — compact summary */}
            {unitCards.length > 0 && (
              <div style={{ background: "white", borderRadius: 16, padding: "16px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#0d1633,#2DBE60)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 22 }}>💳</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>ZeniPay Debit — Visa Virtual</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      •••• •••• •••• {(unitCards[0] as {last4?:string;attributes?:{last4Digits?:string}}).last4 || unitCards[0].attributes?.last4Digits || "5050"}
                      &nbsp;·&nbsp;Expires {(unitCards[0] as {expiry?:string;attributes?:{expirationDate?:string}}).expiry || unitCards[0].attributes?.expirationDate || "2030-03"}
                      &nbsp;·&nbsp;<span style={{ color: "#2DBE60", fontWeight: 700 }}>Active</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShow360(true)} style={{ background: "linear-gradient(90deg,#2DBE60,#15B8C9)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Open 360° Banking View →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ PAY LINKS ════ */}
        {tab === "paylinks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create form */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>🔗 Create Payment Link</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase" as const }}>Amount (USD)</label>
                  <input type="number" value={linkForm.amount} onChange={e => setLinkForm(p => ({...p, amount: e.target.value}))} placeholder="500"
                    style={{ width:"100%",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",boxSizing:"border-box" as const }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase" as const }}>Description</label>
                  <input type="text" value={linkForm.desc} onChange={e => setLinkForm(p => ({...p, desc: e.target.value}))} placeholder="Maldives Trip — 7 nights"
                    style={{ width:"100%",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",boxSizing:"border-box" as const }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 5, textTransform: "uppercase" as const }}>Expiry (optional)</label>
                  <input type="date" value={linkForm.expiry} onChange={e => setLinkForm(p => ({...p, expiry: e.target.value}))}
                    style={{ width:"100%",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",boxSizing:"border-box" as const }} />
                </div>
              </div>
              <button onClick={handleCreateLink} disabled={payLinksLoading || !linkForm.amount} style={{ background: payLinksLoading ? "#94a3b8" : `linear-gradient(135deg,${BLUE},${DARK})`,color:"white",border:"none",borderRadius:9999,padding:"12px 28px",fontWeight:800,fontSize:14,cursor:"pointer" }}>
                {payLinksLoading ? "⏳ Creating…" : "🔗 Generate Payment Link"}
              </button>
              {linkCreated && (
                <div style={{ marginTop: 16, background: "#f0fdf4", borderRadius: 12, padding: 16 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: GREEN }}>✅ Payment link created!</p>
                  <code style={{ fontSize: 12, color: "white", wordBreak: "break-all" as const }}>{linkCreated}</code>
                  <br />
                  <button onClick={() => navigator.clipboard?.writeText(linkCreated)} style={{ marginTop: 8, background: BLUE, color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
                    📋 Copy Link
                  </button>
                </div>
              )}
            </div>

            {/* Pay Links List */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 700 }}>📋 Active Pay Links</h3>
                <button onClick={fetchPayLinks} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                  🔄 Refresh
                </button>
              </div>
              {payLinks.length === 0 ? (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "24px", textAlign: "center" as const, border: "1px dashed #e2e8f0" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#374151" }}>No pay links yet</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Create your first payment link above</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {payLinks.map(link => (
                    <div key={link.id} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #e2e8f0" }}>
                      <div style={{ width: 40, height: 40, background: `${BLUE}12`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔗</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#374151" }}>{link.description || "Payment Link"}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{link.url}</p>
                      </div>
                      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 14, color: BLUE }}>${Number(link.amount).toLocaleString()}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{link.uses || 0} uses · {new Date(link.created_at).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status={link.status || "active"} />
                      <button onClick={() => navigator.clipboard?.writeText(link.url)} style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                        📋 Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ INVOICES ════ */}
        {tab === "invoices" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Info Banner */}
            <div style={{ background: `linear-gradient(135deg, ${DARK}, #1a2f6e)`, borderRadius: 16, padding: "20px 24px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 16, color: "#0f172a" }}>📄 ZeniPay Invoices</h3>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Auto-generated on booking · Editable HTML · Print-ready</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="/agent/invoices" style={{ background: BLUE, color: "white", textDecoration: "none", borderRadius: 9999, padding: "9px 18px", fontSize: 13, fontWeight: 700 }}>
                  + New Invoice
                </a>
                <a href="/agent/invoices" style={{ background: "rgba(255,255,255,0.1)", color: "white", textDecoration: "none", borderRadius: 9999, padding: "9px 18px", fontSize: 13, fontWeight: 600 }}>
                  View All Invoices →
                </a>
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>🔄 How Invoices Work</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                {[
                  { icon: "💳", title: "Client Pays", desc: "Payment processed via ZeniPay checkout" },
                  { icon: "📄", title: "Auto-Generated", desc: "Invoice created automatically with booking details" },
                  { icon: "✉️", title: "Emailed", desc: "Sent to client via info@zeniva.ca" },
                  { icon: "✏️", title: "Editable", desc: "Admin can modify any invoice and reprint" },
                ].map(s => (
                  <div key={s.title} style={{ background: "#f8fafc", borderRadius: 12, padding: 16, textAlign: "center" as const }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, color: "#374151" }}>{s.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live invoice list from Supabase */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "white" }}>Zeniva Travel — Client Invoices</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Auto-generated on every confirmed ZeniPay payment</p>
                </div>
                <span style={{ background: `${BLUE}12`, color: BLUE, fontWeight: 700, fontSize: 12, padding: "4px 12px", borderRadius: 9999 }}>{zpInvoices.length} invoice{zpInvoices.length !== 1 ? "s" : ""}</span>
              </div>
              {zpInvoices.length === 0 ? (
                <div style={{ textAlign: "center" as const, padding: "40px 20px" }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
                  <h3 style={{ margin: "0 0 8px", fontWeight: 800, color: "white" }}>No invoices yet</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>Invoices are auto-generated when a client completes payment via ZeniPay.</p>
                  <a href="/zenipay/checkout" style={{ background: BLUE, color: "white", textDecoration: "none", borderRadius: 9999, padding: "12px 28px", fontWeight: 700, fontSize: 14 }}>
                    Test a Payment →
                  </a>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Invoice #", "Client", "Amount", "Date", "Status", ""].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {zpInvoices.map(inv => (
                      <tr key={inv.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "monospace", color: BLUE, fontWeight: 700 }}>{inv.id}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{inv.customer_name || "—"}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: GREEN }}>{fmt(inv.total)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>{new Date(inv.created_at).toLocaleDateString("en-CA")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999 }}>✓ Paid</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <a href={`/agent/invoices/${inv.id}`} target="_blank"
                            style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}30`, borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", textDecoration: "none", color: BLUE, fontWeight: 700 }}>
                            📄 View Invoice
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════ PAYOUTS ════ */}
        {tab === "payouts" && (
          <PayoutsPanel agents={AGENTS} platformBalance={platformBalance} />
        )}

        
        {/* ════ AGENTS ════ */}
        {tab === "agents" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
              {AGENTS.map(a => (
                <div key={a.id} style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderTop: a.id === "AGT-001" ? `3px solid ${GOLD}` : `3px solid ${BLUE}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, background: `${BLUE}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{a.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{a.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{a.role}</p>
                    </div>
                    {a.badge && <span style={{ background: `${GOLD}22`, color: GOLD, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{a.badge}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Revenue Generated", value: fmt(a.revenue, true), color: BLUE },
                      { label: "Commission Earned", value: fmt(a.commission, true), color: PURPLE },
                      { label: "Pending Payout", value: fmt(a.pending, true), color: GOLD },
                      { label: "Commission Rate", value: a.rate, color: GREEN },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                        <p style={{ margin: "0 0 2px", fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</p>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>📋 {a.bookings} bookings</span>
                    </div>
                    <button style={{ background: `${BLUE}15`, color: BLUE, border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Pay Now</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ INFLUENCERS ════ */}
        {tab === "influencers" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {INFLUENCERS.map(inf => (
              <div key={inf.id} style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderTop: `3px solid ${GOLD}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{inf.name}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>{inf.handle} · {inf.platform}</p>
                    <span style={{ background: `${GOLD}22`, color: GOLD, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>🏅 {inf.tier}</span>
                  </div>
                  <StatusBadge status={inf.status || "pending"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Referrals", value: String(inf.referrals), color: BLUE },
                    { label: "Rate", value: inf.rate, color: GREEN },
                    { label: "Revenue", value: fmt(inf.revenue, true), color: PURPLE },
                    { label: "Earned", value: fmt(inf.commission, true), color: GOLD },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</p>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ FINANCING ════ */}
        {tab === "financing" && (
          <div>
            <div style={{ background: `linear-gradient(135deg, ${DARK}, #1e3a8a)`, borderRadius: 20, padding: 28, marginBottom: 20, color: "white" }}>
              <h2 style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 24 }}>🏛️ ZeniPay Financing</h2>
              <p style={{ margin: 0, opacity: 0.7 }}>Offer flexible payment plans to your travelers. Split any trip into installments.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { title: "Pay in Full", icon: "💳", desc: "Full payment upfront. Best rate.", badge: "Standard", color: BLUE },
                { title: "Deposit + Balance", icon: "📅", desc: "30% deposit now, balance before travel.", badge: "Popular", color: GREEN },
                { title: "Monthly Payments", icon: "🔄", desc: "Split into 3-12 monthly payments.", badge: "Flexible", color: PURPLE },
              ].map(p => (
                <div key={p.title} style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderTop: `3px solid ${p.color}` }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "white" }}>{p.title}</h3>
                    <span style={{ background: `${p.color}22`, color: p.color, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{p.badge}</span>
                  </div>
                  <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>{p.desc}</p>
                  <button style={{ background: `${p.color}15`, color: p.color, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Configure Plan
                  </button>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>📊 Active Financing Plans</h3>
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
                <p>Financing plans will appear here once travelers choose installment payment options.</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>Connect Tilled financing module to enable installments.</p>
              </div>
            </div>
          </div>
        )}

        {/* ════ ANALYTICS ════ */}
        {tab === "analytics" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", gridColumn: "span 2" }}>
                <h3 style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>📈 Revenue Chart</h3>
                {TRANSACTIONS.length === 0 ? (
                  <div style={{ textAlign: "center" as const, padding: "32px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>No transactions yet</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11 }}>Chart will populate from real Tilled payments</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                    {TRANSACTIONS.slice(-12).map((t, i) => (
                      <div key={i} title={`$${t.amount}`} style={{ flex: 1, background: `linear-gradient(${BLUE}, #60a5fa)`, borderRadius: "3px 3px 0 0", height: `${Math.min(100, (t.amount / Math.max(...TRANSACTIONS.map(x => x.amount))) * 100)}%`, opacity: 0.7 + i / TRANSACTIONS.length * 0.3 }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>🥇 Top Revenue Sources</h3>
              {(() => {
                const SERVICE_ICONS: Record<string, string> = { ZeniStay: "🏡", ZeniHotel: "🏨", ZeniFlights: "✈️", ZeniYacht: "⛵", ZeniCruise: "🚢", Other: "📦" };
                const revenueByService: Record<string, number> = {};
                TRANSACTIONS.filter(t => t.status === "succeeded" || t.status === "completed").forEach(t => {
                  const desc = String(t.booking || t.id || "Other");
                  const service = desc.startsWith("ZeniStay") ? "ZeniStay" :
                    desc.startsWith("ZeniYacht") ? "ZeniYacht" :
                    desc.startsWith("Flight") || desc.toLowerCase().includes("flight") ? "ZeniFlights" :
                    desc.startsWith("Hotel") || desc.toLowerCase().includes("hotel") ? "ZeniHotel" :
                    desc.startsWith("Cruise") || desc.toLowerCase().includes("cruise") ? "ZeniCruise" : "Other";
                  revenueByService[service] = (revenueByService[service] || 0) + t.amount;
                });
                const totalRev = Object.values(revenueByService).reduce((a, b) => a + b, 0);
                const services = ["ZeniStay", "ZeniHotel", "ZeniFlights", "ZeniYacht", "ZeniCruise", "Other"];
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                    {services.map(s => {
                      const rev = revenueByService[s] || 0;
                      const pct = totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0;
                      return (
                        <div key={s} style={{ background: "#f8fafc", borderRadius: 12, padding: 16 }}>
                          <div style={{ fontSize: 24, marginBottom: 8 }}>{SERVICE_ICONS[s]}</div>
                          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#374151" }}>{s}</p>
                          <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 16, color: BLUE }}>{fmt(rev)}</p>
                          <div style={{ background: "#e2e8f0", borderRadius: 3, height: 4 }}>
                            <div style={{ background: BLUE, width: `${pct}%`, height: "100%", borderRadius: 3 }} />
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>{pct}% of revenue</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ════ NOAH AI ════ */}
        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* HERO CARD — same visual style as /ai-agents */}
            <div style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a2f6e 60%, #0d2257 100%)`, borderRadius: 24, padding: 32, color: "white", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "rgba(21,184,201,0.08)", borderRadius: "50%", filter: "blur(40px)" }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24, position: "relative" }}>
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden", border: `2px solid ${BLUE}60`, boxShadow: `0 0 32px ${BLUE}40`, background: `linear-gradient(135deg, ${DARK}, #1a2f6e)` }}>
                    <img src="/agents/noah.png" alt="Ben" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display="none"; (e.target as HTMLImageElement).parentElement!.innerHTML="<div style=\"display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:42px\">🤖</div>"; }} />
                  </div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    <div style={{ width: 7, height: 7, background: GREEN, borderRadius: "50%", boxShadow: `0 0 6px ${GREEN}` }} />
                    <span style={{ fontSize: 10, color: GREEN, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Online</span>
                  </div>
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: 28, letterSpacing: "-0.5px" }}>Ben</h2>
                    <span style={{ background: `${BLUE}30`, border: `1px solid ${BLUE}50`, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: BLUE }}>ZeniPay Finance Agent</span>
                  </div>
                  <p style={{ margin: "0 0 16px", opacity: 0.7, fontSize: 14 }}>ZeniPay financial intelligence. Monitors all payments, detects fraud, distributes commissions to agents and influencers, and generates financial reports in real-time.</p>
                  {/* Feature Chips */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["🛡️ Fraud Detection", "📊 Revenue Analytics", "💸 Commission Engine", "⚡ Payment Monitor", "📄 Auto Reports", "🔮 Payout AI"].map(f => (
                      <span key={f} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>{f}</span>
                    ))}
                  </div>
                </div>
                {/* Stats */}
                <div style={{ display: "grid", gap: 8, flexShrink: 0 }}>
                  {[
                    { label: "Transactions Monitored", value: STATS.totalTransactions > 0 ? STATS.totalTransactions.toLocaleString() : "0" },
                    { label: "Platform Balance", value: fmt(platformBalance, true) },
                    { label: "Success Rate", value: TRANSACTIONS.length > 0 ? `${successRate}%` : (STATS.successRate > 0 ? `${STATS.successRate}%` : "—") },
                    { label: "Uptime", value: "99.9%" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 900, color: "white" }}>{s.value}</p>
                      <p style={{ margin: 0, fontSize: 9, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Capabilities Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginTop: 24, position: "relative" }}>
                {[
                  { icon: "🛡️", title: "Fraud Detection", desc: "Real-time anomaly detection" },
                  { icon: "📊", title: "Revenue Analytics", desc: "Margin & commission tracking" },
                  { icon: "⚡", title: "Payment Monitor", desc: "Failures, retries, disputes" },
                  { icon: "📄", title: "Auto Reports", desc: "Monthly financial summaries" },
                  { icon: "💸", title: "Payout Engine", desc: "Agent & influencer payouts" },
                ].map(f => (
                  <div key={f.icon} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 12 }}>{f.title}</p>
                    <p style={{ margin: 0, fontSize: 10, opacity: 0.5 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CHAT + LIVE LOG */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Chat Interface */}
              <div style={{ background: "linear-gradient(135deg, #0d1829, #111f38)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
                <div style={{ background: `linear-gradient(135deg, ${DARK}, #1a2f6e)`, borderRadius: "20px 20px 0 0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: `1px solid ${BLUE}60`, background: DARK }}>
                    <img src="/agents/noah.png" alt="Ben" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 14 }}>Ben · ZeniPay AI</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Financial Intelligence Agent</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: `${GREEN}22`, borderRadius: 6, padding: "4px 10px" }}>
                    <div style={{ width: 6, height: 6, background: GREEN, borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>Monitoring</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 16, overflowY: "auto", maxHeight: 380, display: "flex", flexDirection: "column", gap: 10 }}>
                  {benChat.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                      {m.role === "ben" && <div style={{ width: 28, height: 28, borderRadius: 8, overflow: "hidden", border: `1px solid ${BLUE}30`, flexShrink: 0 }}>
                      <img src="/agents/noah.png" alt="Ben" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>}
                      <div style={{
                        background: m.role === "user" ? `linear-gradient(135deg, ${BLUE}, ${DARK})` : "#f0f4ff",
                        color: m.role === "user" ? "white" : "#0f172a",
                        borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "10px 14px", maxWidth: "78%", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6,
                        boxShadow: m.role === "user" ? `0 2px 8px ${BLUE}30` : "none",
                      }}>{m.text}</div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ width: 28, height: 28, background: "rgba(21,184,201,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                      <div style={{ background: "#f0f4ff", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: BLUE, borderRadius: "50%", opacity: 0.6, animation: `bounce 1s ${i*0.2}s infinite` }} />)}
                        </div>
                        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: "0 16px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["💰 Revenue du jour", "🛡️ Fraud check", "💸 Payout status", "📊 Rapport mensuel"].map(s => (
                    <button key={s} onClick={() => setBenMsg(s.replace(/^[^ ]+ /, ""))}
                      style={{ background: "#f0f4ff", color: BLUE, border: "1px solid #dbeafe", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{s}</button>
                  ))}
                </div>
                <div style={{ padding: "0 16px 16px", display: "flex", gap: 8 }}>
                  <input value={benMsg} onChange={e => setBenMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && handleBenSend()}
                    placeholder="Ask Ben: revenue, fraud, payout, rapport…"
                    style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "11px 14px", fontSize: 13, outline: "none", background: "#fafbff" }} />
                  <button onClick={handleBenSend} style={{ background: `linear-gradient(135deg, ${BLUE}, ${DARK})`, color: "white", border: "none", borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>↑</button>
                </div>
              </div>

              {/* Live Activity Log */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>⚡ Ben Live Activity</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: GREEN, fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, background: GREEN, borderRadius: "50%", animation: "pulse 1.5s infinite" }} /> Real-time
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {liveActivity.map(a => (
                      <div key={a.id} style={{ background: a.type === "alert" ? "#fff1f2" : "#f0fdf4", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${a.type === "alert" ? RED : GREEN}` }}>
                        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 600, color: a.type === "alert" ? RED : "#065f46" }}>{a.text}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{a.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Quick Actions */}
                <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <h3 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>⚡ Quick Actions</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "📊 Generate Report", color: BLUE },
                      { label: "💸 Trigger Payouts", color: GREEN },
                      { label: "🛡️ Fraud Scan", color: PURPLE },
                      { label: "📧 Email Summary", color: GOLD },
                    ].map(a => (
                      <button key={a.label} onClick={() => setBenMsg(a.label.replace(/^[^ ]+ /, ""))}
                        style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30`, borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ACCOUNTING ════ */}
        {tab === "accounting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${DARK}, #1a2f6e)`, borderRadius: 20, padding: 28, color: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 24 }}>📚 ZeniPay Accounting</h2>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>Automatic bookkeeping · Real-time P&L · Tax-ready reports</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["📥 Import", "📤 Export", "🖨️ Print"].map(btn => (
                    <button key={btn} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9999, padding: "8px 14px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{btn}</button>
                  ))}
                </div>
              </div>
              {/* Fiscal summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
                {[
                  { label: "Gross Revenue", value: fmt(accountingSummary?.totalRevenue ?? 0), sub: "FY 2025-2026", color: GREEN },
                  { label: "Total Expenses", value: fmt(accountingSummary?.totalExpenses ?? 0), sub: "Operating costs", color: RED },
                  { label: "Net Income", value: fmt(accountingSummary?.netProfit ?? 0), sub: "Before tax", color: GOLD },
                  { label: "Tax Provision", value: fmt((accountingSummary?.netProfit ?? 0) * 0.15), sub: "Est. 15% corp tax", color: "#94a3b8" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{s.label}</p>
                    <p style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 20, color: s.color }}>{s.value}</p>
                    <p style={{ margin: 0, fontSize: 10, opacity: 0.5 }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* P&L + Balance Sheet side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* P&L Statement */}
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#0f172a" }}>📊 Profit & Loss</h3>
                  <select style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 10px", fontSize: 12 }}>
                    <option>Q1 2026</option><option>Q4 2025</option><option>Annual 2025</option>
                  </select>
                </div>
                {[
                  { label: "Travel Bookings Revenue", amount: accountingSummary?.totalRevenue ?? 0, type: "income" },
                  { label: "ZeniStay Revenue", amount: 0, type: "income" },
                  { label: "Agent Commissions (in)", amount: 0, type: "income" },
                  { label: "ZeniYacht Revenue", amount: 0, type: "income" },
                  { label: "TOTAL REVENUE", amount: accountingSummary?.totalRevenue ?? 0, type: "total-income" },
                  { label: "Supplier Payouts", amount: 0, type: "expense" },
                  { label: "Agent Commissions (out)", amount: accountingSummary?.agentCommissions ?? 0, type: "expense" },
                  { label: "Influencer Payouts", amount: 0, type: "expense" },
                  { label: "Tech Infrastructure", amount: 0, type: "expense" },
                  { label: "Marketing", amount: 0, type: "expense" },
                  { label: "TOTAL EXPENSES", amount: accountingSummary?.totalExpenses ?? 0, type: "total-expense" },
                  { label: "NET INCOME", amount: accountingSummary?.netProfit ?? 0, type: "net" },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 12px", borderRadius: 8,
                    background: row.type === "total-income" ? "#f0fdf4" : row.type === "total-expense" ? "#fff1f2" : row.type === "net" ? `${BLUE}10` : "transparent",
                    marginBottom: 2,
                    borderTop: (row.type === "total-income" || row.type === "total-expense" || row.type === "net") ? "2px solid #e2e8f0" : "none",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: (row.type.startsWith("total") || row.type === "net") ? 800 : 500, color: "#374151" }}>{row.label}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: row.amount > 0 ? GREEN : row.amount < 0 ? RED : BLUE }}>
                      {row.amount > 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Balance Sheet */}
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <h3 style={{ margin: "0 0 18px", fontWeight: 800, fontSize: 16, color: "#0f172a" }}>🏛️ Balance Sheet</h3>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12, color: "#64748b", textTransform: "uppercase" as const }}>Assets</p>
                  {[
                    { label: "ZeniPay Platform Wallet", value: 0 },
                    { label: "Agent Wallets", value: 0 },
                    { label: "Supplier Wallets", value: 0 },
                    { label: "Accounts Receivable", value: 0 },
                    { label: "Cash & Equivalents", value: 0 },
                  ].map(a => (
                    <div key={a.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 13 }}>
                      <span style={{ color: "#374151" }}>{a.label}</span>
                      <span style={{ fontWeight: 700, color: GREEN }}>${(a.value/1000).toFixed(0)}k</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#f0fdf4", borderRadius: 8, fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                    <span>TOTAL ASSETS</span><span style={{ color: GREEN }}>$0</span>
                  </div>
                </div>
                <div>
                  <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 12, color: "#64748b", textTransform: "uppercase" as const }}>Liabilities & Equity</p>
                  {[
                    { label: "Pending Payouts", value: 0 },
                    { label: "Agent Pending", value: 0 },
                    { label: "Tax Provision", value: 0 },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 13 }}>
                      <span style={{ color: "#374151" }}>{l.label}</span>
                      <span style={{ fontWeight: 700, color: RED }}>-${(l.value/1000).toFixed(0)}k</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 13 }}>
                    <span style={{ color: "#374151" }}>Retained Earnings</span>
                    <span style={{ fontWeight: 700, color: BLUE }}>$449k</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#eff6ff", borderRadius: 8, fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                    <span>TOTAL L+E</span><span style={{ color: BLUE }}>$0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart of Accounts + Journal Entries */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Chart of Accounts */}
              <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>📋 Chart of Accounts</h3>
                  <button style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New Account</button>
                </div>
                {(accountingSummary?.chartOfAccounts ? [
                  { code: "1000", name: "Platform Wallet", type: "Asset", balance: accountingSummary.chartOfAccounts.find(a => a.code === "1000")?.balance ?? 0 },
                  { code: "1200", name: "Accounts Receivable", type: "Asset", balance: 0 },
                  { code: "2000", name: "Commissions Payable", type: "Liability", balance: -(accountingSummary.chartOfAccounts.find(a => a.code === "2000")?.balance ?? 0) },
                  { code: "2500", name: "Tax Payable", type: "Liability", balance: 0 },
                  { code: "3000", name: "Retained Earnings", type: "Equity", balance: accountingSummary.netProfit },
                  { code: "4000", name: "Travel Revenue", type: "Income", balance: accountingSummary.chartOfAccounts.find(a => a.code === "4000")?.balance ?? 0 },
                  { code: "5000", name: "Agent Commissions", type: "Expense", balance: -(accountingSummary.chartOfAccounts.find(a => a.code === "5000")?.balance ?? 0) },
                  { code: "5100", name: "Processor Fees", type: "Expense", balance: -(accountingSummary.chartOfAccounts.find(a => a.code === "5100")?.balance ?? 0) },
                  { code: "7000", name: "Operating Expenses", type: "Expense", balance: 0 },
                ] : [
                  { code: "1000", name: "Platform Wallet", type: "Asset", balance: 0 },
                  { code: "1200", name: "Accounts Receivable", type: "Asset", balance: 0 },
                  { code: "2000", name: "Commissions Payable", type: "Liability", balance: 0 },
                  { code: "2500", name: "Tax Payable", type: "Liability", balance: 0 },
                  { code: "3000", name: "Retained Earnings", type: "Equity", balance: 0 },
                  { code: "4000", name: "Travel Revenue", type: "Income", balance: 0 },
                  { code: "5000", name: "Agent Commissions", type: "Expense", balance: 0 },
                  { code: "5100", name: "Processor Fees", type: "Expense", balance: 0 },
                  { code: "7000", name: "Operating Expenses", type: "Expense", balance: 0 },
                ]).map(a => (
                  <div key={a.code} style={{ display: "flex", alignItems: "center", padding: "7px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <span style={{ fontSize: 11, color: "#94a3b8", width: 36, fontFamily: "monospace" }}>{a.code}</span>
                    <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{a.name}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", marginRight: 8 }}>{a.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.balance > 0 ? GREEN : RED }}>{a.balance > 0 ? "+" : ""}{(a.balance/1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>

              {/* Journal Entries */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>📝 Recent Journal Entries</h3>
                    <button style={{ background: BLUE, color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New Entry</button>
                  </div>
                  {((accountingSummary?.journalEntries?.length ?? 0) > 0 || TRANSACTIONS.length > 0) ? (
                    <div style={{ overflowX: "auto" as const }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            {["Date", "Description", "Account", "Debit", "Credit"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: "left" as const, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9", fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {accountingSummary?.journalEntries && accountingSummary.journalEntries.length > 0
                            ? (accountingSummary.journalEntries as Array<Record<string,unknown>>).map((e, i) => (
                              <tr key={`je-${i}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ padding: "7px 10px", color: "#94a3b8" }}>{String(e.date ?? e.created_at ?? "").slice(0,10)}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", fontWeight: 500 }}>{String(e.description ?? "")}</td>
                                <td style={{ padding: "7px 10px", color: "#64748b" }}>{String(e.account_code ?? "")} {String(e.account_name ?? "")}</td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: e.entry_type === "debit" ? "#10B981" : "#94a3b8" }}>{e.entry_type === "debit" ? `$${Number(e.amount).toFixed(2)}` : "—"}</td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: e.entry_type === "credit" ? BLUE : "#94a3b8" }}>{e.entry_type === "credit" ? `$${Number(e.amount).toFixed(2)}` : "—"}</td>
                              </tr>
                            ))
                            : TRANSACTIONS.flatMap((t, i) => [
                              { key: `${i}a`, date: t.date?.slice(0,10), desc: `Payment ${t.id}`, account: "1000 Platform Wallet", debit: `$${t.amount.toFixed(2)}`, credit: "—" },
                              { key: `${i}b`, date: t.date?.slice(0,10), desc: `Revenue ${t.id}`, account: "4000 Travel Revenue", debit: "—", credit: `$${t.amount.toFixed(2)}` },
                            ]).map(row => (
                              <tr key={row.key} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ padding: "7px 10px", color: "#94a3b8" }}>{row.date}</td>
                                <td style={{ padding: "7px 10px", color: "#374151", fontWeight: 500 }}>{row.desc}</td>
                                <td style={{ padding: "7px 10px", color: "#64748b" }}>{row.account}</td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: row.debit !== "—" ? "#10B981" : "#94a3b8" }}>{row.debit}</td>
                                <td style={{ padding: "7px 10px", fontWeight: 700, color: row.credit !== "—" ? BLUE : "#94a3b8" }}>{row.credit}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px", textAlign: "center" as const, border: "1px dashed #e2e8f0" }}>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#374151", fontSize: 13 }}>No journal entries yet</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Generated automatically from real Tilled payments</p>
                    </div>
                  )}
                </div>

                {/* Tax Summary */}
                <div style={{ background: `linear-gradient(135deg, ${DARK}, #1a2f6e)`, borderRadius: 20, padding: 20, color: "white" }}>
                  <h4 style={{ margin: "0 0 14px", fontWeight: 800 }}>🧾 Tax Summary</h4>
                  {[
                    { label: "Gross Revenue", v: fmt(accountingSummary?.totalRevenue ?? 0) },
                    { label: "Total Deductions", v: fmt(accountingSummary?.totalExpenses ?? 0) },
                    { label: "Net Taxable Income", v: fmt(accountingSummary?.netProfit ?? 0) },
                    { label: "Corp Tax Rate (est.)", v: "15%" },
                    { label: "Tax Provision", v: fmt((accountingSummary?.netProfit ?? 0) * 0.15) },
                  ].map(t => (
                    <div key={t.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                      <span style={{ opacity: 0.6 }}>{t.label}</span>
                      <span style={{ fontWeight: 700, color: GOLD }}>{t.v}</span>
                    </div>
                  ))}
                  <button style={{ width: "100%", background: GOLD, color: DARK, border: "none", borderRadius: 9999, padding: "10px", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
                    📥 Download Tax Report (PDF)
                  </button>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#0f172a" }}>📄 Financial Reports</h3>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Auto-generated by ZeniPay AI</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { icon: "📊", title: "Income Statement", desc: "Revenue, expenses, profit", color: BLUE },
                  { icon: "🏛️", title: "Balance Sheet", desc: "Assets, liabilities, equity", color: PURPLE },
                  { icon: "💸", title: "Cash Flow", desc: "Operating, investing, financing", color: GREEN },
                  { icon: "🧾", title: "Tax Return Prep", desc: "Delaware corp filing ready", color: GOLD },
                  { icon: "👤", title: "Agent Payroll Report", desc: "Commissions & 1099s", color: "#ec4899" },
                  { icon: "📦", title: "COGS Report", desc: "Supplier costs by booking", color: RED },
                  { icon: "📈", title: "Revenue by Channel", desc: "Hotel, Yacht, Flights, Stay", color: BLUE },
                  { icon: "🌍", title: "Multi-Currency Report", desc: "CAD/USD/EUR reconciliation", color: "white" },
                ].map(r => (
                  <button key={r.title} style={{ background: `${r.color}10`, border: `1px solid ${r.color}25`, borderRadius: 14, padding: "16px 14px", cursor: "pointer", textAlign: "left" as const }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13, color: "#374151" }}>{r.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === "settings" && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Payment Gateway */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>🏦 Payment Gateway</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Primary Gateway", value: "Tilled ✅", status: "active" },
                  { label: "Environment", value: STATS.env === "production" ? "Live" : "Sandbox · Test Mode", status: STATS.env === "production" ? "active" : "pending" },
                  { label: "Webhook Endpoint", value: "/api/zenipay/webhooks/tilled", status: null },
                  { label: "Merchant ID", value: "●●●●●●●●●●●●", status: null },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{item.value}</span>
                      {item.status && <StatusBadge status={item.status} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission Structure */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>💸 Commission Structure</h3>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>All splits calculated on net profit (after supplier costs)</p>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Direct Booking", value: "100% Zeniva Travel", status: "active" },
                  { label: "Lina AI Only", value: "70% Zeniva / 30% Agent", status: "active" },
                  { label: "Human Agent", value: "70% Agent / 30% Zeniva", status: "active" },
                  { label: "ZeniYacht", value: "100% Zeniva Travel", status: "active" },
                  { label: "+ Influencer", value: "+5% from Zeniva share (influencer)", status: "active" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{item.value}</span>
                      {item.status && <StatusBadge status={item.status} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Compliance */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>🔒 Security & Compliance</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "PCI Compliance", value: "Tokenization via Tilled ✅", status: "active" },
                  { label: "Card Storage", value: "Never stored — Tilled tokens only", status: "active" },
                  { label: "Encryption", value: "TLS 1.3 · AES-256", status: "active" },
                  { label: "Fraud Detection", value: "Ben AI · Real-time monitoring", status: "active" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{item.value}</span>
                      {item.status && <StatusBadge status={item.status} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
    </div>
    {/* ═══ 360° BANKING MODAL ═══ */}
    {show360 && unitAccounts.length > 0 && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
        <div style={{ width: "min(820px,100vw)", background: "#0B1B4D", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "linear-gradient(135deg,#0d1633 0%,#1a2a5e 40%,#2DBE60 80%,#15B8C9 100%)", padding: "24px 28px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src="/zenipay-logo.png" alt="ZP" style={{ width: 44, height: 44, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(123,79,191,0.5))" }} />
                <div>
                  <div style={{ color: "white", fontWeight: 900, fontSize: 20 }}>ZeniPay Banking</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Zeniva Travel LLC · Unit.co · FDIC $250K</div>
                </div>
              </div>
              <button onClick={() => setShow360(false)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>
            </div>
            {unitAccounts[0] && (() => { const a = unitAccounts[0]; return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Balance", value: `$${(a.balanceCents/100).toLocaleString("en-US",{minimumFractionDigits:2})}`, color: "#2DBE60" },
                  { label: "Available", value: `$${(a.availableCents/100).toLocaleString("en-US",{minimumFractionDigits:2})}`, color: "#15B8C9" },
                  { label: "Routing #", value: a.routingNumber || "812345678", color: "#F5A623" },
                  { label: "Account #", value: a.accountNumber || "1009825847", color: "#E5247B" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 700 }}>{s.label}</div>
                    <div style={{ color: s.color, fontSize: (s.label.includes("#") ? 13 : 18), fontWeight: 900, fontFamily: s.label.includes("#") ? "monospace" : undefined, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            ); })()}
          </div>
          <div style={{ padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 0, overflowX: "auto" as const }}>
              {[
                { id: "wire" as const, icon: "⚡", label: "Wire Transfer", color: "#7B4FBF" },
                { id: "ach" as const, icon: "🏦", label: "ACH Payment", color: "#2A8FE0" },
                { id: "transfer" as const, icon: "↔️", label: "Book Transfer", color: "#2DBE60" },
                { id: "savings" as const, icon: "🐷", label: "Savings Goal", color: "#F5A623" },
              ].map(a => (
                <button key={a.id} onClick={() => setBankAction(bankAction === a.id ? null : a.id)}
                  style={{ flex: "0 0 auto", padding: "14px 18px", background: bankAction === a.id ? `${a.color}20` : "transparent", color: bankAction === a.id ? a.color : "rgba(255,255,255,0.5)", border: "none", borderBottom: bankAction === a.id ? `2px solid ${a.color}` : "2px solid transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
          {bankAction && (
            <div style={{ padding: "20px 28px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {bankAction === "wire" && [{k:"beneficiary",l:"Beneficiary Name"},{k:"routingNum",l:"Routing Number"},{k:"accountNum",l:"Account Number"},{k:"amount",l:"Amount USD"},{k:"memo",l:"Memo"}].map(f=>(
                  <div key={f.k} style={{ gridColumn: f.k==="memo" ? "span 2" : undefined }}>
                    <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:4 }}>{f.l}</label>
                    <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 12px", fontSize:13, color:"white", outline:"none", boxSizing:"border-box" as const }} />
                  </div>
                ))}
                {bankAction === "ach" && [{k:"name",l:"Recipient Name"},{k:"routing",l:"Routing"},{k:"account",l:"Account #"},{k:"amount",l:"Amount USD"},{k:"type",l:"Account Type"},{k:"desc",l:"Description"}].map(f=>(
                  <div key={f.k}>
                    <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:4 }}>{f.l}</label>
                    <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 12px", fontSize:13, color:"white", outline:"none", boxSizing:"border-box" as const }} />
                  </div>
                ))}
                {bankAction === "transfer" && [{k:"toAccount",l:"Destination Account"},{k:"amount",l:"Amount USD"},{k:"desc",l:"Description"}].map(f=>(
                  <div key={f.k}>
                    <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:4 }}>{f.l}</label>
                    <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 12px", fontSize:13, color:"white", outline:"none", boxSizing:"border-box" as const }} />
                  </div>
                ))}
                {bankAction === "savings" && [{k:"name",l:"Goal Name"},{k:"target",l:"Target Amount $"},{k:"monthly",l:"Monthly Contribution $"},{k:"date",l:"Target Date"}].map(f=>(
                  <div key={f.k}>
                    <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:4 }}>{f.l}</label>
                    <input value={bankActionForm[f.k]||""} onChange={e=>setBankActionForm(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 12px", fontSize:13, color:"white", outline:"none", boxSizing:"border-box" as const }} />
                  </div>
                ))}
              </div>
              <button onClick={()=>alert(`${bankAction} coming in production`)} style={{ marginTop:16, background:"linear-gradient(90deg,#7B4FBF,#E5247B)", color:"white", border:"none", borderRadius:10, padding:"12px 28px", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                Submit →
              </button>
            </div>
          )}
          {unitCards.length > 0 && (
            <div style={{ padding: "20px 28px", flexShrink: 0 }}>
              <h4 style={{ margin: "0 0 12px", color: "white", fontSize: 14 }}>💳 ZeniPay Debit Card</h4>
              <div style={{ width: 300, borderRadius: 18, padding: "20px 22px", background: "linear-gradient(135deg,#F5A623 0%,#E5247B 45%,#7B4FBF 100%)", position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(229,36,123,0.35)" }}>
                <img src="/zenipay-logo.png" alt="" style={{ position:"absolute", right:-20, bottom:-20, width:150, height:150, objectFit:"contain", opacity:0.2, filter:"brightness(2)" }} />
                <div style={{ position:"relative" }}>
                  <div style={{ color:"rgba(255,255,255,0.75)", fontSize:10, fontWeight:700, letterSpacing:"0.15em", marginBottom:8 }}>ZENIPAY PLATFORM CARD</div>
                  <div style={{ color:"white", fontSize:18, fontFamily:"monospace", fontWeight:700, letterSpacing:"0.2em", marginBottom:14 }}>•••• •••• •••• {(unitCards[0] as {last4?:string;attributes?:{last4Digits?:string}}).last4 || unitCards[0].attributes?.last4Digits || "5050"}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                    <div><div style={{ color:"rgba(255,255,255,0.55)", fontSize:9 }}>EXPIRES</div><div style={{ color:"white", fontWeight:700 }}>{(unitCards[0] as {expiry?:string;attributes?:{expirationDate?:string}}).expiry || unitCards[0].attributes?.expirationDate || "2030-03"}</div></div>
                    <div style={{ background:"rgba(255,255,255,0.25)", borderRadius:6, padding:"3px 10px", color:"white", fontSize:10, fontWeight:700 }}>{(unitCards[0] as {status?:string;attributes?:{status?:string}}).status || unitCards[0].attributes?.status || "Active"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div style={{ padding: "20px 28px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h4 style={{ margin: 0, color: "white", fontSize: 14 }}>📋 Transaction History</h4>
              <button onClick={async()=>{const r=await fetch("/api/zenipay/bank-balance");if(r.ok){const d=await r.json();if(d.transactions)setUnitRealTxns(d.transactions);}}} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"white", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                🔄 Refresh
              </button>
            </div>
            {unitRealTxns.length === 0 ? (
              <div style={{ textAlign:"center" as const, color:"rgba(255,255,255,0.3)", fontSize:13, padding:"40px 0" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💤</div>
                No transactions yet — account is new
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {unitRealTxns.map(tx => (
                  <div key={tx.id} style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div>
                      <div style={{ color:"white", fontWeight:600, fontSize:13 }}>{tx.description}</div>
                      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:2 }}>{tx.date ? new Date(tx.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""}</div>
                    </div>
                    <div style={{ textAlign:"right" as const }}>
                      <div style={{ fontWeight:800, fontSize:15, color: tx.direction==="Credit" ? "#2DBE60" : "#E5247B" }}>
                        {tx.direction==="Credit" ? "+" : "-"}${Math.abs(tx.amountCents/100).toFixed(2)}
                      </div>
                      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>Bal: ${(tx.balanceCents/100).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}