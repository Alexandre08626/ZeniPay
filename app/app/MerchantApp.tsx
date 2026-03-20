"use client";
import { useState, useEffect, useRef } from "react";

// ─── Brand ─────────────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const CARD_GRAD = "linear-gradient(135deg, #E5247B 0%, #F5A623 50%, #7B4FBF 100%)";
const DARK      = "#0A0F1E";
const DARK2     = "#111827";
const PANEL     = "#0d1524";
const GLASS     = "rgba(255,255,255,0.05)";
const BORDER    = "rgba(255,255,255,0.09)";

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
    <button onClick={copy} style={{ background: copied ? "rgba(45,190,96,0.15)" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "rgba(45,190,96,0.4)" : BORDER}`, color: copied ? ZP_GREEN : "rgba(255,255,255,0.7)", padding: small ? "4px 10px" : "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
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
    // Insert banking after overview, accounting/analytics before keys
    const result = [base[0], base[1], businessExtra[0], ...base.slice(2, 5), businessExtra[1], businessExtra[2], ...base.slice(5)];
    return result;
  }
  return base;
}

// ─── Modal wrapper ─────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Input style ───────────────────────────────────────────
const IS: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`,
  color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function MerchantApp({ account, mode, onSignOut, onGoLive }: {
  account: Account;
  mode: "sandbox" | "live";
  onSignOut: () => void;
  onGoLive?: () => void;
}) {
  const TABS = getTabs(account.plan);
  const [tab,         setTab]         = useState("overview");
  const [sideOpen,    setSideOpen]    = useState(true);
  const [isMobile,    setIsMobile]    = useState(false);
  const [modal,       setModal]       = useState<string|null>(null);
  const isSandbox = mode === "sandbox";

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
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Welcome back, {account.ownerName || account.businessName}</h2>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{isSandbox ? "🧪 Sandbox — test your integration" : "🟢 Live — real transactions"}</p>
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
          <div key={k.label} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 16px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "New Payment Link", icon: "🔗", action: () => { setTab("paylinks"); setModal("paylink"); } },
            { label: "Create Invoice",   icon: "📄", action: () => { setTab("invoices"); setModal("invoice"); } },
            { label: "Send Payout",      icon: "💸", action: () => { setTab("payouts");  setModal("payout"); } },
            { label: "API Keys",         icon: "🔑", action: () => setTab("keys") },
          ].map(a => (
            <button key={a.label} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 8, background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
      {/* Recent Pay Links */}
      {payLinks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Recent Pay Links</div>
          <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {payLinks.slice(0, 5).map(l => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{l.url}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 900 }}>{fmt(l.amount)}</span>
                  <Badge label={l.status} color={l.status === "active" ? ZP_GREEN : "#94A3B8"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Sandbox test cards */}
      {isSandbox && (
        <div style={{ marginTop: 20, background: "rgba(21,184,201,0.06)", border: "1px solid rgba(21,184,201,0.2)", borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: ZP_CYAN, marginBottom: 8 }}>🧪 Test Cards</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[{ brand: "Visa", num: "4111 1111 1111 1111" }, { brand: "MC", num: "5454 5454 5454 5454" }].map(c => (
              <span key={c.brand} style={{ fontSize: 12 }}>
                <span style={{ color: ZP_CYAN, fontWeight: 700 }}>{c.brand}: </span>
                <code style={{ color: "rgba(255,255,255,0.8)" }}>{c.num}</code>
              </span>
            ))}
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Any future exp · CVC 999</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── PAY LINKS ────────────────────────────────────────────
  const PayLinksSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Payment Links</h2>
        <button onClick={() => setModal("paylink")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ New Link</button>
      </div>
      {payLinks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No payment links yet</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>Create a shareable link and get paid in seconds</p>
          <button onClick={() => setModal("paylink")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Create your first link →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {payLinks.map(l => (
            <div key={l.id} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{l.title}</span>
                  <Badge label={l.status} color={l.status === "active" ? ZP_GREEN : "#94A3B8"} />
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l.url}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt(l.amount)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l.uses} use{l.uses !== 1 ? "s" : ""}</div>
                </div>
                <CopyBtn text={l.url} small />
                <button onClick={() => setPayLinks(p => p.map(x => x.id === l.id ? { ...x, status: x.status === "active" ? "paused" : "active" } : x))} style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)", padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
                  {l.status === "active" ? "Pause" : "Resume"}
                </button>
                <button onClick={() => setPayLinks(p => p.filter(x => x.id !== l.id))} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444", padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── INVOICES ─────────────────────────────────────────────
  const statusColor = (s: string) => ({ draft:"#94A3B8", sent:ZP_CYAN, paid:ZP_GREEN, overdue:"#EF4444" }[s] || "#fff");
  const InvoicesSection = (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Invoices</h2>
        <button onClick={() => setModal("invoice")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ New Invoice</button>
      </div>
      {invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No invoices yet</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>Professional invoices with automatic payment collection</p>
          <button onClick={() => setModal("invoice")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Create first invoice →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {invoices.map(inv => (
            <div key={inv.id} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>#{inv.id} — {inv.client}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{inv.email} · Due {new Date(inv.dueDate).toLocaleDateString("en-CA")}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>{fmt(inv.amount)}</span>
                  <Badge label={inv.status} color={statusColor(inv.status)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {inv.status === "draft" && (
                  <button onClick={() => setInvoices(p => p.map(x => x.id === inv.id ? { ...x, status: "sent" } : x))} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Send</button>
                )}
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <button onClick={() => setInvoices(p => p.map(x => x.id === inv.id ? { ...x, status: "paid" } : x))} style={{ background: "rgba(45,190,96,0.15)", color: ZP_GREEN, border: "1px solid rgba(45,190,96,0.3)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark Paid</button>
                )}
                <button onClick={() => setInvoices(p => p.filter(x => x.id !== inv.id))} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
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
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Payouts</h2>
        <button onClick={() => setModal("payout")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ Send Payout</button>
      </div>
      {payouts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No payouts yet</div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px" }}>Pay suppliers, employees, or withdraw funds</p>
          <button onClick={() => setModal("payout")} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Send first payout →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {payouts.map(po => (
            <div key={po.id} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{po.recipient}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{po.method} · {new Date(po.createdAt).toLocaleDateString("en-CA")}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 900 }}>{fmt(po.amount)}</span>
                <Badge label={po.status} color={po.status === "sent" ? ZP_GREEN : po.status === "failed" ? "#EF4444" : "#F5A623"} />
                <button onClick={() => setPayouts(p => p.filter(x => x.id !== po.id))} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>Delete</button>
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
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px" }}>Transactions</h2>
      <div style={{ textAlign: "center", padding: "60px 20px", background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No transactions yet</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.7 }}>
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
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px" }}>ZeniCard Account</h2>
      {/* Card visual */}
      <div style={{ maxWidth: 380, marginBottom: 20 }}>
        <div style={{ borderRadius: 22, background: CARD_GRAD, padding: "24px", position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(229,36,123,0.3)" }}>
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
      {/* Account details */}
      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        {[
          ["Account Type", "Business Chequing"],
          ["Institution",  "ZeniPay (Unit.co)"],
          ["Account #",    "•••• •••• 4242"],
          ["Transit #",    "•••• 218"],
          ["Currency",     "CAD"],
        ].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{l}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {["Transfer Out", "Receive", "Statement", "Freeze Card"].map(label => (
          <button key={label} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{label}</button>
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
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Accounting</h2>
        <button onClick={() => {
          const rows = ["Date,Description,Type,Amount"];
          invoices.forEach(i => rows.push(`${i.createdAt.split("T")[0]},Invoice ${i.id} - ${i.client},Revenue,${i.amount}`));
          payouts.forEach(p => rows.push(`${p.createdAt.split("T")[0]},Payout to ${p.recipient},Expense,-${p.amount}`));
          const blob = new Blob([rows.join("\n")], { type: "text/csv" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "zenipay_accounting.csv"; a.click();
        }} style={{ background: GLASS, border: `1px solid ${BORDER}`, color: "#fff", borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬇ Export CSV</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Revenue",  value: fmt(AcctTotal),   color: ZP_GREEN  },
          { label: "Total Expenses", value: fmt(AcctPayouts), color: "#EF4444" },
          { label: "Net Profit",     value: fmt(AcctProfit),  color: AcctProfit >= 0 ? ZP_CYAN : "#EF4444" },
        ].map(k => (
          <div key={k.label} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" as const }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* Journal */}
      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase" as const }}>Journal Entries</div>
        {[...invoices.map(i => ({ date: i.createdAt, label: `Invoice ${i.id} — ${i.client}`, type: "Revenue", amount: i.amount, color: ZP_GREEN })),
          ...payouts.map(p => ({ date: p.createdAt, label: `Payout → ${p.recipient}`, type: "Expense", amount: -p.amount, color: "#EF4444" }))
        ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{new Date(e.date).toLocaleDateString("en-CA")} · {e.type}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: e.color }}>{e.amount >= 0 ? "+" : ""}{fmt(e.amount)}</span>
          </div>
        ))}
        {invoices.length === 0 && payouts.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>No entries yet</div>
        )}
      </div>
    </div>
  );

  // ── ANALYTICS ────────────────────────────────────────────
  const AnalyticsSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px" }}>Analytics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Conversion Rate", value: payLinks.length > 0 ? `${Math.round((payLinks.filter(p => p.uses > 0).length / payLinks.length) * 100)}%` : "—" },
          { label: "Avg Transaction",  value: account.txCount > 0 ? fmt(account.volume / account.txCount) : "—" },
          { label: "Invoices Paid",    value: invoices.length > 0 ? `${Math.round((invoices.filter(i => i.status === "paid").length / invoices.length) * 100)}%` : "—" },
          { label: "Active Links",     value: String(payLinks.filter(p => p.status === "active").length) },
        ].map(k => (
          <div key={k.label} style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" as const }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {/* Revenue bar chart placeholder */}
      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.6)" }}>Revenue — Last 12 months</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {[10, 25, 18, 40, 32, 55, 42, 60, 48, 70, 55, account.volume > 0 ? 75 : 0].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === 11 ? ZP_GRAD : "rgba(45,190,96,0.2)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map(m => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );

  // ── API KEYS ──────────────────────────────────────────────
  const KeysSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>API Keys</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 24px" }}>Authenticate your API requests with these keys.</p>
      {/* Sandbox */}
      <div style={{ background: "rgba(45,190,96,0.05)", border: "1px solid rgba(45,190,96,0.2)", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(45,190,96,0.15)", fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>● Sandbox</div>
        {[{ label: "Publishable Key", val: account.sandboxKey }, { label: "Secret Key", val: account.sandboxSecret }].map(k => (
          <div key={k.label} style={{ padding: "12px 18px", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code style={{ flex: 1, fontSize: 11, background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: 8, color: "rgba(255,255,255,0.85)", wordBreak: "break-all" as const }}>{k.val}</code>
              <CopyBtn text={k.val} small />
            </div>
          </div>
        ))}
      </div>
      {/* Live */}
      <div style={{ background: "rgba(45,190,96,0.05)", border: "1px solid rgba(45,190,96,0.2)", borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(45,190,96,0.15)", fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>● Live</div>
        <div style={{ padding: "20px 18px", textAlign: "center" }}>
          {account.status === "live" || mode === "live" ? (
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Live Key</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ flex: 1, fontSize: 11, background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: 8, color: "rgba(255,255,255,0.85)", wordBreak: "break-all" as const }}>{account.liveKey}</code>
                <CopyBtn text={account.liveKey} small />
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Prêt à passer en production ?</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.6 }}>
                Votre compte sandbox est pleinement fonctionnel. Lorsque vous êtes prêt à accepter de vrais paiements, activez le mode Live en quelques étapes simples.
              </p>
              <button
                onClick={() => onGoLive?.()}
                style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", border: "none", cursor: "pointer", padding: "11px 28px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}
              >
                Activer le mode Live →
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Code snippet */}
      <div style={{ background: "#0d1117", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Node.js — Create Payment</span>
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
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 24px" }}>Settings</h2>
      {/* Plan */}
      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{account.plan}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {account.plan === "Standard" ? "2.9% + $0.30" : account.plan === "Business" ? "2.2% + $0.25" : "2% + $0.20"} per transaction
          </div>
        </div>
        <a href="/payments" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>Upgrade Plan →</a>
      </div>
      {/* Business Info */}
      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Business Info</div>
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
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{l}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{v || "—"}</span>
          </div>
        ))}
      </div>
      {/* Support */}
      <div style={{ background: "rgba(42,143,224,0.07)", border: "1px solid rgba(42,143,224,0.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ZP_BLUE, marginBottom: 6 }}>💬 Support</div>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>Mon–Fri, 9am–6pm ET</p>
        <a href="mailto:info@zenipay.ca" style={{ fontSize: 13, color: ZP_CYAN, fontWeight: 700, textDecoration: "none" }}>info@zenipay.ca</a>
      </div>
      <button onClick={onSignOut} style={{ width: "100%", padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Sign Out</button>
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
  };

  // ── MODALS ────────────────────────────────────────────────
  const payLinkModal = modal === "paylink" && (
    <Modal title="Create Payment Link" onClose={() => setModal(null)}>
      {/* Templates */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>Templates</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LINK_TEMPLATES.map(t => (
            <button key={t.title} onClick={() => setPlForm(f => ({ ...f, title: t.title, amount: t.amount, desc: t.desc }))} style={{ background: GLASS, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.8)", padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>{t.title}</button>
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
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={plForm[f.key as keyof typeof plForm]} onChange={e => setPlForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
        <button onClick={createPayLink} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>Create Payment Link →</button>
      </div>
    </Modal>
  );

  const invoiceModal = modal === "invoice" && (
    <Modal title="Create Invoice" onClose={() => setModal(null)}>
      {/* Templates */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const }}>Templates</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {INV_TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { setInvItems(t.items); setModal("invoice"); }} style={{ background: GLASS, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.8)", padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>{t.name}</button>
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
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={invForm[f.key as keyof typeof invForm]} onChange={e => setInvForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
      </div>
      {/* Line items */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 8 }}>LINE ITEMS</div>
        {invItems.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: GLASS, borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
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
          <button onClick={addInvItem} style={{ background: GLASS, border: `1px solid ${BORDER}`, color: "#fff", borderRadius: 10, padding: "0 12px", fontSize: 20, cursor: "pointer" }}>+</button>
        </div>
      </div>
      {invItems.length > 0 && (
        <div style={{ textAlign: "right", fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
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
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input type={f.type} placeholder={f.ph} value={poForm[f.key as keyof typeof poForm]} onChange={e => setPoForm(p => ({ ...p, [f.key]: e.target.value }))} style={IS} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 5 }}>Payment Method</label>
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
    <div style={{ display: "flex", minHeight: "100vh", background: DARK, color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        select option { background: #1e293b; color: #fff; }
        pre { font-family: 'SF Mono','Fira Code',monospace; }
        button:active { opacity: 0.85; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

      {/* ── Sidebar ─────────────────────────────── */}
      {(sideOpen || !isMobile) && (
        <aside style={{ width: isMobile ? "100vw" : 220, background: PANEL, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", position: isMobile ? "fixed" : "sticky", top: 0, height: "100vh", zIndex: 100, flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14 }}>Z</div>
              <span style={{ fontWeight: 800, fontSize: 16, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</span>
            </div>
            {isMobile && <button onClick={() => setSideOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 22 }}>×</button>}
          </div>
          {/* Business + mode */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.businessName}</div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: "rgba(45,190,96,0.15)", color: ZP_GREEN, border: "1px solid rgba(45,190,96,0.3)" }}>
              {isSandbox ? "● SANDBOX" : "● LIVE"}
            </span>
          </div>
          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); if (isMobile) setSideOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: tab === t.id ? "rgba(21,184,201,0.1)" : "none", border: "none", borderLeft: `3px solid ${tab === t.id ? ZP_CYAN : "transparent"}`, color: tab === t.id ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", textAlign: "left" as const }}>
                <span style={{ fontSize: 16, width: 22 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          {/* Sign out */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
            <button onClick={onSignOut} style={{ width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", borderRadius: 10, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
          </div>
        </aside>
      )}

      {/* ── Main content ─────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${BORDER}`, height: 56, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          {isMobile && (
            <button onClick={() => setSideOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 22, padding: "0 4px" }}>☰</button>
          )}
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}</div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{account.plan} plan</span>
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
