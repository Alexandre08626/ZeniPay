"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";

const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_BLUE   = "#2A8FE0";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD   = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

const fmt     = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const STATUS_COLOR: Record<string, string> = { active: "#16A34A", pending: "#D97706", inactive: "#94A3B8", failed: "#DC2626", live: "#16A34A", sandbox: "#D97706" };
const STATUS_BG:    Record<string, string> = { active: "rgba(22,163,74,0.08)", pending: "rgba(217,119,6,0.08)", inactive: "rgba(148,163,184,0.08)", failed: "rgba(220,38,38,0.08)", live: "rgba(22,163,74,0.08)", sandbox: "rgba(217,119,6,0.08)" };

const CLIENTS_DEFAULT = [{
  id: "cl-001", name: "Zeniva Travel LLC", domain: "zenivatravel.com",
  status: "active", volume: 0, txCount: 0, balance: 0,
  apiKey: "zpk_live_zeniva_****3k9", sandboxKey: "zpk_sandbox_zeniva_****7x2",
  plan: "Business", since: "2026-02-24", contact: "info@zenivatravel.com",
  gateway: "Tilled (Sandbox)", bankAccount: "Unit.co ••••5847",
  description: "AI-powered travel concierge platform",
}];

const GATEWAY_STATUS = { accountId: "acct_XlRKvhpbdl1UxJ9zINmoL", webhook: "https://zenipay.ca/api/zenipay/webhooks/tilled", fees: "2.9% + $0.30" };
const BANK_STATUS    = { routing: "812345678", account: "••••5847", balance: 0, customerId: "4647873" };

// ZeniPay's own platform revenue account — commissions auto-deposited here
const PLATFORM_ACCOUNT = {
  name: "ZeniPay Inc. — Platform Revenue",
  routing: "812345678",
  account: "••••9201",
  balance: 0,
  customerId: "ZP-PLATFORM-001",
  type: "Business Chequing (Unit.co)",
};

// Commission split rules per plan (ZeniPay margin after Tilled cost ~2.4%+$0.20)
const COMMISSION_RULES = [
  { plan: "Standard", charged: "2.9% + $0.30", tilled: "~2.4% + $0.20", zeniMargin: "~0.5% + $0.10", color: ZP_GREEN  },
  { plan: "Business",  charged: "2.5% + $0.25", tilled: "~2.4% + $0.20", zeniMargin: "~0.1% + $0.05", color: ZP_CYAN   },
  { plan: "Complete",  charged: "2.0% + $0.20", tilled: "~1.8% + $0.15", zeniMargin: "~0.2% + $0.05", color: ZP_PURPLE },
];

