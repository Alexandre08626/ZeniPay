"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const statusColor = (s: string) => ({
  active: "#16A34A", pending: "#D97706", inactive: "#94A3B8", failed: "#DC2626", live: "#16A34A", sandbox: "#D97706",
}[s] ?? "#94A3B8");

const statusBg = (s: string) => ({
  active: "rgba(22,163,74,0.08)", pending: "rgba(217,119,6,0.08)", inactive: "rgba(148,163,184,0.08)",
  failed: "rgba(220,38,38,0.08)", live: "rgba(22,163,74,0.08)", sandbox: "rgba(217,119,6,0.08)",
}[s] ?? "rgba(148,163,184,0.08)");

const CLIENTS = [
  {
    id: "cl-001", name: "Zeniva Travel LLC", domain: "zenivatravel.com",
    status: "active", volume: 0, txCount: 0, balance: 0,
    apiKey: "zpk_live_zeniva_****3k9", sandboxKey: "zpk_sandbox_zeniva_****7x2",
    plan: "Business", since: "2026-02-24", contact: "info@zenivatravel.com",
    gateway: "Tilled (Sandbox)", bankAccount: "Unit.co ••••5847",
    description: "AI-powered travel concierge platform",
  },
];

const GATEWAY_STATUS = {
  accountId: "acct_XlRKvhpbdl1UxJ9zINmoL",
  webhook: "https://zenipay.ca/api/zenipay/webhooks/tilled",
  fees: "2.9% + $0.30",
};

const BANK_STATUS = {
  routing: "812345678",
  account: "••••5847",
  balance: 0,
  customerId: "4647873",
};

const NAV = [
  { key: "overview",      icon: "◈",  label: "Overview" },
  { key: "clients",       icon: "⊞",  label: "Clients" },
  { key: "transactions",  icon: "↕",  label: "Transactions" },
  { key: "payouts",       icon: "→",  label: "Payouts" },
  { key: "bank",          icon: "⬡",  label: "Banking" },
  { key: "api",           icon: "⌥",  label: "API & Keys" },
  { key: "settings",      icon: "⚙",  label: "Settings" },
] as const;

