"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Brand ─────────────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const CARD_GRAD = "linear-gradient(135deg, #E5247B 0%, #F5A623 50%, #7B4FBF 100%)";

// ─── Theme (matches ZenivaComplete / zenivatravel.com/agent/finance) ───
const PAGE_BG   = "#f0f4f8";    // light blue-gray page background
const CARD_BG   = "#ffffff";    // white cards
const BORDER    = "#e2e8f0";    // light border
const ROW_SEP   = "#f1f5f9";    // row separator
const SIDEBAR   = "linear-gradient(180deg, #0d1633 0%, #1a2a5e 30%, #2A8FE0 70%, #7B4FBF 100%)";
const TOPBAR_BG = "#ffffff";
const TEXT      = "#0f172a";    // dark main text
const MUTED     = "#64748b";    // muted secondary text
const LIGHT     = "#94a3b8";    // very muted text

// ─── Types ──────────────────────────────────────────────
interface Account {
  id: string; businessName: string; ownerName: string; email: string;
  phone: string; website: string; businessType: string; country: string;
  monthlyVolume: string; status: string; plan: string;
  sandboxKey: string; sandboxSecret: string; liveKey: string;
  createdAt: string; volume: number; txCount: number; balance: number; notes: string;
}

interface PayLink { id: string; title: string; amount: number; url: string; uses: number; createdAt: string; status: "active"|"expired"|"paused" }
interface Invoice  { id: string; client: string; email: string; amount: number; status: "draft"|"sent"|"paid"|"overdue"; dueDate: string; createdAt: string; items: {desc:string;qty:number;price:number}[] }
interface Payout   { id: string; recipient: string; amount: number; method: string; status: "pending"|"sent"|"failed"; createdAt: string }

// ─── Helpers ────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };
  return (
    <button onClick={copy} style={{ background: copied ? "rgba(45,190,96,0.1)" : "#f8fafc", border: `1px solid ${copied ? "rgba(45,190,96,0.4)" : BORDER}`, color: copied ? ZP_GREEN : MUTED, padding: small ? "4px 10px" : "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: color + "18", color, border: `1px solid ${color}40`, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
      {label}
    </span>
  );
}

// ─── Sidebar tab definitions by plan ──────────────────────
function getTabs(plan: string) {
  const base = [
    { id: "overview",      icon: "📊", label: "Overview"    },
    { id: "transactions",  icon: "💳", label: "Transactions" },
    { id: "paylinks",      icon: "🔗", label: "Pay Links"   },
    { id: "invoices",      icon: "📄", label: "Invoices"    },
    { id: "payouts",       icon: "💸", label: "Payouts"     },
    { id: "keys",          icon: "🔑", label: "API Keys"    },
    { id: "settings",      icon: "⚙️", label: "Settings"    },
  ];
  const businessExtra = [
    { id: "banking",       icon: "🏦", label: "ZeniCard"    },
    { id: "accounting",    icon: "📚", label: "Accounting"  },
    { id: "analytics",     icon: "📈", label: "Analytics"   },
  ];
  if (plan === "Business" || plan === "Complete") {
    const result = [base[0], base[1], businessExtra[0], ...base.slice(2, 5), businessExtra[1], businessExtra[2], ...base.slice(5)];
    return result;
  }
  return base;
}

// ─── Modal wrapper ─────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: LIGHT, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Input style ───────────────────────────────────────────
const IS: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  background: "#f8fafc", border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function MerchantApp({ account, mode, onSignOut, onApproved }: {
  account: Account;
  mode: "sandbox" | "live";
  onSignOut: () => void;
  onApproved?: () => void;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isSandbox = mode === "sandbox";
  const baseTabs = getTabs(account.plan);
  const TABS = isSandbox
    ? [...baseTabs, { id: "go-live", icon: "🚀", label: "Go Live" }]
    : baseTabs;

  const validTabs = TABS.map(t => t.id);
  const tabFromUrl = searchParams.get("tab") || "overview";
  const tab = validTabs.includes(tabFromUrl) ? tabFromUrl : "overview";
  const setTab = (id: string) => router.push(`/app?tab=${id}`);

  const [sideOpen,    setSideOpen]    = useState(true);
  const [isMobile,    setIsMobile]    = useState(false);
  const [modal,       setModal]       = useState<string|null>(null);

  // ── Data state ─────────────────────────────────────────
  const storeKey = `zp_data_${account.id || account.email}`;
  const loadData = <T,>(key: string, def: T): T => {
    try { return JSON.parse(localStorage.getItem(`${storeKey}_${key}`) || "null") ?? def; } catch { return def; }
  };
  const saveData = (key: string, val: unknown) => {
    try { localStorage.setItem(`${storeKey}_${key}`, JSON.stringify(val)); } catch {}
  };

  const [payLinks,   setPayLinks]   = useState<PayLink[]>(() => loadData("paylinks", []));
  const [invoices,   setInvoices]   = useState<Invoice[]>(() => loadData("invoices", []));
  const [payouts,    setPayouts]    = useState<Payout[]>(() => loadData("payouts", []));

  useEffect(() => { saveData("paylinks", payLinks); }, [payLinks]);
  useEffect(() => { saveData("invoices", invoices); }, [invoices]);
  useEffect(() => { saveData("payouts",  payouts);  }, [payouts]);

  useEffect(() => {
    const check = () => { const m = window.innerWidth < 900; setIsMobile(m); if (m) setSideOpen(false); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Pay Link form ────────────────────────────────────────
  const [plForm, setPlForm] = useState({ title: "", amount: "", email: "", desc: "" });
  const createPayLink = () => {
    if (!plForm.title || !plForm.amount) return;
    const link: PayLink = { id: uid(), title: plForm.title, amount: Number(plForm.amount), url: `https://pay.zenipay.ca/l/${uid().toLowerCase()}`, uses: 0, createdAt: new Date().toISOString(), status: "active" };
    setPayLinks(p => [link, ...p]);
    setPlForm({ title: "", amount: "", email: "", desc: "" });
    setModal(null);
  };

  // ── Invoice form ─────────────────────────────────────────
  const [invForm, setInvForm]     = useState({ client: "", email: "", dueDate: "", desc: "", qty: "1", price: "" });
  const [invItems, setInvItems]   = useState<{desc:string;qty:number;price:number}[]>([]);
  const addInvItem = () => {
    if (!invForm.desc || !invForm.price) return;
    setInvItems(prev => [...prev, { desc: invForm.desc, qty: Number(invForm.qty)||1, price: Number(invForm.price) }]);
    setInvForm(f => ({ ...f, desc: "", qty: "1", price: "" }));
  };
  const createInvoice = () => {
    if (!invForm.client || invItems.length === 0) return;
    const total = invItems.reduce((s, i) => s + i.qty * i.price, 0);
    const inv: Invoice = { id: uid(), client: invForm.client, email: invForm.email, amount: total, status: "draft", dueDate: invForm.dueDate || new Date(Date.now()+30*864e5).toISOString().split("T")[0], createdAt: new Date().toISOString(), items: invItems };
    setInvoices(p => [inv, ...p]);
    setInvForm({ client: "", email: "", dueDate: "", desc: "", qty: "1", price: "" });
    setInvItems([]);
    setModal(null);
  };

  // ── Go Live form ──────────────────────────────────────────
  const glKey = `zp_golive_${account.email}`;
  const loadGL = () => { try { return JSON.parse(localStorage.getItem(glKey) || "{}"); } catch { return {}; } };
  const saveGL = (u: Record<string, unknown>) => { try { localStorage.setItem(glKey, JSON.stringify({ ...loadGL(), ...u })); } catch {} };
  const [glStep,      setGlStep]      = useState<number>(() => loadGL().step ?? 0);
  const [glForm,      setGlForm]      = useState<Record<string,string>>(() => loadGL().form ?? {});
  const [glChecked,   setGlChecked]   = useState<Record<string,boolean>>(() => loadGL().checked ?? {});
  const setGlField = (k: string, v: string) => { const f = { ...glForm, [k]: v }; setGlForm(f); saveGL({ form: f }); };
  const toggleGL = (k: string) => { const c = { ...glChecked, [k]: !glChecked[k] }; setGlChecked(c); saveGL({ checked: c }); };

  // ── Payout form ──────────────────────────────────────────
  const [poForm, setPoForm] = useState({ recipient: "", amount: "", method: "e-Transfer", note: "" });
  const createPayout = () => {
    if (!poForm.recipient || !poForm.amount) return;
    const po: Payout = { id: uid(), recipient: poForm.recipient, amount: Number(poForm.amount), method: poForm.method, status: "pending", createdAt: new Date().toISOString() };
    setPayouts(p => [po, ...p]);
    setPoForm({ recipient: "", amount: "", method: "e-Transfer", note: "" });
    setModal(null);
  };

  const activeKey = isSandbox ? account.sandboxKey : account.liveKey;

  // ── Templates ─────────────────────────────────────────────
  const LINK_TEMPLATES = [
    { title: "Product Purchase",  amount: "99",   desc: "One-time product payment" },
    { title: "Monthly Service",   amount: "49",   desc: "Monthly recurring service" },
    { title: "Deposit",           amount: "500",  desc: "Security or booking deposit" },
    { title: "Consultation Fee",  amount: "150",  desc: "1-hour consultation call" },
    { title: "Custom Amount",     amount: "",     desc: "Let customer enter amount" },
  ];
  const INV_TEMPLATES = [
    { name: "Web Design Project",   items: [{ desc: "Design mockups", qty: 1, price: 800 }, { desc: "Development", qty: 1, price: 1200 }] },
    { name: "Monthly Retainer",     items: [{ desc: "Monthly support", qty: 1, price: 500 }] },
    { name: "E-commerce Setup",     items: [{ desc: "Store setup", qty: 1, price: 600 }, { desc: "Product import", qty: 1, price: 200 }, { desc: "Training", qty: 2, price: 150 }] },
    { name: "Consulting Invoice",   items: [{ desc: "Consulting hours", qty: 3, price: 200 }] },
  ];

  // ─────────────────────────────────────────────────────────
  //  SECTION RENDERERS
  // ─────────────────────────────────────────────────────────

  // ── OVERVIEW ─────────────────────────────────────────────
  const OverviewSection = (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: TEXT }}>Welcome back, {account.ownerName || account.businessName}</h2>
        <p style={{ margin: 0, fontSize: 14, color: MUTED }}>{isSandbox ? "Sandbox environment — test your integration" : "Live environment — real transactions"}</p>
      </div>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "ZeniCard Balance",  value: fmt(account.balance), color: ZP_GREEN  },
          { label: "Total Volume",      value: fmt(account.volume),  color: ZP_CYAN   },
          { label: "Transactions",      value: String(account.txCount), color: ZP_PURPLE },
          { label: "Active Pay Links",  value: String(payLinks.filter(p => p.status === "active").length), color: ZP_BLUE },
          { label: "Open Invoices",     value: String(invoices.filter(i => i.status === "sent").length),  color: "#F5A623" },
        ].map(k => (
          <div key={k.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 11, color: LIGHT, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: LIGHT, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "New Payment Link", icon: "🔗", action: () => { setTab("paylinks"); setModal("paylink"); } },
            { label: "Create Invoice",   icon: "📄", action: () => { setTab("invoices"); setModal("invoice"); } },
            { label: "Send Payout",      icon: "💸", action: () => { setTab("payouts");  setModal("payout"); } },
            { label: "API Keys",         icon: "🔑", action: () => setTab("keys") },
          ].map(a => (
            <button key={a.label} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 8, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 18px", color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
      {/* Recent Pay Links */}
      {payLinks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: LIGHT, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Recent Pay Links</div>
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {payLinks.slice(0, 5).map(l => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: LIGHT, marginTop: 2 }}>{l.url}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>{fmt(l.amount)}</span>
                  <Badge label={l.status} color={l.status === "active" ? ZP_GREEN : "#94A3B8"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Sandbox test cards */}
      {isSandbox && (
        <div style={{ marginTop: 20, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 8 }}>Test Cards</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[{ brand: "Visa", num: "4111 1111 1111 1111" }, { brand: "MC", num: "5454 5454 5454 5454" }].map(c => (
              <span key={c.brand} style={{ fontSize: 12 }}>
                <span style={{ color: MUTED, fontWeight: 700 }}>{c.brand}: </span>
                <code style={{ color: TEXT }}>{c.num}</code>
              </span>
            ))}
            <span style={{ fontSize: 12, color: LIGHT }}>Any future exp · CVC 999</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── PAY LINKS ────────────────────────────────────────────
  const PayLinksSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TEXT }}>Payment Links</h2>
        <button onClick={() => setModal("paylink")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ New Link</button>
      </div>
      {payLinks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>No payment links yet</div>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px" }}>Create a shareable link and get paid in seconds</p>
          <button onClick={() => setModal("paylink")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Create your first link →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {payLinks.map(l => (
            <div key={l.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{l.title}</span>
                  <Badge label={l.status} color={l.status === "active" ? ZP_GREEN : "#94A3B8"} />
                </div>
                <div style={{ fontSize: 11, color: LIGHT }}>{l.url}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: TEXT }}>{fmt(l.amount)}</div>
                  <div style={{ fontSize: 11, color: LIGHT }}>{l.uses} use{l.uses !== 1 ? "s" : ""}</div>
                </div>
                <CopyBtn text={l.url} small />
                <button onClick={() => setPayLinks(p => p.map(x => x.id === l.id ? { ...x, status: x.status === "active" ? "paused" : "active" } : x))} style={{ background: "#f8fafc", border: `1px solid ${BORDER}`, color: MUTED, padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
                  {l.status === "active" ? "Pause" : "Resume"}
                </button>
                <button onClick={() => setPayLinks(p => p.filter(x => x.id !== l.id))} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── INVOICES ─────────────────────────────────────────────
  const statusColor = (s: string) => ({ draft:"#94A3B8", sent:ZP_CYAN, paid:ZP_GREEN, overdue:"#EF4444" }[s] || TEXT);
  const InvoicesSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TEXT }}>Invoices</h2>
        <button onClick={() => setModal("invoice")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ New Invoice</button>
      </div>
      {invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>No invoices yet</div>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px" }}>Professional invoices with automatic payment collection</p>
          <button onClick={() => setModal("invoice")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Create first invoice →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {invoices.map(inv => (
            <div key={inv.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>#{inv.id} — {inv.client}</div>
                  <div style={{ fontSize: 12, color: LIGHT, marginTop: 2 }}>{inv.email} · Due {new Date(inv.dueDate).toLocaleDateString("en-CA")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: TEXT }}>{fmt(inv.amount)}</span>
                  <Badge label={inv.status} color={statusColor(inv.status)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {inv.status === "draft" && (
                  <button onClick={() => setInvoices(p => p.map(x => x.id === inv.id ? { ...x, status: "sent" } : x))} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Send</button>
                )}
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <button onClick={() => setInvoices(p => p.map(x => x.id === inv.id ? { ...x, status: "paid" } : x))} style={{ background: "rgba(45,190,96,0.1)", color: ZP_GREEN, border: "1px solid rgba(45,190,96,0.3)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark Paid</button>
                )}
                <button onClick={() => setInvoices(p => p.filter(x => x.id !== inv.id))} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── PAYOUTS ──────────────────────────────────────────────
  const PayoutsSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TEXT }}>Payouts</h2>
        <button onClick={() => setModal("payout")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ Send Payout</button>
      </div>
      {payouts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>No payouts yet</div>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px" }}>Pay suppliers, employees, or withdraw funds</p>
          <button onClick={() => setModal("payout")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Send first payout →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {payouts.map(po => (
            <div key={po.id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{po.recipient}</div>
                <div style={{ fontSize: 12, color: LIGHT, marginTop: 2 }}>{po.method} · {new Date(po.createdAt).toLocaleDateString("en-CA")}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: TEXT }}>{fmt(po.amount)}</span>
                <Badge label={po.status} color={po.status === "sent" ? ZP_GREEN : po.status === "failed" ? "#EF4444" : "#F5A623"} />
                <button onClick={() => setPayouts(p => p.filter(x => x.id !== po.id))} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── TRANSACTIONS ─────────────────────────────────────────
  const TransactionsSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px", color: TEXT }}>Transactions</h2>
      <div style={{ textAlign: "center", padding: "60px 20px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>No transactions yet</div>
        <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.7 }}>
          {isSandbox
            ? "Create a pay link and simulate a payment with a test card to see transactions here."
            : "Your live transactions will appear here in real time."}
        </p>
      </div>
    </div>
  );

  // ── BANKING (ZeniCard) ─────────────────────────────────────
  const BankingSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px", color: TEXT }}>ZeniCard Account</h2>
      <div style={{ maxWidth: 380, marginBottom: 20 }}>
        <div style={{ borderRadius: 22, background: CARD_GRAD, padding: "24px", position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(229,36,123,0.3)", color: "#fff" }}>
          <img src="/zenipay-logo.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12, filter: "brightness(2) saturate(0)", mixBlendMode: "overlay" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>ZeniPay</div>
            <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: "0.12em", marginBottom: 24, textTransform: "uppercase" as const }}>ZeniCard Business Chequing</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Balance</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 20 }}>{fmt(account.balance)}</div>
            <div style={{ fontFamily: "monospace", fontSize: 14, letterSpacing: "0.2em" }}>•••• •••• •••• 4242</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, opacity: 0.7 }}>
              <span>{account.businessName}</span>
              <span>03/28</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        {[
          ["Account Type", "Business Chequing"],
          ["Institution",  "ZeniPay (Unit.co)"],
          ["Account #",    "•••• •••• 4242"],
          ["Transit #",    "•••• 218"],
          ["Currency",     "CAD"],
        ].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
            <span style={{ color: MUTED, fontSize: 13 }}>{l}</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {["Transfer Out", "Receive", "Statement", "Freeze Card"].map(label => (
          <button key={label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px", color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>{label}</button>
        ))}
      </div>
    </div>
  );

  // ── ACCOUNTING ────────────────────────────────────────────
  const AcctTotal  = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const AcctPayouts = payouts.reduce((s, p) => s + p.amount, 0);
  const AcctProfit  = AcctTotal - AcctPayouts;
  const AccountingSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TEXT }}>Accounting</h2>
        <button onClick={() => {
          const rows = ["Date,Description,Type,Amount"];
          invoices.forEach(i => rows.push(`${i.createdAt.split("T")[0]},Invoice ${i.id} - ${i.client},Revenue,${i.amount}`));
          payouts.forEach(p => rows.push(`${p.createdAt.split("T")[0]},Payout to ${p.recipient},Expense,-${p.amount}`));
          const blob = new Blob([rows.join("\n")], { type: "text/csv" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "zenipay_accounting.csv"; a.click();
        }} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬇ Export CSV</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Revenue",  value: fmt(AcctTotal),   color: ZP_GREEN  },
          { label: "Total Expenses", value: fmt(AcctPayouts), color: "#EF4444" },
          { label: "Net Profit",     value: fmt(AcctProfit),  color: AcctProfit >= 0 ? ZP_CYAN : "#EF4444" },
        ].map(k => (
          <div key={k.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" as const, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 11, color: LIGHT, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const }}>Journal Entries</div>
        {[...invoices.map(i => ({ date: i.createdAt, label: `Invoice ${i.id} — ${i.client}`, type: "Revenue", amount: i.amount, color: ZP_GREEN })),
          ...payouts.map(p => ({ date: p.createdAt, label: `Payout → ${p.recipient}`, type: "Expense", amount: -p.amount, color: "#EF4444" }))
        ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{e.label}</div>
              <div style={{ fontSize: 11, color: LIGHT }}>{new Date(e.date).toLocaleDateString("en-CA")} · {e.type}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: e.color }}>{e.amount >= 0 ? "+" : ""}{fmt(e.amount)}</span>
          </div>
        ))}
        {invoices.length === 0 && payouts.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: LIGHT, fontSize: 13 }}>No entries yet</div>
        )}
      </div>
    </div>
  );

  // ── ANALYTICS ────────────────────────────────────────────
  const AnalyticsSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px", color: TEXT }}>Analytics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Conversion Rate", value: payLinks.length > 0 ? `${Math.round((payLinks.filter(p => p.uses > 0).length / payLinks.length) * 100)}%` : "—" },
          { label: "Avg Transaction",  value: account.txCount > 0 ? fmt(account.volume / account.txCount) : "—" },
          { label: "Invoices Paid",    value: invoices.length > 0 ? `${Math.round((invoices.filter(i => i.status === "paid").length / invoices.length) * 100)}%` : "—" },
          { label: "Active Links",     value: String(payLinks.filter(p => p.status === "active").length) },
        ].map(k => (
          <div key={k.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" as const, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 11, color: LIGHT, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: TEXT }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: MUTED }}>Revenue — Last 12 months</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {[10, 25, 18, 40, 32, 55, 42, 60, 48, 70, 55, account.volume > 0 ? 75 : 0].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === 11 ? ZP_GRAD : "rgba(21,184,201,0.15)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: LIGHT }}>
          {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map(m => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );

  // ── API KEYS ──────────────────────────────────────────────
  const KeysSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: TEXT }}>API Keys</h2>
      <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px" }}>Authenticate your API requests with these keys.</p>
      {/* Sandbox */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>● Sandbox</div>
        {[{ label: "Publishable Key", val: account.sandboxKey }, { label: "Secret Key", val: account.sandboxSecret }].map(k => (
          <div key={k.label} style={{ padding: "12px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code style={{ flex: 1, fontSize: 11, background: "#f8fafc", padding: "8px 12px", borderRadius: 8, color: TEXT, wordBreak: "break-all" as const, border: `1px solid ${BORDER}` }}>{k.val}</code>
              <CopyBtn text={k.val} small />
            </div>
          </div>
        ))}
      </div>
      {/* Live */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>● Live</div>
        <div style={{ padding: "20px 18px", textAlign: "center" }}>
          {account.status === "live" || mode === "live" ? (
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Live Key</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ flex: 1, fontSize: 11, background: "#f8fafc", padding: "8px 12px", borderRadius: 8, color: TEXT, wordBreak: "break-all" as const, border: `1px solid ${BORDER}` }}>{account.liveKey}</code>
                <CopyBtn text={account.liveKey} small />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: TEXT }}>Prêt à passer en production ?</div>
              <p style={{ fontSize: 12, color: MUTED, margin: "0 0 16px", lineHeight: 1.6 }}>
                Votre compte sandbox est pleinement fonctionnel. Lorsque vous êtes prêt à accepter de vrais paiements, activez le mode Live.
              </p>
              <button onClick={() => setTab("go-live")} style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", border: "none", cursor: "pointer", padding: "11px 28px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
                Activer le mode Live →
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Code snippet */}
      <div style={{ background: "#0d1117", border: `1px solid #30363d`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#8b949e", fontWeight: 700 }}>Node.js — Create Payment</span>
          <CopyBtn text={`import ZeniPay from '@zenipay/node';\nconst zp = new ZeniPay('${activeKey || "YOUR_KEY"}');\nconst payment = await zp.payments.create({ amount: 1000, currency: 'cad' });`} small />
        </div>
        <pre style={{ margin: 0, padding: "14px 18px", fontSize: 12, lineHeight: 1.7, color: "#e6edf3", overflowX: "auto" as const }}>
{`import ZeniPay from '@zenipay/node';
const zp = new ZeniPay('${activeKey || "YOUR_KEY"}');

const payment = await zp.payments.create({
  amount: 1000,           // in cents (CAD)
  currency: 'cad',
  description: 'Order #1042',
  source: { token: 'tok_from_checkout' }
});
console.log(payment.id); // pay_xxxxxxxx`}
        </pre>
      </div>
    </div>
  );

  // ── SETTINGS ─────────────────────────────────────────────
  const SettingsSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 24px", color: TEXT }}>Settings</h2>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: TEXT }}>{account.plan === "Sandbox" ? "Standard" : account.plan}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            {(account.plan === "Standard" || account.plan === "Sandbox") ? "2.9% + $0.30" : account.plan === "Business" ? "2.2% + $0.25" : "2% + $0.20"} per transaction
          </div>
        </div>
        <a href="/payments" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>Upgrade Plan →</a>
      </div>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Business Info</div>
        {[
          ["Business Name", account.businessName],
          ["Owner",         account.ownerName],
          ["Email",         account.email],
          ["Phone",         account.phone],
          ["Website",       account.website],
          ["Type",          account.businessType],
          ["Country",       account.country],
          ["Est. Volume",   account.monthlyVolume ? `$${account.monthlyVolume}/mo` : "—"],
          ["Member Since",  new Date(account.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })],
        ].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
            <span style={{ color: MUTED, fontSize: 13 }}>{l}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{v || "—"}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(42,143,224,0.06)", border: "1px solid rgba(42,143,224,0.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ZP_BLUE, marginBottom: 6 }}>💬 Support</div>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: MUTED, lineHeight: 1.7 }}>Mon–Fri, 9am–6pm ET</p>
        <a href="mailto:info@zenipay.ca" style={{ fontSize: 13, color: ZP_CYAN, fontWeight: 700, textDecoration: "none" }}>info@zenipay.ca</a>
      </div>
      <button onClick={onSignOut} style={{ width: "100%", padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Sign Out</button>
    </div>
  );

  // ── GO LIVE SECTION ────────────────────────────────────────
  const GL_STEPS = [
    { id: "business",    icon: "🏢", title: "Business Verification",  desc: "Confirm your legal business information" },
    { id: "integration", icon: "⚙️", title: "Integration Setup",       desc: "Install the SDK and run a test payment" },
    { id: "compliance",  icon: "📋", title: "Volume & Compliance",     desc: "Required for payment network compliance" },
    { id: "review",      icon: "🔍", title: "Under Review",            desc: "We're reviewing your application" },
  ];
  const SDK_STEPS = [
    { key: "sdk",     label: "Install SDK",         code: "npm install @zenipay/node" },
    { key: "init",    label: "Initialize client",   code: `import ZeniPay from '@zenipay/node';\nconst zp = new ZeniPay('${account.sandboxKey || "zpk_sb_xxx"}');` },
    { key: "test",    label: "Create test payment", code: `const payment = await zp.payments.create({\n  amount: 1000, currency: 'cad',\n  source: { number: '4111111111111111', exp_month: 12, exp_year: 2028, cvc: '999' }\n});\nconsole.log(payment.id);` },
    { key: "webhook", label: "Setup webhook",       code: `app.post('/webhook', zp.webhooks.express({\n  secret: '${account.sandboxSecret || "zps_sb_xxx"}',\n  on: { 'payment.succeeded': (e) => console.log(e) }\n}));` },
  ];
  const GoLiveSection = (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", color: TEXT }}>Activate Live Account</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Complete all steps to unlock real payments and receive your live API keys.</p>
      </div>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {GL_STEPS.map((s, i) => (
          <div key={s.id} onClick={() => i < glStep && setGlStep(i)} style={{ flex: 1, cursor: i < glStep ? "pointer" : "default" }}>
            <div style={{ height: 4, borderRadius: 4, background: i < glStep ? ZP_GREEN : i === glStep ? ZP_CYAN : BORDER, marginBottom: 6, transition: "background 0.3s" }} />
            <div style={{ fontSize: 11, color: i === glStep ? TEXT : LIGHT, fontWeight: i === glStep ? 700 : 400, textAlign: "center" as const }}>{i < glStep ? "✓ " : ""}{s.title.split(" ")[0]}</div>
          </div>
        ))}
      </div>
      {/* Sandbox keys */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: ZP_GREEN, marginBottom: 10 }}>🧪 Your Sandbox Keys (active now)</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[{ label: "Publishable Key", value: account.sandboxKey }, { label: "Secret Key", value: account.sandboxSecret }].map(k => (
            <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: MUTED, width: 110, flexShrink: 0 }}>{k.label}</span>
              <code style={{ flex: 1, fontSize: 11, background: "#f8fafc", padding: "6px 10px", borderRadius: 8, color: TEXT, wordBreak: "break-all" as const, border: `1px solid ${BORDER}` }}>{k.value || "—"}</code>
              <CopyBtn text={k.value} small />
            </div>
          ))}
        </div>
      </div>
      {/* Step card */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{GL_STEPS[glStep].icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: TEXT }}>Step {glStep + 1} — {GL_STEPS[glStep].title}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{GL_STEPS[glStep].desc}</div>
          </div>
        </div>
        <div style={{ padding: "20px" }}>
          {/* Step 0 – Business */}
          {glStep === 0 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "legalName",    label: "Legal Business Name",  type: "text",   placeholder: "ZeniPay Inc.",                    full: false },
                  { key: "businessNum",  label: "Business Number (BN)", type: "text",   placeholder: "123456789",                       full: false },
                  { key: "address",      label: "Business Address",     type: "text",   placeholder: "123 Main St, Toronto, ON",        full: true  },
                  { key: "industry",     label: "Industry Category",    type: "select", options: ["E-commerce","SaaS","Travel","Marketplace","Restaurant","Retail","Healthcare","Other"], full: false },
                  { key: "website2",     label: "Business Website",     type: "text",   placeholder: "https://yourbusiness.com",        full: false },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
                    <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
                    {f.type === "select"
                      ? <select value={glForm[f.key]||""} onChange={e => setGlField(f.key, e.target.value)} style={IS}><option value="">Choose…</option>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                      : <input type="text" placeholder={f.placeholder} value={glForm[f.key]||""} onChange={e => setGlField(f.key, e.target.value)} style={IS} />
                    }
                  </div>
                ))}
              </div>
              <button onClick={() => { setGlStep(1); saveGL({ step: 1 }); }} disabled={!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry} style={{ marginTop: 18, width: "100%", padding: 13, background: (!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry) ? BORDER : ZP_GRAD, color: (!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry) ? MUTED : "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Save & Continue →</button>
            </div>
          )}
          {/* Step 1 – Integration */}
          {glStep === 1 && (
            <div>
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(45,190,96,0.06)", border: "1px solid rgba(45,190,96,0.2)", borderRadius: 10, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>Follow these steps in your terminal / codebase. Check each one when done.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SDK_STEPS.map((s, i) => (
                  <div key={s.key} style={{ background: "#f8fafc", border: `1px solid ${glChecked[s.key] ? "rgba(45,190,96,0.4)" : BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD_BG }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: glChecked[s.key] ? ZP_GREEN : BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: glChecked[s.key] ? "#fff" : MUTED }}>{glChecked[s.key] ? "✓" : i+1}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <CopyBtn text={s.code} small />
                        <button onClick={() => toggleGL(s.key)} style={{ background: glChecked[s.key] ? "rgba(45,190,96,0.1)" : CARD_BG, border: `1px solid ${glChecked[s.key] ? "rgba(45,190,96,0.4)" : BORDER}`, color: glChecked[s.key] ? ZP_GREEN : MUTED, padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>{glChecked[s.key] ? "Done ✓" : "Mark done"}</button>
                      </div>
                    </div>
                    <pre style={{ margin: 0, padding: "10px 14px", fontSize: 11, lineHeight: 1.7, color: "#e6edf3", overflowX: "auto" as const, background: "#0d1117" }}>{s.code}</pre>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: ZP_CYAN }}>Test cards: </span>
                <span style={{ color: MUTED }}>Visa: <code style={{ color: TEXT }}>4111 1111 1111 1111</code> · MC: <code style={{ color: TEXT }}>5454 5454 5454 5454</code> · Any future exp · CVC 999</span>
              </div>
              <button onClick={() => { setGlStep(2); saveGL({ step: 2 }); }} disabled={Object.values(glChecked).filter(Boolean).length < 2} style={{ marginTop: 18, width: "100%", padding: 13, background: Object.values(glChecked).filter(Boolean).length < 2 ? BORDER : ZP_GRAD, color: Object.values(glChecked).filter(Boolean).length < 2 ? MUTED : "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Integration looks good → Continue</button>
            </div>
          )}
          {/* Step 2 – Compliance */}
          {glStep === 2 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "monthlyVolume2", label: "Expected Monthly Volume (CAD)", type: "select", options: ["Under $1,000","$1,000 – $10,000","$10,000 – $50,000","$50,000 – $200,000","$200,000+"], full: false },
                  { key: "avgTicket",      label: "Average Transaction Size",     type: "select", options: ["Under $25","$25 – $100","$100 – $500","$500 – $2,000","$2,000+"],               full: false },
                  { key: "intlCards",      label: "Accept international cards?",  type: "select", options: ["Yes — mostly domestic","Yes — global customer base","No — domestic only"],       full: false },
                  { key: "refundPolicy",   label: "Refund Policy URL",            type: "text",   placeholder: "https://yourbusiness.com/refunds",                                            full: true  },
                  { key: "termsUrl",       label: "Terms of Service URL",         type: "text",   placeholder: "https://yourbusiness.com/terms",                                              full: true  },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
                    <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
                    {f.type === "select"
                      ? <select value={glForm[f.key]||""} onChange={e => setGlField(f.key, e.target.value)} style={IS}><option value="">Choose…</option>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>
                      : <input type="text" placeholder={f.placeholder} value={glForm[f.key]||""} onChange={e => setGlField(f.key, e.target.value)} style={IS} />
                    }
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>By submitting this application you agree to the ZeniPay Merchant Agreement and confirm all provided information is accurate and complete.</div>
              <button onClick={() => { setGlStep(3); saveGL({ step: 3, submitted: true }); }} disabled={!glForm.monthlyVolume2||!glForm.avgTicket} style={{ marginTop: 14, width: "100%", padding: 13, background: (!glForm.monthlyVolume2||!glForm.avgTicket) ? BORDER : ZP_GRAD, color: (!glForm.monthlyVolume2||!glForm.avgTicket) ? MUTED : "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Submit for Live Review →</button>
            </div>
          )}
          {/* Step 3 – Under Review */}
          {glStep === 3 && (
            <div style={{ textAlign: "center" as const, padding: "16px 0 8px" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>⏳</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 10px", color: TEXT }}>Application submitted!</h3>
              <p style={{ color: MUTED, fontSize: 14, margin: "0 0 20px", lineHeight: 1.7 }}>Our team will review your application within <strong style={{ color: TEXT }}>1–2 business days</strong>.<br />We will email <strong style={{ color: ZP_CYAN }}>{account.email}</strong> when approved.</p>
              <div style={{ display: "grid", gap: 8, maxWidth: 360, margin: "0 auto 20px" }}>
                {[
                  { icon: "✅", label: "Business Verification", done: true  },
                  { icon: "✅", label: "Integration Setup",     done: true  },
                  { icon: "✅", label: "Compliance Review",     done: true  },
                  { icon: "🔄", label: "ZeniPay Review",        done: false },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, background: item.done ? "rgba(45,190,96,0.06)" : "#f8fafc", border: `1px solid ${item.done ? "rgba(45,190,96,0.3)" : BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.done ? ZP_GREEN : MUTED }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <a href="mailto:info@zenipay.ca" style={{ display: "inline-block", background: "#f8fafc", border: `1px solid ${BORDER}`, color: TEXT, textDecoration: "none", padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>Contact Support</a>
              <div style={{ marginTop: 16, padding: "8px 14px", background: "rgba(123,79,191,0.06)", border: "1px solid rgba(123,79,191,0.2)", borderRadius: 10, fontSize: 11, color: ZP_PURPLE }}>
                Demo: <button onClick={() => onApproved?.()} style={{ background: "none", border: "none", color: ZP_PURPLE, cursor: "pointer", fontWeight: 700, fontSize: 11, padding: "0 4px" }}>Simulate approval →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SECTION_MAP: Record<string, React.ReactNode> = {
    overview: OverviewSection,
    transactions: TransactionsSection,
    banking: BankingSection,
    paylinks: PayLinksSection,
    invoices: InvoicesSection,
    payouts: PayoutsSection,
    accounting: AccountingSection,
    analytics: AnalyticsSection,
    keys: KeysSection,
    settings: SettingsSection,
    "go-live": GoLiveSection,
  };

  // ── MODALS ────────────────────────────────────────────────
  const payLinkModal = modal === "paylink" && (
    <Modal title="Create Payment Link" onClose={() => setModal(null)}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>Templates</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LINK_TEMPLATES.map(t => (
            <button key={t.title} onClick={() => setPlForm(f => ({ ...f, title: t.title, amount: t.amount, desc: t.desc }))} style={{ background: "#f8fafc", border: `1px solid ${BORDER}`, color: MUTED, padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>{t.title}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {[
          { label: "Link Title",   key: "title",  type: "text",   ph: "e.g. Product Purchase" },
          { label: "Amount (CAD)", key: "amount", type: "number", ph: "99.00" },
          { label: "Customer Email (optional)", key: "email", type: "email", ph: "customer@email.com" },
          { label: "Description",  key: "desc",   type: "text",   ph: "What is this payment for?" },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={plForm[f.key as keyof typeof plForm]} onChange={e => setPlForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
        <button onClick={createPayLink} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>Create Payment Link →</button>
      </div>
    </Modal>
  );

  const invoiceModal = modal === "invoice" && (
    <Modal title="Create Invoice" onClose={() => setModal(null)}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>Templates</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {INV_TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { setInvItems(t.items); setModal("invoice"); }} style={{ background: "#f8fafc", border: `1px solid ${BORDER}`, color: MUTED, padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>{t.name}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Client Name",  key: "client",  type: "text",  ph: "Acme Corp" },
          { label: "Client Email", key: "email",   type: "email", ph: "billing@client.com" },
          { label: "Due Date",     key: "dueDate", type: "date",  ph: "" },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={invForm[f.key as keyof typeof invForm]} onChange={e => setInvForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 8 }}>LINE ITEMS</div>
        {invItems.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 6, fontSize: 13, color: TEXT }}>
            <span>{item.desc} × {item.qty}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>{fmt(item.qty * item.price)}</span>
              <button onClick={() => setInvItems(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
            </div>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginTop: 8 }}>
          <input placeholder="Description" value={invForm.desc} onChange={e => setInvForm(f => ({ ...f, desc: e.target.value }))} style={{ ...IS, fontSize: 12 }} />
          <input placeholder="Qty" type="number" value={invForm.qty} onChange={e => setInvForm(f => ({ ...f, qty: e.target.value }))} style={{ ...IS, fontSize: 12 }} />
          <input placeholder="Price $" type="number" value={invForm.price} onChange={e => setInvForm(f => ({ ...f, price: e.target.value }))} style={{ ...IS, fontSize: 12 }} />
          <button onClick={addInvItem} style={{ background: "#f8fafc", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "0 12px", fontSize: 20, cursor: "pointer" }}>+</button>
        </div>
      </div>
      {invItems.length > 0 && (
        <div style={{ textAlign: "right", fontWeight: 800, fontSize: 16, marginBottom: 12, color: TEXT }}>
          Total: {fmt(invItems.reduce((s, i) => s + i.qty * i.price, 0))}
        </div>
      )}
      <button onClick={createInvoice} disabled={!invForm.client || invItems.length === 0} style={{ width: "100%", background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Create Invoice →</button>
    </Modal>
  );

  const payoutModal = modal === "payout" && (
    <Modal title="Send Payout" onClose={() => setModal(null)}>
      <div style={{ display: "grid", gap: 12 }}>
        {[
          { label: "Recipient Name", key: "recipient", type: "text",   ph: "John Smith" },
          { label: "Amount (CAD)",   key: "amount",    type: "number", ph: "500.00" },
          { label: "Note (optional)",key: "note",      type: "text",   ph: "Invoice #1042 payment" },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={poForm[f.key as keyof typeof poForm]} onChange={e => setPoForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5 }}>Payment Method</label>
          <select value={poForm.method} onChange={e => setPoForm(p => ({ ...p, method: e.target.value }))} style={{ ...IS }}>
            {["e-Transfer","ACH / EFT","Wire Transfer","Interac"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={createPayout} disabled={!poForm.recipient || !poForm.amount} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Send Payout →</button>
      </div>
    </Modal>
  );

  // ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: PAGE_BG, color: TEXT, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        select option { background: #fff; color: #0f172a; }
        pre { font-family: 'SF Mono','Fira Code',monospace; }
        button:active { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* ── Sidebar ─────────────────────────────── */}
      {(sideOpen || !isMobile) && (
        <aside style={{ width: isMobile ? "100vw" : 220, background: SIDEBAR, borderRight: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", position: isMobile ? "fixed" : "sticky", top: 0, height: "100vh", zIndex: 100, flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(21,184,201,0.5))" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style"); }}
              />
              <div style={{ width: 28, height: 28, borderRadius: 8, background: ZP_GRAD, alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff", display: "none" } as React.CSSProperties}>Z</div>
              <span style={{ fontWeight: 800, fontSize: 16, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</span>
            </div>
            {isMobile && <button onClick={() => setSideOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 22 }}>×</button>}
          </div>
          {/* Business + mode */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.businessName}</div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(45,190,96,0.2)", color: ZP_GREEN, border: "1px solid rgba(45,190,96,0.4)" }}>
              {isSandbox ? "● SANDBOX" : "● LIVE"}
            </span>
          </div>
          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); if (isMobile) setSideOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: tab === t.id ? `linear-gradient(135deg, ${ZP_CYAN}25, ${ZP_CYAN}10)` : "transparent", border: tab === t.id ? `1px solid ${ZP_CYAN}40` : "1px solid transparent", borderRadius: 10, color: tab === t.id ? "#fff" : "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", textAlign: "left" as const, marginBottom: 1, transition: "all 0.15s" }}>
                <span style={{ fontSize: 16, width: 22 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          {/* Sign out */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button onClick={onSignOut} style={{ width: "100%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
          </div>
        </aside>
      )}

      {/* ── Main content ─────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: TOPBAR_BG, borderBottom: `1px solid ${BORDER}`, height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {isMobile && (
            <button onClick={() => setSideOpen(true)} style={{ background: "none", border: "none", color: TEXT, cursor: "pointer", fontSize: 22, padding: "0 4px" }}>☰</button>
          )}
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: TEXT }}>{TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}</div>
          <span style={{ fontSize: 12, color: MUTED }}>
            {account.plan === "Sandbox" ? "Standard" : account.plan} plan
            {isSandbox && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: ZP_GREEN }}>SANDBOX</span>}
          </span>
        </div>
        {/* Page */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
          {SECTION_MAP[tab] || OverviewSection}
        </div>
      </div>

      {/* Modals */}
      {payLinkModal}
      {invoiceModal}
      {payoutModal}
    </div>
  );
}