const NAV = [
  { key: "overview",     icon: "▦",  label: "Overview",     color: ZP_GREEN  },
  { key: "clients",      icon: "⊞",  label: "Clients",      color: ZP_CYAN   },
  { key: "transactions", icon: "↕",  label: "Transactions", color: ZP_BLUE   },
  { key: "payouts",      icon: "→",  label: "Payouts",      color: ZP_PURPLE },
  { key: "bank",         icon: "⬡",  label: "ZeniCard",     color: ZP_GREEN  },
  { key: "api",          icon: "⌥",  label: "API & Keys",   color: ZP_CYAN   },
  { key: "settings",     icon: "⚙",  label: "Settings",     color: ZP_PURPLE },
] as const;
type TabKey = typeof NAV[number]["key"];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab]               = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedKey, setCopiedKey]   = useState("");
  const [clientView, setClientView] = useState<string | null>(null);
  const [signups, setSignups]       = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sessionStorage.getItem("zp_admin")) { router.replace("/admin/login"); return; }
      try { setSignups(JSON.parse(localStorage.getItem("zp_accounts") || "[]")); } catch {}
    }
  }, [router]);

  const CLIENTS = [
    ...CLIENTS_DEFAULT,
    ...signups.map((s: any) => ({
      id: s.id, name: s.businessName, domain: s.website || "—",
      status: "sandbox", volume: 0, txCount: 0, balance: 0,
      apiKey: s.liveKey || "—", sandboxKey: s.sandboxKey,
      plan: s.plan || "Sandbox", since: s.createdAt?.slice(0, 10) || "—",
      contact: s.email, gateway: "Sandbox", bankAccount: "—",
      description: s.businessType || "New signup",
      // Full fiche fields
      ownerName: s.ownerName || "—",
      phone: s.phone || "—",
      country: s.country || "—",
      monthlyVolume: s.monthlyVolume || "—",
      notes: s.notes || "",
      createdAt: s.createdAt || "—",
    })),
  ];

  const logout  = () => { sessionStorage.removeItem("zp_admin"); router.replace("/admin/login"); };
  const copyKey = (key: string) => { navigator.clipboard.writeText(key).then(() => { setCopiedKey(key); setTimeout(() => setCopiedKey(""), 1800); }); };

  const BG      = "#F1F5F9";
  const SURFACE = "#FFFFFF";
  const BORDER  = "rgba(0,0,0,0.07)";
  const TEXT    = "#0F172A";
  const MUTED   = "#64748B";
  const LIGHT   = "#F8FAFC";

  const card  = (extra?: React.CSSProperties): React.CSSProperties => ({ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...extra });
  const badge = (s: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[s] ?? STATUS_BG.inactive, color: STATUS_COLOR[s] ?? STATUS_COLOR.inactive, border: `1px solid ${(STATUS_COLOR[s] ?? STATUS_COLOR.inactive)}33`, letterSpacing: "0.04em" });

  const currentTab = NAV.find(n => n.key === tab)!;

  // Initials avatar
  const Avatar = ({ name, size = 40, grad = false }: { name: string; size?: number; grad?: boolean }) => (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, background: grad ? ZP_GRAD : `linear-gradient(135deg, ${ZP_CYAN}44, ${ZP_PURPLE}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.38, color: grad ? "#fff" : ZP_PURPLE }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );

  // Metric card with coloured top bar
  const MetricCard = ({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) => (
    <div style={{ ...card(), overflow: "hidden" }}>
      <div style={{ height: 4, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: accent, letterSpacing: "-0.5px", marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 11, color: MUTED }}>{sub}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif", display: "flex" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: sidebarOpen ? 240 : 64, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.2s ease", overflow: "hidden" }}>

        {/* Logo area */}
        <div style={{ padding: "0 0 0", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
            <ZeniPayLogo size={36} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.3px" }}>ZeniPay</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>Admin Console</div>
              </div>
            )}
          </div>
        </div>

        {/* Sandbox badge */}
        {sidebarOpen && (
          <div style={{ margin: "12px 10px 4px", padding: "6px 10px", borderRadius: 10, background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706" }} />
            <div style={{ fontSize: 10, color: "#D97706", fontWeight: 700 }}>Sandbox · Tilled pending</div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 8px" }}>
          {NAV.map(({ key, icon, label, color }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} title={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: sidebarOpen ? "9px 12px" : "9px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                width: "100%", border: "none", cursor: "pointer",
                background: active ? color + "12" : "transparent",
                borderRadius: 10,
                color: active ? color : MUTED,
                fontSize: 13, fontWeight: active ? 700 : 500,
                transition: "all 0.15s", textAlign: "left",
                marginBottom: 2,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? color + "20" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, color: active ? color : MUTED, transition: "all 0.15s" }}>{icon}</div>
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "8px 8px 12px", borderTop: `1px solid ${BORDER}` }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", color: MUTED, fontSize: 16, borderRadius: 8 }} title="Toggle sidebar">
            {sidebarOpen ? "⟵" : "⟶"}
          </button>
          {sidebarOpen ? (
            <button onClick={logout} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span>⏻</span> Sign Out
            </button>
          ) : (
            <button onClick={logout} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", color: "#DC2626", fontSize: 16 }} title="Sign Out">⏻</button>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: currentTab.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: currentTab.color }}>{currentTab.icon}</div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>{currentTab.label}</h1>
            <span style={{ color: BORDER, fontSize: 16 }}>·</span>
            <span style={{ fontSize: 12, color: MUTED }}>ZeniPay Platform</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "5px 14px", borderRadius: 8, background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)", fontSize: 11, fontWeight: 700, color: "#D97706", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", display: "inline-block" }} /> Sandbox Mode
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>A</div>
          </div>
        </div>

        <div style={{ padding: "24px 28px", flex: 1 }}>

          {/* ════════════════ OVERVIEW ════════════════ */}
          {tab === "overview" && (
            <div>
              {/* Alert banner */}
              <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 12, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 20 }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: "#B45309", fontSize: 13 }}>Payment processor in Sandbox Mode</span>
                  <span style={{ color: "#92400E", fontSize: 13, marginLeft: 8 }}>— Complete Tilled live onboarding to accept real payments.</span>
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer" style={{ padding: "6px 16px", borderRadius: 8, background: "#D97706", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>Complete →</a>
              </div>

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 20 }}>
                <MetricCard label="Client Volume"      value={fmt(0)}  sub="All-time processed"  accent={ZP_GREEN}  icon="💰" />
                <MetricCard label="ZeniPay Earnings"   value={fmt(0)}  sub="Auto-deposited · ••••9201" accent={ZP_CYAN} icon="🏦" />
                <MetricCard label="Active Clients"     value={`${CLIENTS.length}`} sub={`${CLIENTS.filter(c=>c.status==="active").length} live · ${CLIENTS.filter(c=>c.status==="sandbox").length} sandbox`} accent={ZP_PURPLE} icon="🏢" />
                <MetricCard label="Pending Payouts"    value={fmt(0)}  sub="0 queued"            accent="#D97706"   icon="⏳" />
                <MetricCard label="Platform Balance"   value={fmt(PLATFORM_ACCOUNT.balance)} sub="ZeniPay ••••9201" accent={ZP_BLUE} icon="⚡" />
              </div>

              {/* Revenue chart + recent signups */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Revenue chart */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>Revenue — 2026</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Monthly processed volume</div>
                    </div>
                    <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(45,190,96,0.08)", border: "1px solid rgba(45,190,96,0.2)", fontSize: 11, fontWeight: 700, color: ZP_GREEN }}>Sandbox mode</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: TEXT, letterSpacing: "-1px", marginBottom: 20 }}>$0.00</div>
                  {/* Bar chart */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72, marginBottom: 8 }}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", height: i === 1 ? 72 : i === 0 ? 48 : 24, borderRadius: "4px 4px 0 0", background: i <= 2 ? `linear-gradient(180deg, ${ZP_GREEN}60, ${ZP_CYAN}40)` : "rgba(0,0,0,0.06)", transition: "height 0.3s" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED }}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <span key={m}>{m}</span>)}
                  </div>
                </div>

                {/* Recent signups */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Recent Signups</div>
                    <button onClick={() => setTab("clients")} style={{ fontSize: 12, color: ZP_GREEN, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>All →</button>
                  </div>
                  {CLIENTS.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: MUTED, fontSize: 13 }}>No clients yet</div>
                  ) : CLIENTS.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${BORDER}` }}>
                      <Avatar name={c.name} size={36} grad />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>{c.plan} · {fmtDate(c.since)}</div>
                      </div>
                      <div style={{ ...badge(c.status) }}><span style={{ fontSize: 7 }}>●</span> {c.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System status + next steps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>System Status</div>
                  {[
                    { name: "ZeniPay API",     status: "active",  note: "Operational",   icon: "🟢" },
                    { name: "Tilled Gateway",  status: "sandbox", note: "Sandbox only",  icon: "🟡" },
                    { name: "Unit.co Banking", status: "active",  note: "Connected",     icon: "🟢" },
                    { name: "Supabase DB",     status: "active",  note: "Connected",     icon: "🟢" },
                    { name: "Webhooks",        status: "active",  note: "Configured",    icon: "🟢" },
                    { name: "Live Payments",   status: "pending", note: "Pending Tilled approval", icon: "🟡" },
                  ].map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${BORDER}` }}>
                      <span style={{ fontSize: 10 }}>{s.icon}</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: STATUS_COLOR[s.status] ?? MUTED, fontWeight: 600 }}>{s.note}</div>
                    </div>
                  ))}
                </div>

                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Action Items</div>
                  {[
                    { n: "01", title: "Complete Tilled Live Approval", desc: "Required to accept real card payments.", urgent: true,  link: "https://app.tilled.com", cta: "Open Tilled →" },
                    { n: "02", title: "Integrate Zeniva API Key",       desc: "Connect zpk_live_zeniva to your site.",  urgent: true,  link: null, cta: "Copy key" },
                    { n: "03", title: "Auto Bank Transfers",            desc: "Automate wallet → Unit.co payouts.",     urgent: false, link: null, cta: "Coming soon" },
                    { n: "04", title: "Onboard 2nd Client",             desc: "Expand the ZeniPay platform.",           urgent: false, link: null, cta: "Coming soon" },
                  ].map(s => (
                    <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: `1px solid ${BORDER}` }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: s.urgent ? "rgba(220,38,38,0.1)" : "rgba(45,190,96,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: s.urgent ? "#DC2626" : ZP_GREEN, flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          {s.title}
                          {s.urgent && <span style={{ fontSize: 9, fontWeight: 800, color: "#DC2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", padding: "1px 6px", borderRadius: 5, letterSpacing: "0.04em" }}>URGENT</span>}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED }}>{s.desc}</div>
                      </div>
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: ZP_GREEN, textDecoration: "none", flexShrink: 0 }}>{s.cta}</a>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, flexShrink: 0 }}>{s.cta}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ CLIENTS ════════════════ */}
          {tab === "clients" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{CLIENTS.length} Client{CLIENTS.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Managed on the ZeniPay platform</div>
                </div>
                <button style={{ padding: "9px 20px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}>+ New Client</button>
              </div>

              {/* Summary row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Clients",   value: `${CLIENTS.length}`,                                              accent: ZP_PURPLE },
                  { label: "Live",            value: `${CLIENTS.filter(c => c.status === "active").length}`,           accent: ZP_GREEN  },
                  { label: "Sandbox",         value: `${CLIENTS.filter(c => c.status === "sandbox").length}`,          accent: "#D97706" },
                  { label: "Total Volume",    value: fmt(CLIENTS.reduce((a, c) => a + c.volume, 0)),                   accent: ZP_CYAN   },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "14px 16px" }), borderTop: `3px solid ${s.accent}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {CLIENTS.map(c => (
                <div key={c.id} style={{ ...card({ marginBottom: 14, overflow: "hidden" }) }}>
                  {/* Coloured top stripe */}
                  <div style={{ height: 3, background: c.status === "active" ? ZP_GRAD : "rgba(217,119,6,0.4)" }} />
                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <Avatar name={c.name} size={48} grad />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                          <div style={{ ...badge(c.status) }}><span style={{ fontSize: 7 }}>●</span> {c.status}</div>
                          <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(123,79,191,0.08)", color: ZP_PURPLE, border: `1px solid ${ZP_PURPLE}33` }}>{c.plan}</div>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>{c.domain} · {c.contact} · Since {fmtDate(c.since)}</div>
                        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", marginBottom: 12 }}>{c.description}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { k: "Volume",       v: fmt(c.volume),  accent: ZP_GREEN  },
                            { k: "Balance",      v: fmt(c.balance), accent: ZP_CYAN   },
                            { k: "Transactions", v: `${c.txCount}`, accent: ZP_BLUE   },
                            { k: "Gateway",      v: c.gateway,      accent: ZP_PURPLE },
                          ].map(s => (
                            <div key={s.k} style={{ padding: "5px 12px", borderRadius: 8, background: s.accent + "0D", border: `1px solid ${s.accent}22`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}: </span>
                              <span style={{ fontWeight: 700, color: s.accent }}>{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: TEXT }}>{fmt(c.volume)}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{c.txCount} transactions</div>
                        <button onClick={() => setClientView(clientView === c.id ? null : c.id)} style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, background: clientView === c.id ? ZP_GRAD : LIGHT, border: `1px solid ${clientView === c.id ? "transparent" : BORDER}`, fontSize: 12, fontWeight: 700, cursor: "pointer", color: clientView === c.id ? "#fff" : TEXT }}>
                          {clientView === c.id ? "Close ▲" : "Details ▼"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {clientView === c.id && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 24px", background: LIGHT }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>

                        {/* Business info */}
                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: ZP_GREEN, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Business Info</div>
                          {[
                            { k: "Business",  v: c.name },
                            { k: "Owner",     v: (c as any).ownerName || "—" },
                            { k: "Email",     v: c.contact },
                            { k: "Phone",     v: (c as any).phone || "—" },
                            { k: "Website",   v: c.domain },
                            { k: "Country",   v: (c as any).country || "—" },
                            { k: "Type",      v: c.description },
                            { k: "Est. Volume", v: (c as any).monthlyVolume || "—" },
                          ].map(s => (
                            <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}</span>
                              <span style={{ fontWeight: 600, maxWidth: 140, textAlign: "right", wordBreak: "break-all" }}>{s.v}</span>
                            </div>
                          ))}
                        </div>

                        {/* API Keys */}
                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: ZP_CYAN, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>API Keys</div>
                          {[
                            { label: "Live Key",    value: c.apiKey,     color: ZP_GREEN  },
                            { label: "Sandbox Key", value: c.sandboxKey, color: "#D97706" },
                          ].map(k => (
                            <div key={k.label} style={{ padding: "10px 12px", borderRadius: 10, background: k.color + "08", border: `1px solid ${k.color}22`, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: k.color, letterSpacing: "0.05em", marginBottom: 5 }}>{k.label.toUpperCase()}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <code style={{ fontSize: 11, flex: 1, color: TEXT, wordBreak: "break-all" }}>{k.value}</code>
                                <button onClick={() => copyKey(k.value)} style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${BORDER}`, background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : SURFACE, color: copiedKey === k.value ? "#16A34A" : MUTED, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                  {copiedKey === k.value ? "✓" : "Copy"}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: ZP_PURPLE, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Account</div>
                            {[
                              { k: "ID",         v: c.id },
                              { k: "Plan",       v: c.plan },
                              { k: "Since",      v: fmtDate(c.since) },
                              { k: "Status",     v: c.status },
                              { k: "Processor",  v: c.gateway },
                            ].map(s => (
                              <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                                <span style={{ color: MUTED }}>{s.k}</span>
                                <span style={{ fontWeight: 600 }}>{s.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ZeniCard */}
                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: ZP_PURPLE, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>ZeniCard Account</div>
                          {[
                            { k: "Provider",   v: "Unit.co",        color: ZP_CYAN   },
                            { k: "Account",    v: c.bankAccount,    color: TEXT      },
                            { k: "Routing",    v: "812345678",      color: TEXT      },
                            { k: "Balance",    v: fmt(c.balance),   color: ZP_GREEN  },
                            { k: "Volume",     v: fmt(c.volume),    color: ZP_PURPLE },
                            { k: "Tx Count",   v: `${c.txCount}`,  color: TEXT      },
                          ].map(s => (
                            <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}</span>
                              <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                            </div>
                          ))}
                          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: ZP_GREEN + "08", border: `1px solid ${ZP_GREEN}22` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: ZP_GREEN, marginBottom: 4 }}>ZeniPay commission (auto)</div>
                            <div style={{ fontSize: 12, color: MUTED }}>Splits automatically on every transaction → Platform account ••••9201</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {[
                          { label: "Manage Payouts", grad: true   },
                          { label: "View Transactions", grad: false },
                          { label: "Regenerate Keys",   grad: false },
                          { label: "Upgrade Plan",      grad: false },
                          { label: "Suspend Client",    danger: true },
                        ].map((a) => (
                          <button key={a.label} style={{ padding: "8px 16px", borderRadius: 9, background: a.grad ? ZP_GRAD : SURFACE, border: (a as any).danger ? "1px solid rgba(220,38,38,0.3)" : `1px solid ${BORDER}`, color: a.grad ? "#fff" : (a as any).danger ? "#DC2626" : TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: a.grad ? "0 4px 12px rgba(45,190,96,0.2)" : "none" }}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ ...card({ padding: "28px", textAlign: "center", borderStyle: "dashed", borderColor: "rgba(45,190,96,0.25)", background: "rgba(45,190,96,0.02)" }) }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px", color: "#fff" }}>+</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Onboard a new client</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, maxWidth: 360, margin: "0 auto 16px" }}>Each client gets a ZeniCard account, dedicated API keys, and a full dashboard.</div>
                <button style={{ padding: "10px 28px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(45,190,96,0.25)" }}>+ New Client</button>
              </div>
            </div>
          )}

          {/* ════════════════ TRANSACTIONS ════════════════ */}
          {tab === "transactions" && (
            <div>
              <div style={{ ...card({ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }) }}>
                {["All clients", "Zeniva Travel LLC"].map((o, i) => (
                  <select key={i} defaultValue={o} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                    {i === 0 ? ["All clients", "Zeniva Travel LLC"].map(v => <option key={v}>{v}</option>) : ["All statuses","Succeeded","Pending","Failed"].map(v => <option key={v}>{v}</option>)}
                  </select>
                ))}
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  {["Last 7 days","30 days","90 days","All time"].map(v => <option key={v}>{v}</option>)}
                </select>
                <div style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>0 transactions found</div>
              </div>

              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "8px 16px", marginBottom: 4 }}>
                {["Client / Description","Amount","Status","Method","Date"].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>

              <div style={{ ...card({ padding: "60px 20px", textAlign: "center" }) }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(45,190,96,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>↕</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>No transactions yet</div>
                <div style={{ fontSize: 13, color: MUTED, maxWidth: 380, margin: "0 auto 24px" }}>Transactions will appear once Tilled live approval is complete and a client integrates the ZeniPay API.</div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer" style={{ padding: "10px 24px", borderRadius: 10, background: ZP_GRAD, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}>
                  Complete Tilled Onboarding →
                </a>
              </div>
            </div>
          )}

          {/* ════════════════ PAYOUTS ════════════════ */}
          {tab === "payouts" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Total Paid Out",    value: fmt(0), accent: ZP_GREEN  },
                  { label: "Pending",            value: fmt(0), accent: "#D97706" },
                  { label: "Platform Volume",    value: fmt(0), accent: ZP_PURPLE },
                  { label: "Payouts This Month", value: "0",    accent: ZP_CYAN   },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "18px" }), borderTop: `3px solid ${s.accent}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Flow diagram */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>How ZeniPay Payouts Work</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    { step: "01", icon: "💳", title: "Customer Pays",      desc: "Payment accepted via API or payment link. Funds credited instantly.", color: ZP_GREEN  },
                    { step: "02", icon: "⚡", title: "ZeniCard Credited",   desc: "Money lands in the client's ZeniCard (chequing/savings) immediately.", color: ZP_CYAN   },
                    { step: "03", icon: "🏦", title: "Bank Transfer Out",   desc: "Client pays suppliers, employees, or withdraws to their bank.", color: ZP_PURPLE },
                    { step: "04", icon: "📒", title: "Ledger Updated",      desc: "Every movement recorded. Export to QuickBooks/Xero at any time.", color: ZP_BLUE   },
                  ].map(s => (
                    <div key={s.step} style={{ padding: "16px", borderRadius: 12, background: s.color + "08", border: `1px solid ${s.color}22` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{s.icon}</div>
                        <span style={{ fontSize: 10, fontWeight: 900, color: s.color, letterSpacing: "0.06em" }}>STEP {s.step}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: TEXT }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client wallet balances */}
              <div style={{ ...card({ padding: "22px", marginBottom: 16 }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>All ZeniCard Balances</div>
                  <div style={{ fontSize: 12, color: MUTED }}>Real-time</div>
                </div>

                {/* ZeniPay platform account row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${BORDER}`, background: ZP_CYAN + "06", borderRadius: 10, paddingLeft: 12, paddingRight: 12, marginBottom: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 }}>Z</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>ZeniPay Platform <span style={{ fontSize: 10, fontWeight: 700, color: ZP_CYAN, background: ZP_CYAN + "15", border: `1px solid ${ZP_CYAN}33`, borderRadius: 6, padding: "1px 7px", marginLeft: 4 }}>PLATFORM</span></div>
                    <div style={{ fontSize: 11, color: MUTED }}>Auto-commission account · Unit.co {PLATFORM_ACCOUNT.account}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: ZP_CYAN }}>{fmt(PLATFORM_ACCOUNT.balance)}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Platform earnings</div>
                  </div>
                  <button style={{ padding: "7px 16px", borderRadius: 8, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Withdraw →</button>
                </div>

                {CLIENTS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${BORDER}` }}>
                    <Avatar name={c.name} size={40} grad />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>ZeniCard · {c.bankAccount}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: ZP_GREEN }}>{fmt(c.balance)}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>Available balance</div>
                    </div>
                    <button style={{ padding: "7px 16px", borderRadius: 8, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 8px rgba(45,190,96,0.2)" }}>Payout →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ ZENICARD / BANKING ════════════════ */}
          {tab === "bank" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

                {/* Unit.co */}
                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>ZeniCard — Unit.co</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Business bank account</div>
                    </div>
                    <div style={{ ...badge("active") }}><span style={{ fontSize: 7 }}>●</span> Active</div>
                  </div>
                  {[
                    { k: "Provider",          v: "Unit.co",               color: ZP_CYAN   },
                    { k: "Customer ID",       v: BANK_STATUS.customerId,  color: TEXT      },
                    { k: "Routing Number",    v: BANK_STATUS.routing,     color: TEXT      },
                    { k: "Account Number",    v: BANK_STATUS.account,     color: TEXT      },
                    { k: "Available Balance", v: fmt(BANK_STATUS.balance), color: ZP_GREEN },
                    { k: "Account Type",      v: "Business Chequing",     color: ZP_PURPLE },
                    { k: "Debit Card",        v: "Virtual Visa",          color: ZP_BLUE   },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                    </div>
                  ))}
                  <button style={{ marginTop: 16, width: "100%", padding: "10px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.2)" }}>Open Unit.co →</button>
                </div>

                {/* ZeniCard visual */}
                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>ZeniCard Debit</div>
                  {/* Card visual */}
                  <div style={{ borderRadius: 18, padding: "22px 24px", marginBottom: 20, background: ZP_GRAD, position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(45,190,96,0.25)", minHeight: 140 }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ position: "absolute", bottom: -40, left: -10, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.15em", marginBottom: 24, fontWeight: 700 }}>ZENIPAY · ZENICARD</div>
                    <div style={{ fontSize: 16, letterSpacing: "0.18em", color: "#fff", fontWeight: 700, marginBottom: 20 }}>•••• •••• •••• 5847</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>CARDHOLDER</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 800 }}>ZENIVA TRAVEL LLC</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>EXPIRES</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>12/28</div>
                      </div>
                    </div>
                  </div>
                  {[
                    { k: "Card Type",    v: "Virtual Visa Debit",   color: ZP_CYAN   },
                    { k: "Card ID",      v: "5487715",              color: TEXT      },
                    { k: "Status",       v: "Active",               color: ZP_GREEN  },
                    { k: "Linked to",    v: "Unit.co ••••5847",     color: TEXT      },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ZeniPay Platform Revenue Account */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_CYAN}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>ZeniPay Platform Revenue Account</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Commissions automatically deposited here on every transaction</div>
                  </div>
                  <div style={{ ...badge("active") }}><span style={{ fontSize: 7 }}>●</span> Active</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    {[
                      { k: "Account Name",  v: PLATFORM_ACCOUNT.name,       color: TEXT      },
                      { k: "Account Type",  v: PLATFORM_ACCOUNT.type,        color: ZP_PURPLE },
                      { k: "Routing",       v: PLATFORM_ACCOUNT.routing,     color: TEXT      },
                      { k: "Account No.",   v: PLATFORM_ACCOUNT.account,     color: TEXT      },
                      { k: "Balance",       v: fmt(PLATFORM_ACCOUNT.balance), color: ZP_GREEN },
                      { k: "Customer ID",   v: PLATFORM_ACCOUNT.customerId,  color: MUTED     },
                    ].map(s => (
                      <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                        <span style={{ color: MUTED }}>{s.k}</span>
                        <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Commission flow visual */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Auto Commission Flow</div>
                    {[
                      { label: "Client pays",        sub: "e.g. $100.00",       color: ZP_GREEN,  icon: "💳" },
                      { label: "Tilled processing",  sub: "~2.4% + $0.20 cost", color: "#D97706", icon: "⚙️" },
                      { label: "ZeniPay margin",     sub: "auto → ••••9201",    color: ZP_CYAN,   icon: "🏦" },
                      { label: "Client net",         sub: "lands in ZeniCard",  color: ZP_PURPLE, icon: "⚡" },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${BORDER}` : "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{s.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>{s.sub}</div>
                        </div>
                        {i < 3 && <div style={{ fontSize: 14, color: MUTED }}>↓</div>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commission rules per plan */}
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Commission Rules by Plan</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {COMMISSION_RULES.map(r => (
                    <div key={r.plan} style={{ padding: "12px 14px", borderRadius: 12, background: r.color + "08", border: `1px solid ${r.color}22` }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: r.color, marginBottom: 8 }}>{r.plan}</div>
                      {[
                        { k: "Charged to client", v: r.charged },
                        { k: "Tilled cost",        v: r.tilled  },
                        { k: "ZeniPay margin →••••9201", v: r.zeniMargin, bold: true },
                      ].map(s => (
                        <div key={s.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${r.color}18` }}>
                          <span style={{ color: MUTED }}>{s.k}</span>
                          <span style={{ fontWeight: (s as any).bold ? 800 : 600, color: (s as any).bold ? r.color : TEXT }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tilled gateway */}
              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Payment Processor — Tilled</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Incoming payment gateway · Visa, Mastercard, Amex, Discover</div>
                  </div>
                  <div style={{ ...badge("sandbox") }}><span style={{ fontSize: 7 }}>◎</span> Sandbox</div>
                </div>
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)", marginBottom: 16, fontSize: 13, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚠️</span> Tilled is in sandbox — complete live onboarding to accept real card payments.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    { k: "Account ID",   v: GATEWAY_STATUS.accountId,  color: ZP_CYAN   },
                    { k: "Environment",  v: "Sandbox",                  color: "#D97706" },
                    { k: "Fees",         v: GATEWAY_STATUS.fees,        color: ZP_GREEN  },
                    { k: "Webhook URL",  v: GATEWAY_STATUS.webhook,     color: TEXT      },
                  ].map(s => (
                    <div key={s.k} style={{ padding: "12px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 5 }}>{s.k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.color, wordBreak: "break-all" }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: ZP_GRAD, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}>
                  Complete Tilled Live Onboarding →
                </a>
              </div>
            </div>
          )}

          {/* ════════════════ API & KEYS ════════════════ */}
          {tab === "api" && (
            <div>
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Client API Keys</div>
                {CLIENTS.map(c => (
                  <div key={c.id} style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={c.name} size={32} grad />
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      </div>
                      <div style={{ ...badge(c.status) }}><span style={{ fontSize: 7 }}>●</span> {c.status}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Live Key",    value: c.apiKey,     color: ZP_GREEN  },
                        { label: "Sandbox Key", value: c.sandboxKey, color: "#D97706" },
                      ].map(k => (
                        <div key={k.label} style={{ padding: "10px 14px", borderRadius: 10, background: k.color + "08", border: `1px solid ${k.color}22`, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: k.color, letterSpacing: "0.05em", minWidth: 80 }}>{k.label}</span>
                          <code style={{ flex: 1, fontSize: 13, color: TEXT }}>{k.value}</code>
                          <button onClick={() => copyKey(k.value)} style={{ padding: "4px 12px", borderRadius: 6, background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : SURFACE, border: `1px solid ${BORDER}`, color: copiedKey === k.value ? "#16A34A" : MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            {copiedKey === k.value ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>ZeniPay REST API</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
                  Base URL: <code style={{ background: ZP_PURPLE + "12", color: ZP_PURPLE, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>https://zenipay.ca/api/v1</code>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { m: "POST",   p: "/payments",     d: "Create a payment intent",         tag: "Payments",     tc: ZP_GREEN  },
                    { m: "GET",    p: "/payments/:id", d: "Retrieve a payment",              tag: "Payments",     tc: ZP_CYAN   },
                    { m: "GET",    p: "/transactions", d: "List all transactions",           tag: "Transactions", tc: ZP_CYAN   },
                    { m: "GET",    p: "/balance",      d: "Get ZeniCard balance",            tag: "ZeniCard",     tc: ZP_BLUE   },
                    { m: "POST",   p: "/payouts",      d: "Trigger a payout",               tag: "Payouts",      tc: ZP_GREEN  },
                    { m: "POST",   p: "/pay-links",    d: "Create a payment link",          tag: "Links",        tc: ZP_GREEN  },
                    { m: "GET",    p: "/pay-links",    d: "List payment links",             tag: "Links",        tc: ZP_CYAN   },
                    { m: "GET",    p: "/clients",      d: "List platform clients (admin)",  tag: "Admin",        tc: ZP_PURPLE },
                    { m: "POST",   p: "/provision",    d: "Provision a ZeniCard account",   tag: "ZeniCard",     tc: ZP_GREEN  },
                    { m: "GET",    p: "/accounting",   d: "Accounting & ledger summary",    tag: "Accounting",   tc: ZP_CYAN   },
                    { m: "DELETE", p: "/pay-links/:id", d: "Expire a payment link",         tag: "Links",        tc: "#DC2626"  },
                  ].map((e, i) => {
                    const mc = e.m === "POST" ? { bg: "rgba(22,163,74,0.1)", txt: ZP_GREEN } : e.m === "GET" ? { bg: "rgba(42,143,224,0.1)", txt: ZP_BLUE } : { bg: "rgba(220,38,38,0.1)", txt: "#DC2626" };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: i % 2 === 0 ? LIGHT : SURFACE, border: `1px solid ${BORDER}` }}>
                        <div style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, minWidth: 52, textAlign: "center", background: mc.bg, color: mc.txt }}>{e.m}</div>
                        <code style={{ fontSize: 13, flex: 1, color: TEXT }}>/api/v1{e.p}</code>
                        <span style={{ fontSize: 12, color: MUTED }}>{e.d}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: e.tc + "12", color: e.tc, border: `1px solid ${e.tc}22` }}>{e.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ SETTINGS ════════════════ */}
          {tab === "settings" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { title: "Platform", color: ZP_GREEN, rows: [
                  { k: "Name",         v: "ZeniPay" },
                  { k: "Admin Email",  v: "admin@zenipay.ca" },
                  { k: "Support",      v: "info@zenipay.ca" },
                  { k: "Website",      v: "zenipay.ca" },
                  { k: "Version",      v: "1.0.0" },
                ]},
                { title: "Tilled Processor", color: ZP_CYAN, action: { label: "Tilled Portal →", href: "https://app.tilled.com" }, rows: [
                  { k: "Account ID",   v: "acct_XlRKvhpb..." },
                  { k: "Environment",  v: "Sandbox" },
                  { k: "Fees",         v: "2.9% + $0.30" },
                  { k: "Webhook",      v: "/api/.../tilled" },
                  { k: "HMAC",         v: "Enabled" },
                ]},
                { title: "Unit.co Banking", color: ZP_PURPLE, rows: [
                  { k: "Routing",     v: "812345678" },
                  { k: "Account",     v: "••••5847" },
                  { k: "Customer ID", v: "4647873" },
                  { k: "Card ID",     v: "5487715" },
                  { k: "Status",      v: "Active" },
                ]},
                { title: "Chart of Accounts", color: ZP_BLUE, rows: [
                  { k: "1000", v: "Platform Wallet · Asset" },
                  { k: "2000", v: "Commissions Payable · Liability" },
                  { k: "4000", v: "Travel Revenue · Revenue" },
                  { k: "5000", v: "Agent Commissions · Expense" },
                  { k: "5100", v: "Processor Fees · Expense" },
                ]},
              ].map(section => (
                <div key={section.title} style={{ ...card({ padding: "24px" }), borderTop: `3px solid ${section.color}` }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: section.color }}>{section.title}</div>
                  {section.rows.map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                  {(section as any).action && (
                    <a href={(section as any).action.href} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "8px 18px", borderRadius: 9, background: ZP_GRAD, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      {(section as any).action.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
