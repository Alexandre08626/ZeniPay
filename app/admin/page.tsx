"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });

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
  name: "Tilled",
  status: "sandbox",
  accountId: "acct_XlRKvhpbdl1UxJ9zINmoL",
  note: "Approbation live en attente — seuls les paiements sandbox sont actifs",
  webhook: "https://zenipay.ca/api/zenipay/webhooks/tilled",
  fees: "2.9% + $0.30",
};

const BANK_STATUS = {
  provider: "Unit.co",
  routing: "812345678",
  account: "••••5847",
  status: "active",
  balance: 0,
  customerId: "4647873",
  note: "Compte bancaire Visa virtuel actif",
};

const NAV = [
  { key: "overview",      icon: "◈",  label: "Vue d'ensemble" },
  { key: "clients",       icon: "⊞",  label: "Clients" },
  { key: "transactions",  icon: "↕",  label: "Transactions" },
  { key: "payouts",       icon: "→",  label: "Versements" },
  { key: "bank",          icon: "⬡",  label: "Banque" },
  { key: "api",           icon: "⌥",  label: "API & Clés" },
  { key: "settings",      icon: "⚙",  label: "Paramètres" },
] as const;

type TabKey = typeof NAV[number]["key"];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [envMode, setEnvMode] = useState<"live"|"sandbox">("sandbox");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");
  const [clientView, setClientView] = useState<string|null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sessionStorage.getItem("zp_admin")) {
        router.replace("/admin/login");
        return;
      }
      const m = sessionStorage.getItem("zp_mode");
      if (m === "live" || m === "sandbox") setEnvMode(m);
    }
  }, [router]);

  const logout = () => {
    sessionStorage.removeItem("zp_admin");
    sessionStorage.removeItem("zp_mode");
    router.replace("/admin/login");
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    });
  };

  // ── Design tokens ──────────────────────────────────────────────
  const BG      = "#F0F4F8";
  const SURFACE = "#FFFFFF";
  const BORDER  = "rgba(0,0,0,0.07)";
  const TEXT     = "#0F172A";
  const MUTED    = "#64748B";
  const LIGHT    = "#F8FAFC";

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
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 0", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: ZP_GRAD,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(45,190,96,0.3)",
            }}>
              <img
                src="/zenipay-logo.png"
                alt="ZP"
                style={{ width: 24, height: 24, objectFit: "contain", filter: "brightness(10)" }}
                onError={e => { e.currentTarget.style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block"; }}
              />
              <span style={{ display: "none", color: "#fff", fontWeight: 900, fontSize: 14 }}>ZP</span>
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.3px" }}>ZeniPay</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginTop: 1 }}>Admin Console</div>
              </div>
            )}
          </div>
        </div>

        {/* Env badge in sidebar */}
        {sidebarOpen && (
          <div style={{ padding: "0 14px", marginBottom: 16 }}>
            <div style={{
              ...badge(envMode),
              width: "100%", justifyContent: "center", fontSize: 11,
              padding: "5px 10px", borderRadius: 10,
            }}>
              <span style={{ fontSize: 8 }}>●</span>
              {envMode === "live" ? "Live Mode" : "Sandbox Mode"}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV.map(({ key, icon, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                title={label}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: sidebarOpen ? "10px 16px" : "10px 0",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  width: "100%", border: "none", cursor: "pointer",
                  background: active ? "rgba(45,190,96,0.08)" : "transparent",
                  borderLeft: `3px solid ${active ? "#2DBE60" : "transparent"}`,
                  color: active ? "#16A34A" : MUTED,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "0 10px 16px" }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              width: "100%", padding: "8px 0", marginBottom: 8,
              border: "none", background: "transparent", cursor: "pointer",
              color: MUTED, fontSize: 18,
            }}
            title="Toggle sidebar"
          >
            {sidebarOpen ? "←" : "→"}
          </button>
          <button
            onClick={logout}
            style={{
              width: "100%", padding: "9px 10px", borderRadius: 10,
              background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)",
              color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", gap: 8,
            }}
          >
            <span>⏻</span>{sidebarOpen && "Déconnexion"}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
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
            {/* Mode Toggle */}
            <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
              {(["live","sandbox"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setEnvMode(m);
                    sessionStorage.setItem("zp_mode", m);
                  }}
                  style={{
                    padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                    background: envMode === m ? "#fff" : "transparent",
                    color: envMode === m ? (m==="live" ? "#16A34A" : "#D97706") : "#94A3B8",
                    boxShadow: envMode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <span style={{ fontSize: 7, marginRight: 4 }}>{m==="live"?"●":"◎"}</span>
                  {m === "live" ? "Live" : "Sandbox"}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: BORDER }} />

            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: ZP_GRAD,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 900, fontSize: 13, flexShrink: 0,
            }}>A</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "28px 32px" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div>
              {envMode === "sandbox" && (
                <div style={{
                  marginBottom: 24, padding: "12px 18px", borderRadius: 14,
                  background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)",
                  display: "flex", alignItems: "center", gap: 12, fontSize: 13,
                }}>
                  <span style={{ fontSize: 20 }}>⚠</span>
                  <div>
                    <span style={{ fontWeight: 700, color: "#B45309" }}>Mode Sandbox actif</span>
                    <span style={{ color: "#92400E", marginLeft: 8 }}>— Aucune transaction réelle. En attente d&apos;approbation Tilled live.</span>
                  </div>
                  <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                    style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "#D97706", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    Voir Tilled →
                  </a>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Volume total",     value: fmt(0),    sub: "Toutes périodes",     accent: "#2DBE60", icon: "💰" },
                  { label: "Frais plateforme", value: fmt(0),    sub: "2.9% + $0.30",        accent: "#15B8C9", icon: "📊" },
                  { label: "Clients actifs",   value: "1",       sub: "Zeniva Travel LLC",   accent: "#7B4FBF", icon: "🏢" },
                  { label: "Versements en att.", value: fmt(0),   sub: "0 en attente",        accent: "#D97706", icon: "⏳" },
                  { label: "Taux de succès",   value: "—",       sub: "Aucune donnée",       accent: "#2DBE60", icon: "✓" },
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
                {/* Client rapide */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Clients</div>
                    <button
                      onClick={() => setTab("clients")}
                      style={{ fontSize: 12, color: "#2DBE60", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      Voir tout →
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
                      <div>
                        <div style={{ ...badge(c.status) }}>{c.status === "active" ? "Actif" : c.status}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Statut système */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Statut système</div>
                  {[
                    { name: "API ZeniPay",     status: "active", note: "Opérationnelle" },
                    { name: "Tilled Gateway",  status: "sandbox", note: "Sandbox uniquement" },
                    { name: "Unit.co Banking", status: "active", note: "Compte actif" },
                    { name: "Supabase DB",     status: "active", note: "Connectée" },
                    { name: "Webhooks",        status: "active", note: "Configurés" },
                  ].map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${BORDER}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(s.status), flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{s.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prochaines étapes */}
              <div style={{ ...card({ padding: "22px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Prochaines étapes critiques</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {[
                    { step: "01", title: "Approbation Tilled Live", desc: "En attente — complète l'onboarding pour activer les vrais paiements pour Zeniva Travel.", urgent: true, action: "Voir Tilled", link: "https://app.tilled.com" },
                    { step: "02", title: "Clé API client Zeniva", desc: "Intégrer zpk_live_zeniva dans le site Zeniva Travel pour accepter les paiements.", urgent: true, action: "Copier la clé", link: null },
                    { step: "03", title: "Landing page ZeniPay", desc: "Page de présentation ZeniPay sur zeniva.com pour attirer nouveaux clients.", urgent: false, action: "À venir", link: null },
                    { step: "04", title: "Distribution wallets", desc: "Activer la distribution automatique Agent 70% / Zeniva 30% dans le ledger.", urgent: false, action: "À venir", link: null },
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
                        <a href={s.link} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, fontWeight: 700, color: "#2DBE60", textDecoration: "none" }}>
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
                  {CLIENTS.length} client{CLIENTS.length > 1 ? "s" : ""} · Plateforme ZeniPay
                </div>
                <button style={{
                  padding: "9px 20px", borderRadius: 10, background: ZP_GRAD,
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
                }}>
                  + Nouveau client
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
                            <span style={{ fontSize: 7 }}>●</span>
                            {c.status === "active" ? "Actif" : c.status}
                          </div>
                          <div style={{ ...badge("sandbox") }}>
                            <span style={{ fontSize: 7 }}>◎</span>
                            Sandbox
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
                          {c.domain} · {c.contact} · Client depuis {fmtDate(c.since)}
                        </div>
                        <div style={{ fontSize: 13, color: MUTED, fontStyle: "italic", marginBottom: 12 }}>{c.description}</div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { k: "Volume", v: fmt(c.volume) },
                            { k: "Solde", v: fmt(c.balance) },
                            { k: "Transactions", v: `${c.txCount}` },
                            { k: "Plan", v: c.plan },
                            { k: "ID", v: c.id },
                          ].map(s => (
                            <div key={s.k} style={{
                              padding: "5px 12px", borderRadius: 8, background: LIGHT,
                              border: `1px solid ${BORDER}`, fontSize: 12,
                            }}>
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
                          {clientView === c.id ? "Fermer ▲" : "Détails ▼"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded client details */}
                  {clientView === c.id && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 24px", background: LIGHT }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* API Keys */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: MUTED }}>CLÉS API</div>
                          {[
                            { label: "Clé Live", value: c.apiKey, color: "#16A34A" },
                            { label: "Clé Sandbox", value: c.sandboxKey, color: "#D97706" },
                          ].map(k => (
                            <div key={k.label} style={{
                              padding: "10px 14px", borderRadius: 10,
                              background: SURFACE, border: `1px solid ${BORDER}`,
                              marginBottom: 8,
                            }}>
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
                                  {copiedKey === k.value ? "✓ Copié" : "Copier"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Banking info */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: MUTED }}>COMPTE BANCAIRE</div>
                          {[
                            { k: "Fournisseur", v: "Unit.co" },
                            { k: "Numéro de compte", v: c.bankAccount },
                            { k: "Numéro de transit", v: "812345678" },
                            { k: "Processeur", v: c.gateway },
                          ].map(s => (
                            <div key={s.k} style={{
                              display: "flex", justifyContent: "space-between",
                              padding: "9px 0", borderBottom: `1px solid ${BORDER}`,
                              fontSize: 13,
                            }}>
                              <span style={{ color: MUTED }}>{s.k}</span>
                              <span style={{ fontWeight: 700 }}>{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {["Gérer les versements", "Voir les transactions", "Régénérer les clés", "Suspendre"].map((a, i) => (
                          <button
                            key={a}
                            style={{
                              padding: "8px 16px", borderRadius: 9,
                              background: i === 0 ? ZP_GRAD : SURFACE,
                              border: i === 3 ? "1px solid rgba(220,38,38,0.25)" : `1px solid ${BORDER}`,
                              color: i === 0 ? "#fff" : i === 3 ? "#DC2626" : TEXT,
                              fontSize: 13, fontWeight: 700, cursor: "pointer",
                              boxShadow: i === 0 ? "0 4px 12px rgba(45,190,96,0.2)" : "none",
                            }}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty state hint */}
              <div style={{
                ...card({ padding: "28px", textAlign: "center", borderStyle: "dashed", borderColor: "rgba(45,190,96,0.2)" }),
                background: "rgba(45,190,96,0.02)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>+</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Ajouter un nouveau client</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Chaque client reçoit un compte bancaire réel, des clés API, un dashboard dédié et des wallets séparés.</div>
                <button style={{
                  padding: "10px 24px", borderRadius: 10, background: ZP_GRAD,
                  border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                  + Nouveau client
                </button>
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {tab === "transactions" && (
            <div>
              {/* Filters */}
              <div style={{ ...card({ padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }) }}>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>Tous les clients</option>
                  <option>Zeniva Travel LLC</option>
                </select>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>Tous les statuts</option>
                  <option>Réussi</option><option>En attente</option><option>Échoué</option>
                </select>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: LIGHT, fontFamily: "inherit" }}>
                  <option>7 derniers jours</option><option>30 jours</option><option>90 jours</option><option>Tout</option>
                </select>
                <div style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>0 transactions</div>
              </div>

              <div style={{ ...card({ padding: "60px 20px", textAlign: "center" }) }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>↕</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Aucune transaction pour le moment</div>
                <div style={{ fontSize: 13, color: MUTED, maxWidth: 380, margin: "0 auto 20px" }}>
                  Les transactions apparaîtront ici une fois l&apos;approbation Tilled Live complétée et que Zeniva Travel intègre la clé API ZeniPay.
                </div>
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                  style={{
                    padding: "10px 24px", borderRadius: 10, background: ZP_GRAD,
                    color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    display: "inline-block",
                  }}>
                  Compléter l&apos;onboarding Tilled →
                </a>
              </div>
            </div>
          )}

          {/* ── PAYOUTS ── */}
          {tab === "payouts" && (
            <div>
              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "Total versé", value: fmt(0), accent: "#2DBE60" },
                  { label: "En attente", value: fmt(0), accent: "#D97706" },
                  { label: "Wallet Platform", value: fmt(0), accent: "#7B4FBF" },
                  { label: "Wallet Agents", value: fmt(0), accent: "#15B8C9" },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "18px" }) }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Wallets */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Wallets</div>
                  {[
                    { name: "Platform Wallet", type: "platform", balance: 0, color: "#7B4FBF", desc: "Reçoit tous les paiements entrants" },
                    { name: "Agent Wallet", type: "agent", balance: 0, color: "#2DBE60", desc: "70% des commissions agents" },
                    { name: "Influencer Wallet", type: "influencer", balance: 0, color: "#F5A623", desc: "Commissions influenceurs" },
                    { name: "Supplier Wallet", type: "supplier", balance: 0, color: "#15B8C9", desc: "Allocations fournisseurs" },
                  ].map(w => (
                    <div key={w.type} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${BORDER}` }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: w.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>{w.desc}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(w.balance)}</div>
                    </div>
                  ))}
                </div>

                {/* Distribution logic */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Règles de distribution</div>
                  <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
                    Distribution automatique configurée mais non activée — en attente d&apos;approbation Tilled Live.
                  </div>
                  {[
                    { scenario: "Réservation via agent", split: "Agent 70% · Zeniva 30%" },
                    { scenario: "Lina seul (sans agent)", split: "Zeniva 70% · Agent 30%" },
                    { scenario: "Distribution actuelle", split: "100% → Platform (manuel)" },
                  ].map(r => (
                    <div key={r.scenario} style={{ padding: "10px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{r.scenario}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.split}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "60px 20px", textAlign: "center" }) }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Aucun versement effectué</div>
                <div style={{ fontSize: 13, color: MUTED }}>Les versements seront disponibles une fois les paiements actifs.</div>
              </div>
            </div>
          )}

          {/* ── BANK ── */}
          {tab === "bank" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

                {/* Unit.co Account */}
                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>Unit.co Banking</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Compte bancaire réel</div>
                    </div>
                    <div style={{ ...badge("active") }}>
                      <span style={{ fontSize: 7 }}>●</span> Actif
                    </div>
                  </div>

                  {[
                    { k: "Fournisseur", v: "Unit.co" },
                    { k: "Customer ID", v: BANK_STATUS.customerId },
                    { k: "Numéro de transit", v: BANK_STATUS.routing },
                    { k: "Numéro de compte", v: BANK_STATUS.account },
                    { k: "Solde disponible", v: fmt(BANK_STATUS.balance) },
                    { k: "Type de carte", v: "Visa Débit Virtuel" },
                    { k: "Statut", v: "Actif" },
                  ].map(s => (
                    <div key={s.k} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13,
                    }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}

                  <button style={{
                    marginTop: 16, width: "100%", padding: "10px", borderRadius: 10,
                    background: ZP_GRAD, border: "none", color: "#fff",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Voir dans Unit.co →
                  </button>
                </div>

                {/* Virtual Card */}
                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Carte Visa Virtuelle</div>

                  {/* Card visual */}
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
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>TITULAIRE</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>ZENIVA TRAVEL LLC</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>EXPIRATION</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>12/28</div>
                      </div>
                    </div>
                  </div>

                  {[
                    { k: "Statut", v: "Actif" },
                    { k: "Type", v: "Visa Débit Virtuel" },
                    { k: "Card ID", v: "5487715" },
                  ].map(s => (
                    <div key={s.k} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13,
                    }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tilled processor */}
              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Processeur de paiement — Tilled</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Gateway principal pour les paiements entrants</div>
                  </div>
                  <div style={{ ...badge("sandbox") }}>
                    <span style={{ fontSize: 7 }}>◎</span> Sandbox
                  </div>
                </div>

                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)",
                  marginBottom: 16, fontSize: 13, color: "#92400E",
                }}>
                  ⚠ Tilled est en mode sandbox. Complète l&apos;onboarding pour accepter de vrais paiements.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { k: "Account ID", v: GATEWAY_STATUS.accountId },
                    { k: "Environnement", v: "Sandbox" },
                    { k: "Frais", v: GATEWAY_STATUS.fees },
                    { k: "Webhook URL", v: GATEWAY_STATUS.webhook },
                  ].map(s => (
                    <div key={s.k} style={{ padding: "10px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>{s.k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all" }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                  style={{
                    display: "inline-block", marginTop: 16, padding: "10px 22px",
                    borderRadius: 10, background: ZP_GRAD, color: "#fff",
                    fontSize: 13, fontWeight: 700, textDecoration: "none",
                  }}>
                  Compléter l&apos;onboarding Tilled Live →
                </a>
              </div>
            </div>
          )}

          {/* ── API & KEYS ── */}
          {tab === "api" && (
            <div>
              {/* Client keys */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Clés API clients</div>
                {CLIENTS.map(c => (
                  <div key={c.id} style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ ...badge(c.status) }}>{c.status === "active" ? "Actif" : c.status}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Clé Live", value: c.apiKey, color: "#16A34A" },
                        { label: "Clé Sandbox", value: c.sandboxKey, color: "#D97706" },
                      ].map(k => (
                        <div key={k.label} style={{
                          padding: "10px 14px", borderRadius: 10,
                          background: LIGHT, border: `1px solid ${BORDER}`,
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
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
                            {copiedKey === k.value ? "✓ Copié" : "Copier"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* REST API Reference */}
              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>ZeniPay REST API</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
                  Base URL: <code style={{ background: LIGHT, padding: "2px 8px", borderRadius: 6 }}>https://zenipay.ca/api/v1</code>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[
                    { m: "POST", p: "/payments",        d: "Créer un intent de paiement", tag: "Paiements" },
                    { m: "GET",  p: "/payments/:id",    d: "Récupérer un paiement", tag: "Paiements" },
                    { m: "GET",  p: "/transactions",    d: "Lister les transactions", tag: "Transactions" },
                    { m: "GET",  p: "/balance",         d: "Solde des wallets", tag: "Wallets" },
                    { m: "POST", p: "/payouts",         d: "Déclencher un versement", tag: "Versements" },
                    { m: "POST", p: "/pay-links",       d: "Créer un lien de paiement", tag: "Liens" },
                    { m: "GET",  p: "/pay-links",       d: "Lister les liens de paiement", tag: "Liens" },
                    { m: "GET",  p: "/clients",         d: "Lister les clients (admin)", tag: "Admin" },
                    { m: "POST", p: "/provision",       d: "Provisionner un compte bancaire", tag: "Banking" },
                    { m: "GET",  p: "/accounting",      d: "Résumé comptable", tag: "Comptabilité" },
                  ].map((e, i) => {
                    const methodColor = e.m === "POST" ? { bg: "rgba(22,163,74,0.08)", txt: "#16A34A", border: "rgba(22,163,74,0.2)" }
                      : e.m === "DELETE" ? { bg: "rgba(220,38,38,0.08)", txt: "#DC2626", border: "rgba(220,38,38,0.2)" }
                      : { bg: "rgba(21,184,201,0.08)", txt: "#0891B2", border: "rgba(21,184,201,0.2)" };
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 10,
                        background: i % 2 === 0 ? LIGHT : SURFACE,
                        border: `1px solid ${BORDER}`,
                      }}>
                        <div style={{
                          padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                          minWidth: 46, textAlign: "center",
                          background: methodColor.bg, color: methodColor.txt,
                          border: `1px solid ${methodColor.border}`,
                        }}>{e.m}</div>
                        <code style={{ fontSize: 13, flex: 1, color: TEXT }}>/api/v1{e.p}</code>
                        <span style={{ fontSize: 12, color: MUTED }}>{e.d}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                          background: LIGHT, color: MUTED, border: `1px solid ${BORDER}`,
                        }}>{e.tag}</span>
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
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Plateforme</div>
                {[
                  { k: "Nom", v: "ZeniPay" },
                  { k: "Email admin", v: "admin@zenipay.ca" },
                  { k: "Support", v: "info@zenipay.ca" },
                  { k: "URL", v: "zenipay.ca" },
                  { k: "Version", v: "1.0.0" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Processeur Tilled</div>
                {[
                  { k: "Account ID", v: "acct_XlRKvhpbdl1UxJ9zINmoL" },
                  { k: "Environnement", v: "Sandbox" },
                  { k: "Frais", v: "2.9% + $0.30" },
                  { k: "Webhook", v: "/api/zenipay/webhooks/tilled" },
                  { k: "HMAC Security", v: "Activée" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
                <a href="https://app.tilled.com" target="_blank" rel="noreferrer"
                  style={{ display: "inline-block", marginTop: 14, padding: "8px 18px", borderRadius: 9, background: ZP_GRAD, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Portail Tilled →
                </a>
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Banking Unit.co</div>
                {[
                  { k: "Routing", v: "812345678" },
                  { k: "Compte", v: "••••5847" },
                  { k: "Customer ID", v: "4647873" },
                  { k: "Card ID", v: "5487715" },
                  { k: "Statut", v: "Actif" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Comptabilité</div>
                {[
                  { code: "1000", name: "Platform Wallet", type: "Actif" },
                  { code: "2000", name: "Commissions à payer", type: "Passif" },
                  { code: "4000", name: "Revenus voyages", type: "Revenu" },
                  { code: "5000", name: "Commissions agents", type: "Dépense" },
                  { code: "5100", name: "Frais processeur", type: "Dépense" },
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