type TabKey = typeof NAV[number]["key"];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");
  const [clientView, setClientView] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sessionStorage.getItem("zp_admin")) {
        router.replace("/admin/login");
      }
    }
  }, [router]);

  const logout = () => {
    sessionStorage.removeItem("zp_admin");
    router.replace("/admin/login");
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    });
  };

  const BG      = "#F0F4F8";
  const SURFACE = "#FFFFFF";
  const BORDER  = "rgba(0,0,0,0.07)";
  const TEXT    = "#0F172A";
  const MUTED   = "#64748B";
  const LIGHT   = "#F8FAFC";

  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: SURFACE, borderRadius: 18, border: `1px solid ${BORDER}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...extra,
  });

  const badge = (status: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: statusBg(status), color: statusColor(status),
    border: `1px solid ${statusColor(status)}33`,
    letterSpacing: "0.04em",
  });

  const currentTab = NAV.find(n => n.key === tab);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif", display: "flex" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 232 : 64, flexShrink: 0, background: SURFACE,
        borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s ease", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 16px 0", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <ZeniPayLogo size={38} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.3px" }}>ZeniPay</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginTop: 1 }}>Admin Console</div>
              </div>
            )}
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(({ key, icon, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} title={label} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: sidebarOpen ? "10px 16px" : "10px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                width: "100%", border: "none", cursor: "pointer",
                background: active ? "rgba(45,190,96,0.08)" : "transparent",
                borderLeft: `3px solid ${active ? "#2DBE60" : "transparent"}`,
                color: active ? "#16A34A" : MUTED,
                fontSize: 13, fontWeight: active ? 700 : 500,
                transition: "all 0.15s", textAlign: "left",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "0 10px 16px" }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{
            width: "100%", padding: "8px 0", marginBottom: 8,
            border: "none", background: "transparent", cursor: "pointer",
            color: MUTED, fontSize: 18,
          }} title="Toggle sidebar">
            {sidebarOpen ? "←" : "→"}
          </button>
          <button onClick={logout} style={{
            width: "100%", padding: "9px 10px", borderRadius: 10,
            background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)",
            color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", gap: 8,
          }}>
            <span>⏻</span>{sidebarOpen && "Sign Out"}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* Top bar */}
        <div style={{
          background: SURFACE, borderBottom: `1px solid ${BORDER}`,
          padding: "0 32px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, color: MUTED }}>{currentTab?.icon}</span>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>
              {currentTab?.label}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8,
              background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)",
              fontSize: 11, fontWeight: 700, color: "#D97706",
            }}>
              <span style={{ fontSize: 7 }}>◎</span> Sandbox — Tilled pending approval
            </div>
            <div style={{ width: 1, height: 24, background: BORDER }} />
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: ZP_GRAD,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 900, fontSize: 13, flexShrink: 0,
            }}>A</div>
          </div>
        </div>

        <div style={{ padding: "28px 32px" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              <div style={{
                marginBottom: 24, padding: "12px 18px", borderRadius: 14,
                background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)",
                display: "flex", alignItems: "center", gap: 12, fontSize: 13,
              }}>
                <span style={{ fontSize: 20 }}>⚠</span>
                <div>
                  <span style={{ fontWeight: 700, color: "#B45309" }}>Processor in Sandbox Mode</span>
                  <span style={{ color: "#92400E", marginLeft: 8 }}>— Pending Tilled live approval to accept real payments.</span>
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                  style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "#D97706", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Complete →
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Total Volume",    value: fmt(0), sub: "All time",           accent: "#2DBE60", icon: "💰" },
                  { label: "Platform Fees",   value: fmt(0), sub: "2.9% + $0.30",       accent: "#15B8C9", icon: "📊" },
                  { label: "Active Clients",  value: "1",    sub: "Zeniva Travel LLC",  accent: "#7B4FBF", icon: "🏢" },
                  { label: "Pending Payouts", value: fmt(0), sub: "0 pending",          accent: "#D97706", icon: "⏳" },
                  { label: "Success Rate",    value: "—",    sub: "No data yet",        accent: "#2DBE60", icon: "✓" },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "20px" }) }}>
                    <div style={{ fontSize: 22, marginBottom: 12 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.accent, letterSpacing: "-0.5px" }}>{s.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginTop: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Clients</div>
                    <button onClick={() => setTab("clients")} style={{ fontSize: 12, color: "#2DBE60", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                      View all →
                    </button>
                  </div>
                  {CLIENTS.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${BORDER}` }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: ZP_GRAD,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 900, fontSize: 15, color: "#fff",
                      }}>Z</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>{c.domain}</div>
                      </div>
                      <div style={{ ...badge(c.status) }}>
                        <span style={{ fontSize: 7 }}>●</span> Active
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>System Status</div>
                  {[
                    { name: "ZeniPay API",     status: "active",  note: "Operational" },
                    { name: "Tilled Gateway",  status: "sandbox", note: "Sandbox only" },
                    { name: "Unit.co Banking", status: "active",  note: "Account active" },
                    { name: "Supabase DB",     status: "active",  note: "Connected" },
                    { name: "Webhooks",        status: "active",  note: "Configured" },
                  ].map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${BORDER}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(s.status), flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{s.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "22px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Critical Next Steps</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {[
                    { step: "01", title: "Tilled Live Approval", desc: "Complete the Tilled onboarding to enable real payments for Zeniva Travel.", urgent: true, action: "Open Tilled", link: "https://app.tilled.com" },
                    { step: "02", title: "Zeniva API Key Setup", desc: "Integrate zpk_live_zeniva into the Zeniva Travel site to start accepting payments.", urgent: true, action: "Copy key", link: null },
                    { step: "03", title: "ZeniPay Landing Page", desc: "ZeniPay presentation page on zeniva.com to onboard future clients.", urgent: false, action: "Coming soon", link: null },
                    { step: "04", title: "Auto Bank Transfers", desc: "Automatically wire client wallets to their real Unit.co bank account.", urgent: false, action: "Coming soon", link: null },
                  ].map(s => (
                    <div key={s.step} style={{
                      padding: "16px", borderRadius: 12,
                      background: s.urgent ? "rgba(220,38,38,0.03)" : LIGHT,
                      border: `1px solid ${s.urgent ? "rgba(220,38,38,0.15)" : BORDER}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 8,
                          background: s.urgent ? "rgba(220,38,38,0.1)" : "rgba(45,190,96,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 900, color: s.urgent ? "#DC2626" : "#16A34A",
                        }}>{s.step}</div>
                        {s.urgent && <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", letterSpacing: "0.04em" }}>URGENT</span>}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 10 }}>{s.desc}</div>
                      {s.link ? (
                        <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#2DBE60", textDecoration: "none" }}>
                          {s.action} →
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{s.action}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CLIENTS ── */}
          {tab === "clients" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: MUTED }}>
                  {CLIENTS.length} client{CLIENTS.length > 1 ? "s" : ""} · ZeniPay Platform
                </div>
                <button style={{
                  padding: "9px 20px", borderRadius: 10, background: ZP_GRAD,
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
                }}>
                  + New Client
                </button>
              </div>

              {CLIENTS.map(c => (
                <div key={c.id} style={{ ...card({ marginBottom: 16, overflow: "hidden" }) }}>
                  <div style={{ padding: "22px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: ZP_GRAD,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 900, fontSize: 20, color: "#fff",
                      }}>Z</div>

                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 17 }}>{c.name}</div>
                          <div style={{ ...badge(c.status) }}>
                            <span style={{ fontSize: 7 }}>●</span> Active
                          </div>
                          <div style={{ ...badge("sandbox") }}>
                            <span style={{ fontSize: 7 }}>◎</span> Sandbox
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
                          {c.domain} · {c.contact} · Client since {fmtDate(c.since)}
                        </div>
                        <div style={{ fontSize: 13, color: MUTED, fontStyle: "italic", marginBottom: 12 }}>{c.description}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { k: "Volume", v: fmt(c.volume) },
                            { k: "Balance", v: fmt(c.balance) },
                            { k: "Transactions", v: `${c.txCount}` },
                            { k: "Plan", v: c.plan },
                            { k: "ID", v: c.id },
                          ].map(s => (
                            <div key={s.k} style={{ padding: "5px 12px", borderRadius: 8, background: LIGHT, border: `1px solid ${BORDER}`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}: </span>
                              <span style={{ fontWeight: 700 }}>{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: TEXT }}>{fmt(c.volume)}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{c.txCount} transactions</div>
                        <button
                          onClick={() => setClientView(clientView === c.id ? null : c.id)}
                          style={{
                            marginTop: 10, padding: "6px 14px", borderRadius: 8,
                            background: LIGHT, border: `1px solid ${BORDER}`,
                            fontSize: 12, fontWeight: 700, cursor: "pointer", color: TEXT,
                          }}
                        >
                          {clientView === c.id ? "Close ▲" : "Details ▼"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {clientView === c.id && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 24px", background: LIGHT }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: MUTED }}>API KEYS</div>
                          {[
                            { label: "Live Key",    value: c.apiKey,      color: "#16A34A" },
                            { label: "Sandbox Key", value: c.sandboxKey,  color: "#D97706" },
                          ].map(k => (
                            <div key={k.label} style={{ padding: "10px 14px", borderRadius: 10, background: SURFACE, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: k.color, letterSpacing: "0.05em", marginBottom: 4 }}>{k.label}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <code style={{ fontSize: 13, flex: 1, color: TEXT }}>{k.value}</code>
                                <button
                                  onClick={() => copyKey(k.value)}
                                  style={{
                                    padding: "3px 10px", borderRadius: 6, border: `1px solid ${BORDER}`,
                                    background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : LIGHT,
                                    color: copiedKey === k.value ? "#16A34A" : MUTED,
                                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                                  }}
                                >
                                  {copiedKey === k.value ? "✓ Copied" : "Copy"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: MUTED }}>BANK ACCOUNT</div>
                          {[
                            { k: "Provider",       v: "Unit.co" },
                            { k: "Account",        v: c.bankAccount },
                            { k: "Routing Number", v: "812345678" },
                            { k: "Processor",      v: c.gateway },
                          ].map(s => (
                            <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                              <span style={{ color: MUTED }}>{s.k}</span>
                              <span style={{ fontWeight: 700 }}>{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {["Manage Payouts", "View Transactions", "Regenerate Keys", "Suspend"].map((a, i) => (
                          <button key={a} style={{
                            padding: "8px 16px", borderRadius: 9,
                            background: i === 0 ? ZP_GRAD : SURFACE,
                            border: i === 3 ? "1px solid rgba(220,38,38,0.25)" : `1px solid ${BORDER}`,
                            color: i === 0 ? "#fff" : i === 3 ? "#DC2626" : TEXT,
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            boxShadow: i === 0 ? "0 4px 12px rgba(45,190,96,0.2)" : "none",
                          }}>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div style={{
                ...card({ padding: "28px", textAlign: "center", borderStyle: "dashed", borderColor: "rgba(45,190,96,0.2)" }),
                background: "rgba(45,190,96,0.02)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>+</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Add a new client</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
                  Each client gets a real bank account, API keys, a dedicated dashboard, and separate wallets.
                </div>
                <button style={{ padding: "10px 24px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  + New Client
                </button>
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {tab === "transactions" && (
            <div>
              <div style={{ ...card({ padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }) }}>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>All clients</option>
                  <option>Zeniva Travel LLC</option>
                </select>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>All statuses</option>
                  <option>Succeeded</option><option>Pending</option><option>Failed</option>
                </select>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>Last 7 days</option><option>30 days</option><option>90 days</option><option>All time</option>
                </select>
                <div style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>0 transactions</div>
              </div>

              <div style={{ ...card({ padding: "60px 20px", textAlign: "center" }) }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>↕</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>No transactions yet</div>
                <div style={{ fontSize: 13, color: MUTED, maxWidth: 380, margin: "0 auto 20px" }}>
                  Transactions will appear here once Tilled Live approval is complete and Zeniva Travel integrates the ZeniPay API key.
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer" style={{
                  padding: "10px 24px", borderRadius: 10, background: ZP_GRAD,
                  color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block",
                }}>
                  Complete Tilled Onboarding →
                </a>
              </div>
            </div>
          )}

          {/* ── PAYOUTS ── */}
          {tab === "payouts" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "Total Paid Out",     value: fmt(0), accent: "#2DBE60" },
                  { label: "Pending",             value: fmt(0), accent: "#D97706" },
                  { label: "Platform Volume",     value: fmt(0), accent: "#7B4FBF" },
                  { label: "Payouts This Month",  value: "0",    accent: "#15B8C9" },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "18px" }) }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>How ZeniPay Works</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {[
                    { step: "01", icon: "💳", title: "Payment Received", desc: "The business's customer pays via ZeniPay (link or API). Funds land in the business wallet." },
                    { step: "02", icon: "⬡", title: "Business Wallet", desc: "The business sees their balance in real time in their dashboard. Their money, their account." },
                    { step: "03", icon: "🏦", title: "Bank Transfer", desc: "ZeniPay wires directly to the business's real bank account (Unit.co). Coming soon: automatic." },
                    { step: "04", icon: "📊", title: "Built-in Accounting", desc: "Every transaction is recorded in the ledger. Export available at any time." },
                  ].map(s => (
                    <div key={s.step} style={{ padding: "16px", borderRadius: 12, background: LIGHT, border: `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: "0.05em" }}>STEP {s.step}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Client Wallets</div>
                  <div style={{ fontSize: 12, color: MUTED }}>Real-time balances</div>
                </div>
                {CLIENTS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: ZP_GRAD,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 15, color: "#fff",
                    }}>Z</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>Bank account: {c.bankAccount}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt(c.balance)}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>Wallet balance</div>
                    </div>
                    <button style={{
                      padding: "7px 16px", borderRadius: 8, background: ZP_GRAD,
                      border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>
                      Transfer →
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "52px 20px", textAlign: "center" }) }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>→</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>No payouts yet</div>
                <div style={{ fontSize: 13, color: MUTED, maxWidth: 360, margin: "0 auto" }}>
                  Payouts will be available once Tilled Live is approved and first payments are received.
                </div>
              </div>
            </div>
          )}

          {/* ── BANKING ── */}
          {tab === "bank" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>Unit.co Banking</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Real bank account</div>
                    </div>
                    <div style={{ ...badge("active") }}>
                      <span style={{ fontSize: 7 }}>●</span> Active
                    </div>
                  </div>
                  {[
                    { k: "Provider",          v: "Unit.co" },
                    { k: "Customer ID",       v: BANK_STATUS.customerId },
                    { k: "Routing Number",    v: BANK_STATUS.routing },
                    { k: "Account Number",    v: BANK_STATUS.account },
                    { k: "Available Balance", v: fmt(BANK_STATUS.balance) },
                    { k: "Card Type",         v: "Virtual Visa Debit" },
                    { k: "Status",            v: "Active" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                  <button style={{ marginTop: 16, width: "100%", padding: "10px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Open Unit.co →
                  </button>
                </div>

                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Virtual Visa Card</div>
                  <div style={{
                    borderRadius: 16, padding: "20px", marginBottom: 20,
                    background: "linear-gradient(135deg, #1E3A5F 0%, #2D5A8E 100%)",
                    position: "relative", overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}>
                    <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                    <div style={{ position: "absolute", bottom: -30, left: 20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 20 }}>ZENIPAY · UNIT.CO</div>
                    <div style={{ fontSize: 15, letterSpacing: "0.15em", color: "#fff", fontWeight: 700, marginBottom: 16 }}>•••• •••• •••• 5847</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>CARDHOLDER</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>ZENIVA TRAVEL LLC</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>EXPIRES</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>12/28</div>
                      </div>
                    </div>
                  </div>
                  {[
                    { k: "Status",  v: "Active" },
                    { k: "Type",    v: "Virtual Visa Debit" },
                    { k: "Card ID", v: "5487715" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Payment Processor — Tilled</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Primary gateway for incoming payments</div>
                  </div>
                  <div style={{ ...badge("sandbox") }}>
                    <span style={{ fontSize: 7 }}>◎</span> Sandbox
                  </div>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
                  ⚠ Tilled is in sandbox mode. Complete the onboarding to accept real payments.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { k: "Account ID",   v: GATEWAY_STATUS.accountId },
                    { k: "Environment",  v: "Sandbox" },
                    { k: "Fees",         v: GATEWAY_STATUS.fees },
                    { k: "Webhook URL",  v: GATEWAY_STATUS.webhook },
                  ].map(s => (
                    <div key={s.k} style={{ padding: "10px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>{s.k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all" }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer" style={{
                  display: "inline-block", marginTop: 16, padding: "10px 22px",
                  borderRadius: 10, background: ZP_GRAD, color: "#fff",
                  fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}>
                  Complete Tilled Live Onboarding →
                </a>
              </div>
            </div>
          )}

          {/* ── API & KEYS ── */}
          {tab === "api" && (
            <div>
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Client API Keys</div>
                {CLIENTS.map(c => (
                  <div key={c.id} style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ ...badge(c.status) }}>
                        <span style={{ fontSize: 7 }}>●</span> Active
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Live Key",    value: c.apiKey,      color: "#16A34A" },
                        { label: "Sandbox Key", value: c.sandboxKey,  color: "#D97706" },
                      ].map(k => (
                        <div key={k.label} style={{ padding: "10px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: k.color, letterSpacing: "0.05em", minWidth: 80 }}>{k.label}</span>
                          <code style={{ flex: 1, fontSize: 13, color: TEXT }}>{k.value}</code>
                          <button
                            onClick={() => copyKey(k.value)}
                            style={{
                              padding: "4px 12px", borderRadius: 6,
                              background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : SURFACE,
                              border: `1px solid ${BORDER}`,
                              color: copiedKey === k.value ? "#16A34A" : MUTED,
                              fontSize: 11, fontWeight: 700, cursor: "pointer",
                            }}
                          >
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
                  Base URL: <code style={{ background: LIGHT, padding: "2px 8px", borderRadius: 6 }}>https://zenipay.ca/api/v1</code>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[
                    { m: "POST", p: "/payments",     d: "Create a payment intent",       tag: "Payments" },
                    { m: "GET",  p: "/payments/:id", d: "Retrieve a payment",             tag: "Payments" },
                    { m: "GET",  p: "/transactions", d: "List transactions",              tag: "Transactions" },
                    { m: "GET",  p: "/balance",      d: "Get wallet balance",             tag: "Wallets" },
                    { m: "POST", p: "/payouts",      d: "Trigger a payout",              tag: "Payouts" },
                    { m: "POST", p: "/pay-links",    d: "Create a payment link",         tag: "Links" },
                    { m: "GET",  p: "/pay-links",    d: "List payment links",            tag: "Links" },
                    { m: "GET",  p: "/clients",      d: "List platform clients (admin)", tag: "Admin" },
                    { m: "POST", p: "/provision",    d: "Provision a bank account",      tag: "Banking" },
                    { m: "GET",  p: "/accounting",   d: "Accounting summary",            tag: "Accounting" },
                  ].map((e, i) => {
                    const mc = e.m === "POST"
                      ? { bg: "rgba(22,163,74,0.08)", txt: "#16A34A", border: "rgba(22,163,74,0.2)" }
                      : { bg: "rgba(21,184,201,0.08)", txt: "#0891B2", border: "rgba(21,184,201,0.2)" };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: i % 2 === 0 ? LIGHT : SURFACE, border: `1px solid ${BORDER}` }}>
                        <div style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, minWidth: 46, textAlign: "center", background: mc.bg, color: mc.txt, border: `1px solid ${mc.border}` }}>{e.m}</div>
                        <code style={{ fontSize: 13, flex: 1, color: TEXT }}>/api/v1{e.p}</code>
                        <span style={{ fontSize: 12, color: MUTED }}>{e.d}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: LIGHT, color: MUTED, border: `1px solid ${BORDER}` }}>{e.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Platform</div>
                {[
                  { k: "Name",         v: "ZeniPay" },
                  { k: "Admin Email",  v: "admin@zenipay.ca" },
                  { k: "Support",      v: "info@zenipay.ca" },
                  { k: "URL",          v: "zenipay.ca" },
                  { k: "Version",      v: "1.0.0" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Tilled Processor</div>
                {[
                  { k: "Account ID",   v: "acct_XlRKvhpbdl1UxJ9zINmoL" },
                  { k: "Environment",  v: "Sandbox" },
                  { k: "Fees",         v: "2.9% + $0.30" },
                  { k: "Webhook",      v: "/api/zenipay/webhooks/tilled" },
                  { k: "HMAC Security", v: "Enabled" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 14, padding: "8px 18px", borderRadius: 9, background: ZP_GRAD, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Tilled Portal →
                </a>
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Unit.co Banking</div>
                {[
                  { k: "Routing",     v: "812345678" },
                  { k: "Account",     v: "••••5847" },
                  { k: "Customer ID", v: "4647873" },
                  { k: "Card ID",     v: "5487715" },
                  { k: "Status",      v: "Active" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Chart of Accounts</div>
                {[
                  { code: "1000", name: "Platform Wallet",      type: "Asset" },
                  { code: "2000", name: "Commissions Payable",  type: "Liability" },
                  { code: "4000", name: "Travel Revenue",       type: "Revenue" },
                  { code: "5000", name: "Agent Commissions",    type: "Expense" },
                  { code: "5100", name: "Processor Fees",       type: "Expense" },
                ].map(s => (
                  <div key={s.code} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12, alignItems: "center" }}>
                    <code style={{ minWidth: 36, color: "#7B4FBF", fontWeight: 700 }}>{s.code}</code>
                    <span style={{ flex: 1 }}>{s.name}</span>
                    <span style={{ color: MUTED }}>{s.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
