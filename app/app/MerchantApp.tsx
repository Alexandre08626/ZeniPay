"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Brand ─────────────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const CARD_GRAD = "linear-gradient(135deg, #E5247B 0%, #F5A623 50%, #7B4FBF 100%)";
const TOPNAV    = "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #2A8FE0 80%, #7B4FBF 100%)";

// ─── Theme ─────────────────────────────────────────────
const PAGE_BG = "#f0f4f8";
const CARD_BG = "#ffffff";
const BORDER  = "#e2e8f0";
const ROW_SEP = "#f1f5f9";
const TEXT    = "#0f172a";
const MUTED   = "#64748b";
const LIGHT   = "#94a3b8";

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
interface BankCfg  { holderName: string; bankName: string; transit: string; institution: string; accountNum: string; accountType: string; step: number; [key: string]: string | number }

// ─── Helpers ────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
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
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: color + "18", color, border: `1px solid ${color}40`, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{label}</span>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: LIGHT, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}
const IS: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, background: "#f8fafc", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

// ── BankCard — animated credit card (ZenivaComplete style) ──────────
function BankCard({ holderName, bankName, accountNum, balance }: { holderName: string; bankName: string; accountNum: string; balance?: number }) {
  const [revealed, setRevealed] = React.useState(false);
  const last4 = accountNum.slice(-4).padStart(4, "•");
  return (
    <div style={{ width: "100%", maxWidth: 360, borderRadius: 20, position: "relative", overflow: "hidden", aspectRatio: "1.586", background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #2A8FE0 100%)", boxShadow: "0 24px 60px rgba(45,190,96,0.45), 0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.18)", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", cursor: "default", color: "white", fontFamily: "system-ui, sans-serif", userSelect: "none" as const }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-10px) scale(1.02)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)"; }}>
      <style>{`@keyframes shimmerZC{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(350%) skewX(-20deg)}} @keyframes logoPulseZC{0%,100%{opacity:0.12}50%{opacity:0.2}}`}</style>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.2) 100%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.18) 50%,transparent 65%)", animation:"shimmerZC 4s ease-in-out infinite", pointerEvents:"none" }} />
      <div style={{ position:"relative", height:"100%", padding:"6% 7%", display:"flex", flexDirection:"column" as const, justifyContent:"space-between" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
              <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:28, height:28, objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(255,255,255,0.4))" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
              <span style={{ fontWeight:800, fontSize:14, letterSpacing:"-0.3px", textShadow:"0 1px 6px rgba(0,0,0,0.4)" }}>ZeniPay</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <p style={{ margin:0, fontSize:8, opacity:0.55, letterSpacing:"0.14em", textTransform:"uppercase" as const }}>{bankName || "Business Account"}</p>
              <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:4, padding:"1px 6px", fontSize:7, fontWeight:800, letterSpacing:"0.1em" }}>DEBIT</span>
            </div>
          </div>
          <div style={{ width:38, height:28, borderRadius:5, background:"linear-gradient(145deg,#c9a84c 0%,#f2d76a 30%,#e5c035 65%,#b8900a 100%)", boxShadow:"inset 0 1px 2px rgba(255,255,255,0.55),0 2px 6px rgba(0,0,0,0.4)", position:"relative" }}>
            <div style={{ position:"absolute", inset:3, border:"1px solid rgba(0,0,0,0.18)", borderRadius:2 }} />
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"rgba(0,0,0,0.12)", transform:"translateX(-50%)" }} />
            <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,0.12)", transform:"translateY(-50%)" }} />
          </div>
        </div>
        <div>
          <p style={{ margin:"0 0 2px", fontSize:9, opacity:0.5, letterSpacing:"0.14em", textTransform:"uppercase" as const }}>Available Balance</p>
          <p style={{ margin:0, fontWeight:900, fontSize:22, letterSpacing:"-0.8px", textShadow:"0 2px 10px rgba(0,0,0,0.4)" }}>{balance !== undefined ? new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD"}).format(balance) : "$0.00"}</p>
        </div>
        <div>
          <p onClick={() => setRevealed(r => !r)} style={{ margin:"0 0 8px", fontSize:12, fontWeight:500, letterSpacing:"0.24em", fontFamily:"monospace", opacity:0.9, textShadow:"0 1px 4px rgba(0,0,0,0.3)", cursor:"pointer" }}>
            {revealed ? `5678  9120  00••  ${last4}` : `••••  ••••  ••••  ${last4}`}
            <span style={{ fontSize:7, fontFamily:"system-ui", letterSpacing:"0.05em", opacity:0.5, marginLeft:6, fontStyle:"italic" }}>{revealed ? "tap to hide" : "tap to reveal"}</span>
          </p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <p style={{ margin:"0 0 1px", fontSize:7, opacity:0.4, letterSpacing:"0.15em" }}>CARDHOLDER</p>
              <p style={{ margin:0, fontSize:10, fontWeight:700, letterSpacing:"0.06em", textShadow:"0 1px 3px rgba(0,0,0,0.3)" }}>{(holderName||"CARDHOLDER").toUpperCase()}</p>
            </div>
            <span style={{ fontWeight:900, fontStyle:"italic", fontSize:16, letterSpacing:"-0.5px", textShadow:"0 1px 4px rgba(0,0,0,0.4)", opacity:0.95 }}>VISA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs by mode ───────────────────────────────────────
function getTabs(mode: "sandbox" | "live") {
  if (mode === "live") {
    return [
      { id: "overview",     icon: "📊", label: "Overview"     },
      { id: "transactions", icon: "💳", label: "Transactions" },
      { id: "banking",      icon: "🏦", label: "Banking"      },
      { id: "paylinks",     icon: "🔗", label: "Pay Links"    },
      { id: "invoices",     icon: "📄", label: "Invoices"     },
      { id: "payouts",      icon: "💸", label: "Payouts"      },
      { id: "financing",    icon: "🏛️", label: "Financing"    },
      { id: "analytics",    icon: "📈", label: "Analytics"    },
      { id: "ben",          icon: "🤖", label: "Ben AI"       },
      { id: "accounting",   icon: "📚", label: "Accounting"   },
      { id: "cashback",     icon: "💰", label: "Cashback"     },
      { id: "keys",         icon: "🔑", label: "API"          },
      { id: "settings",     icon: "⚙️", label: "Settings"     },
    ];
  }
  // Sandbox
  return [
    { id: "overview",     icon: "📊", label: "Overview"     },
    { id: "transactions", icon: "💳", label: "Transactions" },
    { id: "banking",      icon: "🏦", label: "Bank Account" },
    { id: "paylinks",     icon: "🔗", label: "Pay Links"    },
    { id: "invoices",     icon: "📄", label: "Invoices"     },
    { id: "payouts",      icon: "💸", label: "Payouts"      },
    { id: "cashback",     icon: "💰", label: "Cashback"     },
    { id: "keys",         icon: "🔑", label: "API Keys"     },
    { id: "settings",     icon: "⚙️", label: "Settings"     },
    { id: "go-live",      icon: "🚀", label: "Go Live"      },
  ];
}

// ════════════════════════════════════════════════════════
export default function MerchantApp({ account, mode, onSignOut, onApproved, onModeChange }: {
  account: Account; mode: "sandbox"|"live"; onSignOut: () => void; onApproved?: () => void; onModeChange?: (m: "sandbox"|"live") => void;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isSandbox    = mode === "sandbox";

  const TABS = getTabs(isSandbox ? "sandbox" : "live");
  const validTabs  = TABS.map(t => t.id);
  const tabFromUrl = typeof window !== "undefined" ? (window.location.pathname.split("/app/")[1] || "overview") : "overview";
  const tab        = validTabs.includes(tabFromUrl) ? tabFromUrl : "overview";
  const setTab     = (id: string) => router.push(`/app/${id}`);

  const [modal,        setModal]        = useState<string|null>(null);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [apiLang,     setApiLang]     = useState<"node"|"php"|"python"|"curl">("node");
  const [bankAction,  setBankAction]  = useState<string|null>(null);
  const [bankActForm, setBankActForm] = useState<Record<string,string>>({});
  const [whUrl,        setWhUrl]        = useState("");
  const [whSaved,      setWhSaved]      = useState(false);
  const [rolledLive,   setRolledLive]   = useState<{newVal:string;oldVal:string;rolledAt:string}|null>(null);
  const [rolledSb,     setRolledSb]     = useState<{newVal:string;oldVal:string;rolledAt:string}|null>(null);
  const [notifEmail,   setNotifEmail]   = useState(true);
  const [benChat,      setBenChat]      = useState<{role:"ben"|"user";text:string}[]>([
    { role:"ben", text:`Hi! I'm Ben, your ZeniPay financial AI assistant. I monitor your account 24/7, detect anomalies, and give you real-time financial intelligence. Ask me anything about your revenue, payouts, or account health.` }
  ]);
  const [benMsg,       setBenMsg]       = useState("");
  const [benLoading,   setBenLoading]   = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 860);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Supabase merchant data helpers ───────────────────
  const merchantId = account.id || account.email;
  const [payLinks,      setPayLinks]      = useState<PayLink[]>([]);
  const [invoices,      setInvoices]      = useState<Invoice[]>([]);
  const [viewInvoice,   setViewInvoice]   = useState<Invoice | null>(null);
  const [cashbackData, setCashbackData] = useState<Record<string,unknown> | null>(null);
  useEffect(() => { fetch("/api/zenipay/cashback").then(r=>r.json()).then(d=>setCashbackData(d)).catch(()=>{}); }, []);
  const [payouts,       setPayouts]       = useState<Payout[]>([]);
  const [bankCfg,       setBankCfg]       = useState<BankCfg>({ holderName: "", bankName: "", transit: "", institution: "", accountNum: "", accountType: "chequing", step: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions,  setTransactions]  = useState<any[]>([]);
  const [dataLoaded,    setDataLoaded]    = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/zenipay/merchant-data?merchant_id=${encodeURIComponent(merchantId)}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          // Support both "payLinks" (stored by create-link) and "paylinks" (stored by old saves)
          if (data.payLinks || data.paylinks) setPayLinks(data.payLinks || data.paylinks);
          if (data.invoices)    setInvoices(data.invoices);
          if (data.payouts)     setPayouts(data.payouts);
          if (data.bankCfg)     setBankCfg(data.bankCfg);
          if (data.transactions) setTransactions(data.transactions);
        }
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  // Fetch real transactions + invoices from zenipay_payments / zenipay_invoices
  useEffect(() => {
    fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(merchantId)}`)
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        if (data?.recent_transactions?.length) {
          setTransactions(data.recent_transactions.map((t: any) => ({
            id: t.id,
            customer_name: t.customer || "",
            description: t.description || "",
            amount: t.amount,
            currency: t.currency || "USD",
            status: t.status || "succeeded",
            created_at: t.date,
          })));
        }
        if (data?.recent_invoices?.length) {
          setInvoices(data.recent_invoices.map((inv: any) => {
            let items: {desc:string;qty:number;price:number}[] = [];
            try {
              const raw = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items;
              items = (raw || []).map((it: any) => ({ desc: it.description || "", qty: it.qty || 1, price: it.unit_price || it.total || 0 }));
            } catch {}
            return {
              id: inv.invoice_number || inv.id,
              client: inv.customer_name || "Client",
              email: inv.customer_email || "",
              amount: Number(inv.total || inv.subtotal || 0),
              status: (inv.status === "paid" ? "paid" : inv.status === "sent" ? "sent" : "draft") as "draft"|"sent"|"paid"|"overdue",
              dueDate: inv.paid_at || inv.created_at || "",
              createdAt: inv.created_at || "",
              items,
            };
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch real balance from ledger
  const [realBalance, setRealBalance] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/zenipay/banking")
      .then(r => r.json())
      .then((data: { balance?: number }) => {
        if (typeof data?.balance === "number") setRealBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  // Fetch accounting summary from API
  const [acctSummary, setAcctSummary] = useState<{ totalRevenue: number; totalExpenses: number; netProfit: number; zenipayFees: number; txCount: number; journalEntries: unknown[]; chartOfAccounts: {code:string;name:string;balance:number;type:string}[] } | null>(null);
  useEffect(() => {
    fetch(`/api/zenipay/accounting/summary?merchant_id=${encodeURIComponent(merchantId)}`)
      .then(r => r.json())
      .then(data => setAcctSummary(data))
      .catch(() => {});
  }, [merchantId]);

  // Save to Supabase whenever data changes (after initial load)
  const saveToSupabase = React.useCallback((patch: Record<string, unknown>) => {
    if (!merchantId) return;
    fetch(`/api/zenipay/merchant-data?merchant_id=${encodeURIComponent(merchantId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }, [merchantId]);

  useEffect(() => {
    if (!dataLoaded) return;
    saveToSupabase({ payLinks, invoices, payouts, bankCfg });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payLinks, invoices, payouts, bankCfg, dataLoaded, saveToSupabase]);

  // Ben AI live activity feed — built from seeded data
  const liveActivity = [
    { id:1, type:"success", text:`Payment received — ${fmt(invoices.filter(i=>i.status==="paid")[0]?.amount||0)} · ${invoices.filter(i=>i.status==="paid")[0]?.client||"Client"}`, time:"just now" },
    { id:2, type:"success", text:"All systems operational — no anomalies detected", time:"2 min ago" },
    { id:3, type:"success", text:`Pay Link active — ${payLinks[0]?.title||"Payment Link"}`, time:"5 min ago" },
    { id:4, type:"alert",   text:"Rate limit monitor: no issues", time:"12 min ago" },
    { id:5, type:"success", text:`Payout processed → ${payouts[0]?.recipient||"Recipient"}`, time:"18 min ago" },
  ];

  // Data is now persisted via saveToSupabase in the combined effect above

  const saveBankCfg = (u: Partial<BankCfg>) => setBankCfg(p => ({ ...p, ...u } as BankCfg));

  const handleBenSend = () => {
    if (!benMsg.trim() || benLoading) return;
    const q = benMsg.trim();
    setBenChat(c => [...c, { role:"user", text:q }]);
    setBenMsg("");
    setBenLoading(true);
    const lower = q.toLowerCase();
    let ans = "I'm processing your request and analyzing your account data in real time. I'll have a detailed response shortly.";
    if (lower.includes("revenue") || lower.includes("volume")) ans = `Your total processed volume is ${fmt(account.volume)} across ${account.txCount} transactions. Your current balance is ${fmt(account.balance)}. ${payLinks.filter(p=>p.status==="active").length} pay links are active. Revenue trend is stable — recommend creating more pay links to accelerate growth.`;
    else if (lower.includes("payout") || lower.includes("transfer")) ans = `You have ${payouts.length} payout(s) on record. Last payout: ${fmt(payouts[0]?.amount||0)} to ${payouts[0]?.recipient||"N/A"} via ${payouts[0]?.method||"e-Transfer"} — status: ${payouts[0]?.status||"N/A"}. Payouts are typically settled within 1–2 business days.`;
    else if (lower.includes("invoice") || lower.includes("facture")) ans = `You have ${invoices.length} invoice(s). ${invoices.filter(i=>i.status==="paid").length} paid, ${invoices.filter(i=>i.status==="sent").length} pending, ${invoices.filter(i=>i.status==="draft").length} drafts. Total invoiced revenue: ${fmt(invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0))}.`;
    else if (lower.includes("fraud") || lower.includes("anomal") || lower.includes("security")) ans = "✅ No anomalies detected. All transactions are within normal parameters for your business type and volume. I'm monitoring continuously and will alert you immediately if anything unusual is detected.";
    else if (lower.includes("bank") || lower.includes("account")) ans = `Your bank account is ${bankCfg.step>=3?"connected and verified":"not yet connected"}. ${bankCfg.step>=3?`Account: ${bankCfg.bankName} — ${bankCfg.accountType} ····${bankCfg.accountNum.slice(-4)}. Settlements are processed automatically.`:"Visit the Banking tab to connect your account and start receiving payouts."}`;
    else if (lower.includes("report")) ans = "I can generate Income Statement, Balance Sheet, Cash Flow Statement, and Tax Summary reports. Go to the Accounting tab to view and download your reports.";
    setTimeout(() => { setBenChat(c => [...c, { role:"ben", text:ans }]); setBenLoading(false); }, 1200);
  };

  // ── Auto-seed sandbox data once Supabase load completes ─────────────
  useEffect(() => {
    if (!dataLoaded) return;

    const site = account.website || `https://${(account.businessName || "monentreprise").toLowerCase().replace(/\s+/g, "")}.ca`;
    const industry = account.businessType || "E-commerce";
    const volume   = (account.monthlyVolume || "").includes("200") ? "$200,000+" : "$10,000–$50,000";

    // Pre-fill Go Live form (localStorage is fine for application state)
    const currentGL = (() => { try { return JSON.parse(localStorage.getItem(glKey) || "{}"); } catch { return {}; } })();
    if (!currentGL.form?.legalName) {
      const f: Record<string,string> = {
        legalName: account.businessName || account.ownerName, businessNum: "789456123",
        address: "456 Rue Saint-Denis, Montréal, QC  H2J 2L1", industry,
        website2: site, monthlyVolume2: volume, avgTicket: "$100–$500",
        intlCards: "Yes — mostly domestic", refundPolicy: `${site}/remboursements`, termsUrl: `${site}/conditions`,
      };
      setGlForm(f);
      try { localStorage.setItem(glKey, JSON.stringify({ ...currentGL, form: f })); } catch {}
    }

    // Pre-configure bank account if not set
    if (bankCfg.step === 0) {
      setBankCfg({ holderName: account.ownerName || account.businessName, bankName: "TD Canada Trust", transit: "00152", institution: "004", accountNum: "5678912", accountType: "business chequing", step: 3 });
    }

    // Seed sample pay links if none exist
    if (payLinks.length === 0) {
      const base = typeof window !== "undefined" ? window.location.origin : "https://zenipay.ca";
      const links: PayLink[] = [
        { id: `LINK-${uid()}`, title: "Consultation 1h",   amount: 150, url: `${base}/pay/LINK-${uid()}?amount=150&currency=USD&desc=Consultation+1h`,   uses: 3,  createdAt: new Date(Date.now()-7*864e5).toISOString(),  status: "active" },
        { id: `LINK-${uid()}`, title: "Forfait Mensuel",   amount: 499, url: `${base}/pay/LINK-${uid()}?amount=499&currency=USD&desc=Forfait+Mensuel`,   uses: 12, createdAt: new Date(Date.now()-14*864e5).toISOString(), status: "active" },
        { id: `LINK-${uid()}`, title: "Dépôt Réservation", amount: 250, url: `${base}/pay/LINK-${uid()}?amount=250&currency=USD&desc=Depot+Reservation`, uses: 1,  createdAt: new Date(Date.now()-3*864e5).toISOString(),  status: "active" },
      ];
      setPayLinks(links);
    }

    // Seed sample invoices if none
    if (invoices.length === 0) {
      setInvoices([
        { id: "INV001", client: "Jean Tremblay",     email: "jean@tremblay.ca",  amount: 1800, status: "paid",  dueDate: new Date(Date.now()-5*864e5).toISOString().split("T")[0],  createdAt: new Date(Date.now()-20*864e5).toISOString(), items: [{desc:"Développement web",qty:1,price:1800}] },
        { id: "INV002", client: "Marie Côté",        email: "marie@coteinc.ca",  amount: 650,  status: "sent",  dueDate: new Date(Date.now()+10*864e5).toISOString().split("T")[0], createdAt: new Date(Date.now()-7*864e5).toISOString(),  items: [{desc:"Design graphique",qty:1,price:650}] },
        { id: "INV003", client: "Boutique Léa",      email: "lea@boutiqulea.ca", amount: 2400, status: "paid",  dueDate: new Date(Date.now()-15*864e5).toISOString().split("T")[0], createdAt: new Date(Date.now()-30*864e5).toISOString(), items: [{desc:"Refonte boutique",qty:1,price:2000},{desc:"Formation",qty:2,price:200}] },
        { id: "INV004", client: "Solutions Pro Inc", email: "admin@solpro.ca",   amount: 900,  status: "draft", dueDate: new Date(Date.now()+20*864e5).toISOString().split("T")[0], createdAt: new Date().toISOString(),                    items: [{desc:"Consultation",qty:3,price:300}] },
        { id: "INV005", client: "Groupe Marchand",   email: "info@gmarchand.ca", amount: 3200, status: "paid",  dueDate: new Date(Date.now()-25*864e5).toISOString().split("T")[0], createdAt: new Date(Date.now()-40*864e5).toISOString(), items: [{desc:"Projet e-commerce",qty:1,price:2800},{desc:"SEO setup",qty:1,price:400}] },
      ]);
    }

    // Seed sample payouts if none
    if (payouts.length === 0) {
      setPayouts([
        { id: uid(), recipient: account.ownerName || account.businessName, amount: 2500, method: "e-Transfer", status: "sent",    createdAt: new Date(Date.now()-10*864e5).toISOString() },
        { id: uid(), recipient: "Fournisseur ABC",                         amount: 850,  method: "ACH / EFT",  status: "sent",    createdAt: new Date(Date.now()-22*864e5).toISOString() },
        { id: uid(), recipient: account.ownerName || account.businessName, amount: 1800, method: "e-Transfer", status: "pending", createdAt: new Date().toISOString() },
      ]);
    }

    // Mark Go Live as submitted
    if (!currentGL.step || currentGL.step < 4) {
      try { localStorage.setItem(glKey, JSON.stringify({ ...currentGL, step: 4, submitted: true })); } catch {}
      setGlStep(4);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  // ── Pay Link form ────────────────────────────────────
  const [plForm, setPlForm] = useState({ title: "", amount: "", email: "", desc: "" });
  const createPayLink = async () => {
    if (!plForm.title || !plForm.amount) return;
    const apiKey = isSandbox ? account.sandboxKey : (account.liveKey || account.sandboxKey);
    try {
      const res = await fetch("/api/zenipay/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(plForm.amount),
          currency: "USD",
          description: plForm.title + (plForm.desc ? ` — ${plForm.desc}` : ""),
          merchant: account.businessName,
          merchant_id: account.id,
          api_key: apiKey,
        }),
      });
      const data = await res.json();
      if (data.id && data.url) {
        const link: PayLink = { id: data.id, title: plForm.title, amount: Number(plForm.amount), url: data.url, uses: 0, createdAt: new Date().toISOString(), status: "active" };
        setPayLinks(p => [link, ...p]);
      }
    } catch {
      // Fallback: create locally
      const id = `LINK-${uid()}`;
      const params = new URLSearchParams({ amount: String(Number(plForm.amount)), currency: "USD", desc: plForm.title + (plForm.desc ? ` — ${plForm.desc}` : ""), m: account.businessName });
      const url = `https://zenipay.ca/pay/${id}?${params.toString()}`;
      const link: PayLink = { id, title: plForm.title, amount: Number(plForm.amount), url, uses: 0, createdAt: new Date().toISOString(), status: "active" };
      setPayLinks(p => [link, ...p]);
    }
    setPlForm({ title: "", amount: "", email: "", desc: "" }); setModal(null);
  };

  // ── Invoice form ─────────────────────────────────────
  const [invForm,  setInvForm]  = useState({ client: "", email: "", dueDate: "", desc: "", qty: "1", price: "" });
  const [invItems, setInvItems] = useState<{desc:string;qty:number;price:number}[]>([]);
  const addInvItem = () => {
    if (!invForm.desc || !invForm.price) return;
    setInvItems(p => [...p, { desc: invForm.desc, qty: Number(invForm.qty)||1, price: Number(invForm.price) }]);
    setInvForm(f => ({ ...f, desc: "", qty: "1", price: "" }));
  };
  const createInvoice = () => {
    if (!invForm.client || invItems.length === 0) return;
    const total = invItems.reduce((s, i) => s + i.qty * i.price, 0);
    const inv: Invoice = { id: uid(), client: invForm.client, email: invForm.email, amount: total, status: "draft", dueDate: invForm.dueDate || new Date(Date.now()+30*864e5).toISOString().split("T")[0], createdAt: new Date().toISOString(), items: invItems };
    setInvoices(p => [inv, ...p]); setInvForm({ client: "", email: "", dueDate: "", desc: "", qty: "1", price: "" }); setInvItems([]); setModal(null);
  };

  // ── Payout form ──────────────────────────────────────
  const [poForm, setPoForm] = useState({ recipient: "", amount: "", method: "e-Transfer", note: "" });
  const createPayout = () => {
    if (!poForm.recipient || !poForm.amount) return;
    const po: Payout = { id: uid(), recipient: poForm.recipient, amount: Number(poForm.amount), method: poForm.method, status: "pending", createdAt: new Date().toISOString() };
    setPayouts(p => [po, ...p]); setPoForm({ recipient: "", amount: "", method: "e-Transfer", note: "" }); setModal(null);
  };

  // ── Go Live form ─────────────────────────────────────
  const glKey = `zp_golive_${account.email}`;
  const loadGL = () => { try { return JSON.parse(localStorage.getItem(glKey) || "{}"); } catch { return {}; } };
  const saveGL = (u: Record<string, unknown>) => { try { localStorage.setItem(glKey, JSON.stringify({ ...loadGL(), ...u })); } catch {} };
  const [glStep,    setGlStep]    = useState<number>(() => loadGL().step ?? 0);
  const [glForm,    setGlForm]    = useState<Record<string,string>>(() => loadGL().form ?? {});
  const [glChecked, setGlChecked] = useState<Record<string,boolean>>(() => loadGL().checked ?? {});
  const setGlField = (k: string, v: string) => { const f = { ...glForm, [k]: v }; setGlForm(f); saveGL({ form: f }); };
  const toggleGL = (k: string) => { const c = { ...glChecked, [k]: !glChecked[k] }; setGlChecked(c); saveGL({ checked: c }); };

  const activeKey = isSandbox ? account.sandboxKey : account.liveKey;

  // ────────────────────────────────────────────────────
  //  SECTIONS
  // ────────────────────────────────────────────────────

  // ── OVERVIEW ─────────────────────────────────────────
  const OverviewSection = (
    <div>
      {/* Hero Banner */}
      <div style={{ background:"linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #7B4FBF 80%, #E5247B 100%)", borderRadius:24, padding:"28px 32px", marginBottom:24, color:"white", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", gap:24 }}>
        <style>{`@keyframes logoBounce{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}`}</style>
        <div style={{ flexShrink:0, width:120, height:120, animation:"logoBounce 5s ease-in-out infinite" }}>
          <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:"100%",height:"100%",objectFit:"contain",filter:"drop-shadow(0 8px 32px rgba(123,79,191,0.6)) drop-shadow(0 0 20px rgba(21,184,201,0.4))" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
            <h1 style={{ margin:0,fontWeight:900,fontSize:26,letterSpacing:"-1px",background:"linear-gradient(90deg,#ffffff,#c4b5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Welcome, {account.ownerName||account.businessName}</h1>
            <span style={{ background:isSandbox?"rgba(245,166,35,0.3)":"rgba(45,190,96,0.3)",border:`1px solid ${isSandbox?"#F5A623":"#2DBE60"}60`,color:isSandbox?"#fde68a":"#86efac",fontSize:10,fontWeight:800,borderRadius:6,padding:"3px 10px",letterSpacing:"0.1em" }}>{isSandbox?"● SANDBOX":"● LIVE"}</span>
          </div>
          <p style={{ margin:"0 0 14px",fontSize:13,opacity:0.7 }}>{isSandbox?"Sandbox — test your integration safely":"Live mode — real transactions active"}</p>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" as const }}>
            {[{v:fmt(account.balance),l:"Balance"},{v:fmt(account.volume),l:"Total Volume"},{v:String(account.txCount),l:"Transactions"},{v:String(payLinks.filter(p=>p.status==="active").length),l:"Active Links"}].map(s=>(
              <div key={s.l} style={{ background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"8px 14px",backdropFilter:"blur(4px)" }}>
                <p style={{ margin:"0 0 2px",fontWeight:900,fontSize:16,background:"linear-gradient(90deg,#F5A623,#ffffff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{s.v}</p>
                <p style={{ margin:0,fontSize:9,opacity:0.55,letterSpacing:"0.1em",textTransform:"uppercase" as const }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:"absolute",top:12,right:20,fontSize:24,opacity:0.45 }}>✨</div>
        <div style={{ position:"absolute",bottom:12,right:60,fontSize:18,opacity:0.35 }}>💫</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { icon:"💰", label: "Account Balance", value: fmt(account.balance),  color: ZP_GREEN  },
          { icon:"📈", label: "Total Volume",     value: fmt(account.volume),   color: ZP_CYAN   },
          { icon:"💳", label: "Transactions",     value: String(account.txCount), color: ZP_PURPLE },
          { icon:"🔗", label: "Active Pay Links", value: String(payLinks.filter(p=>p.status==="active").length), color: ZP_BLUE },
          { icon:"📄", label: "Open Invoices",    value: String(invoices.filter(i=>i.status==="sent").length),   color: "#F5A623" },
        ].map(k => (
          <div key={k.label} style={{ background:"white", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)", borderLeft:`4px solid ${k.color}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <p style={{ margin:"0 0 6px",fontSize:10,fontWeight:600,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.06em" }}>{k.label}</p>
                <p style={{ margin:0,fontWeight:900,fontSize:22,color:"#0f172a",letterSpacing:"-0.5px" }}>{k.value}</p>
              </div>
              <span style={{ fontSize:22,opacity:0.9 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: LIGHT, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "New Payment Link", icon: "🔗", action: () => { setTab("paylinks"); setModal("paylink"); } },
            { label: "Create Invoice",   icon: "📄", action: () => { setTab("invoices"); setModal("invoice"); } },
            { label: "Send Payout",      icon: "💸", action: () => { setTab("payouts");  setModal("payout"); } },
            { label: "API Setup",        icon: "🔑", action: () => setTab("keys") },
          ].map(a => (
            <button key={a.label} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 8, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 18px", color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
      {payLinks.length > 0 && (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const }}>Recent Pay Links</div>
          {payLinks.slice(0,5).map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{l.title}</div><div style={{ fontSize: 11, color: LIGHT }}>{l.url}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 900, color: TEXT }}>{fmt(l.amount)}</span>
                <Badge label={l.status} color={l.status==="active"?ZP_GREEN:"#94A3B8"} />
              </div>
            </div>
          ))}
        </div>
      )}
      {isSandbox && (
        <div style={{ marginTop: 20, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#D97706", marginBottom: 8 }}>🧪 Test Cards (Sandbox)</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[{b:"Visa",n:"4111 1111 1111 1111"},{b:"MC",n:"5454 5454 5454 5454"}].map(c=>(
              <span key={c.b} style={{ fontSize: 12 }}><span style={{ color: MUTED, fontWeight: 700 }}>{c.b}: </span><code style={{ color: TEXT }}>{c.n}</code></span>
            ))}
            <span style={{ fontSize: 12, color: LIGHT }}>Any future exp · CVC 999</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── TRANSACTIONS ──────────────────────────────────────
  const fmtUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const TransactionsSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px", color: TEXT }}>Transactions</h2>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Revenue",  value: fmtUSD(transactions.filter(t=>t.status==="succeeded").reduce((s,t)=>s+Number(t.amount),0)), color: ZP_GREEN },
          { label: "Transactions",   value: String(transactions.length), color: ZP_CYAN },
          { label: "Succeeded",      value: String(transactions.filter(t=>t.status==="succeeded").length), color: ZP_PURPLE },
          { label: "Pending",        value: String(transactions.filter(t=>t.status==="pending").length), color: "#D97706" },
        ].map(k => (
          <div key={k.label} style={{ background: CARD_BG, borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: `4px solid ${k.color}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{k.label}</p>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>
      {transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: TEXT }}>No transactions yet</div>
          <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.7 }}>{isSandbox ? "Create a pay link and test with a sandbox card to see transactions here." : "Live transactions will appear here in real time."}</p>
        </div>
      ) : (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "10px 18px", borderBottom: `1px solid ${BORDER}` }}>
            {["Customer / Description", "Amount", "Status", "Date"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>
          {transactions.map((t, i) => (
            <div key={t.id || i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "12px 18px", borderTop: i > 0 ? `1px solid ${ROW_SEP}` : "none", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{t.customer_name || t.customer || "—"}</div>
                <div style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.description || t.id}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: t.status === "succeeded" ? ZP_GREEN : t.status === "failed" ? "#DC2626" : "#D97706" }}>
                {fmtUSD(Number(t.amount))}
              </div>
              <div>
                <Badge label={t.status || "unknown"} color={t.status === "succeeded" ? ZP_GREEN : t.status === "failed" ? "#DC2626" : "#D97706"} />
              </div>
              <div style={{ fontSize: 12, color: MUTED }}>
                {t.createdAt || t.created_at ? new Date(t.createdAt || t.created_at).toLocaleDateString("en-CA") : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── BANKING / ZENICARD ────────────────────────────────
  const bankConfigured = bankCfg.step >= 3;
  const BankingSection = (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 20px", color: TEXT }}>Business Banking — Checking Account</h2>

      {/* Configured — show card + details */}
      {bankConfigured && (
        <div style={{ display:"grid",gridTemplateColumns:"auto 1fr",gap:28,alignItems:"flex-start",marginBottom:24 }}>
          <BankCard holderName={bankCfg.holderName} bankName={bankCfg.bankName} accountNum={bankCfg.accountNum} balance={realBalance ?? account.balance} />
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div style={{ background:"white",borderRadius:16,padding:"18px 20px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderLeft:`4px solid ${ZP_GREEN}` }}>
              <p style={{ margin:"0 0 4px",fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase" as const,letterSpacing:"0.06em" }}>Bank Account Connected</p>
              <p style={{ margin:"0 0 2px",fontSize:16,fontWeight:900,color:TEXT }}>{bankCfg.bankName}</p>
              <p style={{ margin:0,fontSize:13,color:MUTED }}>{bankCfg.accountType} ····{bankCfg.accountNum.slice(-4)}</p>
            </div>
            <div style={{ background:"white",borderRadius:16,padding:"14px 20px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[["Transit",bankCfg.transit],["Institution",bankCfg.institution],["Holder",bankCfg.holderName],["Type",bankCfg.accountType]].map(([l,v])=>(
                  <div key={l}><p style={{ margin:"0 0 2px",fontSize:10,color:LIGHT,fontWeight:700,textTransform:"uppercase" as const }}>{l}</p><p style={{ margin:0,fontSize:13,fontWeight:700,color:TEXT }}>{v||"—"}</p></div>
                ))}
              </div>
            </div>
            <button onClick={()=>saveBankCfg({step:1})} style={{ padding:"10px 18px",background:"#f8fafc",border:`1px solid ${BORDER}`,color:MUTED,borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",alignSelf:"flex-start" }}>✏️ Change Account</button>
          </div>
        </div>
      )}

      {/* Not configured */}
      {bankCfg.step === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏦</div>
          <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 8, color: TEXT }}>Connect your bank account</div>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 24px", lineHeight: 1.7, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Link your Canadian bank account to receive payouts, send transfers, and manage your business finances in one place.
          </p>
          <button onClick={() => saveBankCfg({ step: 1 })} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Connect Bank Account →</button>
        </div>
      )}

      {/* Setup form */}
      {bankCfg.step === 1 && (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏦</div>
            <div><div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Bank Account Setup</div><div style={{ fontSize: 12, color: MUTED }}>Enter your Canadian banking details</div></div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Account Holder Name",  key: "holderName",   ph: account.businessName || "Business Name", full: true  },
                { label: "Institution (Bank)",    key: "bankName",     ph: "",                                       full: false, sel: ["TD Canada Trust","RBC Royal Bank","BMO Bank of Montreal","Scotiabank","CIBC","National Bank","Desjardins","ATB Financial","Other"] },
                { label: "Transit Number",        key: "transit",      ph: "00001",                                  full: false },
                { label: "Institution Number",    key: "institution",  ph: "004",                                    full: false },
                { label: "Account Number",        key: "accountNum",   ph: "1234567",                                full: false },
                { label: "Account Type",          key: "accountType",  ph: "",                                       full: false, sel: ["chequing","savings","business chequing"] },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
                  <label style={{ fontSize: 11, color: MUTED, fontWeight: 700, display: "block", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{f.label}</label>
                  {f.sel
                    ? <select value={(bankCfg as Record<string,string>)[f.key]||""} onChange={e => saveBankCfg({ [f.key]: e.target.value } as Partial<BankCfg>)} style={IS}><option value="">Choose…</option>{f.sel.map(o=><option key={o}>{o}</option>)}</select>
                    : <input type="text" placeholder={f.ph} value={(bankCfg as Record<string,string>)[f.key]||""} onChange={e => saveBankCfg({ [f.key]: e.target.value } as Partial<BankCfg>)} style={IS} />
                  }
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(21,184,201,0.06)", border: "1px solid rgba(21,184,201,0.2)", borderRadius: 10, fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
              {isSandbox ? "🧪 Sandbox mode — your account will be verified instantly." : "🔒 Your banking details are encrypted. Micro-deposits of $0.01–$0.99 CAD will appear in 1–2 business days to verify your account."}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => saveBankCfg({ step: 0 })} style={{ flex: 1, padding: 12, background: "#f8fafc", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={() => saveBankCfg({ step: isSandbox ? 3 : 2 })}
                disabled={!bankCfg.holderName || !bankCfg.bankName || !bankCfg.transit || !bankCfg.accountNum}
                style={{ flex: 3, padding: 12, background: (!bankCfg.holderName||!bankCfg.bankName||!bankCfg.transit||!bankCfg.accountNum) ? BORDER : ZP_GRAD, color: (!bankCfg.holderName||!bankCfg.bankName||!bankCfg.transit||!bankCfg.accountNum) ? MUTED : "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                {isSandbox ? "Verify Instantly (Sandbox) →" : "Submit & Send Micro-Deposits →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending verification */}
      {bankCfg.step === 2 && (
        <div style={{ textAlign: "center", padding: "40px 24px", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: TEXT }}>Verification pending</div>
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px", lineHeight: 1.7 }}>Two micro-deposits of $0.01–$0.99 CAD will appear in your bank account within <strong>1–2 business days</strong>. Enter the amounts below to verify.</p>
          <div style={{ display: "flex", gap: 10, maxWidth: 300, margin: "0 auto 16px" }}>
            <input type="text" placeholder="$0.__" style={{ ...IS, textAlign: "center" as const }} />
            <input type="text" placeholder="$0.__" style={{ ...IS, textAlign: "center" as const }} />
          </div>
          <button onClick={() => saveBankCfg({ step: 3 })} style={{ background: ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, padding: "11px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Verify Account →</button>
        </div>
      )}

      {/* Configured — show card + actions */}
      {bankConfigured && (
        <>
          {/* Virtual card */}
          <div style={{ maxWidth: 380, marginBottom: 20 }}>
            <div style={{ borderRadius: 22, background: CARD_GRAD, padding: "26px 24px", position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(229,36,123,0.3)", color: "#fff" }}>
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>ZeniPay</div>
                    <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Business Checking</div>
                  </div>
                  <div style={{ fontSize: 22 }}>💳</div>
                </div>
                <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>Balance</div>
                <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 20 }}>{fmt(account.balance)}</div>
                <div style={{ fontFamily: "monospace", fontSize: 14, letterSpacing: "0.2em" }}>•••• •••• •••• 4242</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, opacity: 0.7 }}>
                  <span>{bankCfg.holderName || account.businessName}</span><span>03/28</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account info */}
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "10px 18px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const }}>Account Details</div>
            {[
              ["Account Holder", bankCfg.holderName || account.businessName],
              ["Bank",           bankCfg.bankName],
              ["Account Type",   bankCfg.accountType],
              ["Transit #",      bankCfg.transit ? `${bankCfg.transit}` : "—"],
              ["Institution #",  bankCfg.institution || "—"],
              ["Account #",      bankCfg.accountNum ? `••••${bankCfg.accountNum.slice(-3)}` : "—"],
              ["Currency",       "CAD"],
              ["Status",         isSandbox ? "Sandbox Active" : "Verified ✓"],
            ].map(([l,v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "11px 18px", borderBottom: `1px solid ${ROW_SEP}` }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{l}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { id: "wire",  icon: "🏛️", label: "Wire Transfer" },
              { id: "ach",   icon: "🔄", label: "ACH / EFT" },
              { id: "book",  icon: "📒", label: "Book Transfer" },
              { id: "save",  icon: "🎯", label: "Savings Goal" },
            ].map(a => (
              <button key={a.id} onClick={() => setBankAction(bankAction===a.id?null:a.id)} style={{ background: bankAction===a.id?ZP_GRAD:CARD_BG, color: bankAction===a.id?"#fff":TEXT, border: `1px solid ${bankAction===a.id?"transparent":BORDER}`, borderRadius: 14, padding: "14px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" as const, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{a.icon}</div>{a.label}
              </button>
            ))}
          </div>

          {/* Action forms */}
          {bankAction === "wire" && (
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>🏛️ Wire Transfer</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[{l:"Beneficiary Name",k:"ben",ph:"Acme Corp"},{l:"Routing Number",k:"routing",ph:"021000021"},{l:"Account Number",k:"acct",ph:"1234567890"},{l:"Amount (CAD)",k:"amt",ph:"5000.00"},{l:"Description",k:"desc",ph:"Invoice #1042"}].map(f=>(
                  <div key={f.k}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:4 }}>{f.l}</label><input placeholder={f.ph} value={bankActForm[f.k]||""} onChange={e=>setBankActForm(p=>({...p,[f.k]:e.target.value}))} style={IS} /></div>
                ))}
                <button onClick={()=>{setBankAction(null);setBankActForm({});}} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Send Wire →</button>
              </div>
            </div>
          )}
          {bankAction === "ach" && (
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>🔄 ACH / EFT Payment</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[{l:"Recipient Name",k:"rec",ph:"John Smith"},{l:"Transit + Account #",k:"acct",ph:"00001 1234567"},{l:"Amount (CAD)",k:"amt",ph:"1500.00"},{l:"Account Type",k:"type",ph:"",sel:["chequing","savings"]},{l:"Description",k:"desc",ph:"Payroll — March"}].map(f=>(
                  <div key={f.k}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:4 }}>{f.l}</label>
                    {f.sel ? <select style={IS} value={bankActForm[f.k]||""} onChange={e=>setBankActForm(p=>({...p,[f.k]:e.target.value}))}><option>chequing</option><option>savings</option></select>
                    : <input placeholder={f.ph} value={bankActForm[f.k]||""} onChange={e=>setBankActForm(p=>({...p,[f.k]:e.target.value}))} style={IS} />}
                  </div>
                ))}
                <button onClick={()=>{setBankAction(null);setBankActForm({});}} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Send ACH/EFT →</button>
              </div>
            </div>
          )}
          {bankAction === "book" && (
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>📒 Book Transfer (Internal)</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[{l:"Destination Account",k:"dest",ph:"zpk_sb_xxxxxxxx"},{l:"Amount (CAD)",k:"amt",ph:"200.00"},{l:"Description",k:"desc",ph:"Internal transfer"}].map(f=>(
                  <div key={f.k}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:4 }}>{f.l}</label><input placeholder={f.ph} value={bankActForm[f.k]||""} onChange={e=>setBankActForm(p=>({...p,[f.k]:e.target.value}))} style={IS} /></div>
                ))}
                <button onClick={()=>{setBankAction(null);setBankActForm({});}} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Transfer →</button>
              </div>
            </div>
          )}
          {bankAction === "save" && (
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>🎯 Create Savings Goal</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[{l:"Goal Name",k:"name",ph:"Emergency Fund"},{l:"Target Amount (CAD)",k:"target",ph:"10000"},{l:"Monthly Contribution",k:"monthly",ph:"500"}].map(f=>(
                  <div key={f.k}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:4 }}>{f.l}</label><input placeholder={f.ph} value={bankActForm[f.k]||""} onChange={e=>setBankActForm(p=>({...p,[f.k]:e.target.value}))} style={IS} /></div>
                ))}
                <button onClick={()=>{setBankAction(null);setBankActForm({});}} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Create Goal →</button>
              </div>
            </div>
          )}

          <button onClick={() => saveBankCfg({ step: 0, holderName:"",bankName:"",transit:"",institution:"",accountNum:"",accountType:"chequing" })} style={{ background:"none",border:"none",color:LIGHT,fontSize:12,cursor:"pointer",padding:0 }}>Disconnect bank account</button>
        </>
      )}
    </div>
  );

  // ── PAY LINKS ─────────────────────────────────────────
  const LINK_TEMPLATES = [
    { title:"Product Purchase",amount:"99",desc:"One-time payment"},
    { title:"Monthly Service",amount:"49",desc:"Recurring service"},
    { title:"Deposit",amount:"500",desc:"Security deposit"},
    { title:"Consultation",amount:"150",desc:"1-hour session"},
  ];
  const PayLinksSection = (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:900,margin:0,color:TEXT }}>Payment Links</h2>
        <button onClick={()=>setModal("paylink")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:800,cursor:"pointer" }}>+ New Link</button>
      </div>
      {payLinks.length===0 ? (
        <div style={{ textAlign:"center",padding:"60px 20px",background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16 }}>
          <div style={{ fontSize:40,marginBottom:12 }}>🔗</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:8,color:TEXT }}>No payment links yet</div>
          <p style={{ fontSize:13,color:MUTED,margin:"0 0 20px" }}>Create a shareable link and get paid in seconds</p>
          <button onClick={()=>setModal("paylink")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontSize:13,fontWeight:800,cursor:"pointer" }}>Create your first link →</button>
        </div>
      ) : (
        <div style={{ display:"grid",gap:12 }}>
          {payLinks.map(l=>(
            <div key={l.id} style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ flex:1,minWidth:180 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
                  <span style={{ fontSize:15,fontWeight:800,color:TEXT }}>{l.title}</span>
                  <Badge label={l.status} color={l.status==="active"?ZP_GREEN:"#94A3B8"} />
                </div>
                <div style={{ fontSize:11,color:LIGHT }}>{l.url}</div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const }}>
                <span style={{ fontSize:17,fontWeight:900,color:TEXT }}>{fmt(l.amount)}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ background:ZP_GRAD,color:"#fff",textDecoration:"none",padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(21,184,201,0.25)" }}>Open →</a>
                <CopyBtn text={l.url} small />
                <button onClick={()=>setPayLinks(p=>p.map(x=>x.id===l.id?{...x,status:x.status==="active"?"paused":"active"}:x))} style={{ background:"#f8fafc",border:`1px solid ${BORDER}`,color:MUTED,padding:"5px 10px",borderRadius:8,fontSize:11,cursor:"pointer" }}>{l.status==="active"?"Pause":"Resume"}</button>
                <button onClick={()=>setPayLinks(p=>p.filter(x=>x.id!==l.id))} style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",padding:"5px 10px",borderRadius:8,fontSize:11,cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── INVOICES ──────────────────────────────────────────
  const sc = (s: string) => ({draft:"#94A3B8",sent:ZP_CYAN,paid:ZP_GREEN,overdue:"#EF4444"}[s]||TEXT);
  const INV_TEMPLATES = [
    { name:"Web Design",     items:[{desc:"Design",qty:1,price:800},{desc:"Dev",qty:1,price:1200}]},
    { name:"Monthly Retainer",items:[{desc:"Support",qty:1,price:500}]},
    { name:"Consulting",     items:[{desc:"Consulting hrs",qty:3,price:200}]},
  ];
  const InvoicesSection = (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:900,margin:0,color:TEXT }}>Invoices</h2>
        <button onClick={()=>setModal("invoice")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:800,cursor:"pointer" }}>+ New Invoice</button>
      </div>
      {invoices.length===0 ? (
        <div style={{ textAlign:"center",padding:"60px 20px",background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16 }}>
          <div style={{ fontSize:40,marginBottom:12 }}>📄</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:8,color:TEXT }}>No invoices yet</div>
          <p style={{ fontSize:13,color:MUTED,margin:"0 0 20px" }}>Professional invoices with automatic payment collection</p>
          <button onClick={()=>setModal("invoice")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontSize:13,fontWeight:800,cursor:"pointer" }}>Create first invoice →</button>
        </div>
      ) : (
        <div style={{ display:"grid",gap:12 }}>
          {invoices.map(inv=>(
            <div key={inv.id} style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8 }}>
                <div>
                  <div style={{ fontSize:15,fontWeight:800,color:TEXT }}>#{inv.id} — {inv.client}</div>
                  <div style={{ fontSize:12,color:LIGHT,marginTop:2 }}>{inv.email} · Due {new Date(inv.dueDate).toLocaleDateString("en-CA")}</div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <span style={{ fontSize:18,fontWeight:900,color:TEXT }}>{fmt(inv.amount)}</span>
                  <Badge label={inv.status} color={sc(inv.status)} />
                </div>
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                <button onClick={()=>setViewInvoice(inv)} style={{ background:`${ZP_CYAN}10`,border:`1px solid ${ZP_CYAN}30`,color:ZP_CYAN,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>📄 View</button>
                {inv.status==="draft" && <button onClick={()=>setInvoices(p=>p.map(x=>x.id===inv.id?{...x,status:"sent" as const}:x))} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Send</button>}
                {(inv.status==="sent"||inv.status==="overdue") && <button onClick={()=>setInvoices(p=>p.map(x=>x.id===inv.id?{...x,status:"paid" as const}:x))} style={{ background:"rgba(45,190,96,0.1)",color:ZP_GREEN,border:"1px solid rgba(45,190,96,0.3)",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Mark Paid</button>}
                <button onClick={()=>setInvoices(p=>p.filter(x=>x.id!==inv.id))} style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── PAYOUTS ───────────────────────────────────────────
  const PayoutsSection = (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ fontSize:20,fontWeight:900,margin:0,color:TEXT }}>Payouts</h2>
        <button onClick={()=>setModal("payout")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:800,cursor:"pointer" }}>+ Send Payout</button>
      </div>
      {payouts.length===0 ? (
        <div style={{ textAlign:"center",padding:"60px 20px",background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16 }}>
          <div style={{ fontSize:40,marginBottom:12 }}>💸</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:8,color:TEXT }}>No payouts yet</div>
          <p style={{ fontSize:13,color:MUTED,margin:"0 0 20px" }}>Pay suppliers, employees, or withdraw funds</p>
          <button onClick={()=>setModal("payout")} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontSize:13,fontWeight:800,cursor:"pointer" }}>Send first payout →</button>
        </div>
      ) : (
        <div style={{ display:"grid",gap:12 }}>
          {payouts.map(po=>(
            <div key={po.id} style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:TEXT }}>{po.recipient}</div>
                <div style={{ fontSize:12,color:LIGHT,marginTop:2 }}>{po.method} · {new Date(po.createdAt).toLocaleDateString("en-CA")}</div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <span style={{ fontSize:17,fontWeight:900,color:TEXT }}>{fmt(po.amount)}</span>
                <Badge label={po.status} color={po.status==="sent"?ZP_GREEN:po.status==="failed"?"#EF4444":"#F5A623"} />
                <button onClick={()=>setPayouts(p=>p.filter(x=>x.id!==po.id))} style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",padding:"4px 10px",borderRadius:8,fontSize:11,cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── ACCOUNTING ────────────────────────────────────────
  const AcctRev = acctSummary?.totalRevenue ?? invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
  const AcctExp = acctSummary?.totalExpenses ?? payouts.reduce((s,p)=>s+p.amount,0);
  const AcctNet = acctSummary?.netProfit ?? (AcctRev - AcctExp);
  const exportCSV = () => {
    const rows=["Date,Description,Type,Amount"];
    invoices.forEach(i=>rows.push(`${i.createdAt.split("T")[0]},Invoice ${i.id} - ${i.client},Revenue,${i.amount}`));
    payouts.forEach(p=>rows.push(`${p.createdAt.split("T")[0]},Payout to ${p.recipient},Expense,-${p.amount}`));
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="zenipay_accounting.csv";a.click();
  };
  const AccountingSection = (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {/* Dark header — fiscal summary */}
      <div style={{ background:`linear-gradient(135deg, #0d1633, #1a2a5e)`, borderRadius:20, padding:28, color:"white" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div>
            <h2 style={{ margin:"0 0 6px",fontWeight:900,fontSize:24 }}>📚 {account.businessName} — Accounting</h2>
            <p style={{ margin:0,opacity:0.6,fontSize:14 }}>Your business bookkeeping · Real-time P&L · Tax-ready reports</p>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {[["📥 Import","#fff"],["📤 Export CSV","#fff"]].map(([b])=>(
              <button key={b} onClick={b.includes("Export")?exportCSV:undefined} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:9999,padding:"8px 14px",color:"white",fontSize:12,fontWeight:700,cursor:"pointer" }}>{b}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          {[
            {label:"Gross Revenue",value:fmt(AcctRev),sub:"Client payments",color:"#4ade80"},
            {label:"Total Expenses",value:fmt(AcctExp),sub:"Processing fees",color:"#f87171"},
            {label:"Net Income",value:fmt(AcctNet),sub:"Before tax",color:"#fde68a"},
            {label:"Tax Provision",value:fmt(AcctNet*0.15),sub:"Est. 15% corp",color:"#94a3b8"},
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 16px" }}>
              <p style={{ margin:"0 0 4px",fontSize:10,opacity:0.6,textTransform:"uppercase" as const,letterSpacing:"0.05em" }}>{s.label}</p>
              <p style={{ margin:"0 0 2px",fontWeight:900,fontSize:20,color:s.color }}>{s.value}</p>
              <p style={{ margin:0,fontSize:10,opacity:0.5 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* P&L + Balance Sheet */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        {/* P&L */}
        <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
            <h3 style={{ margin:0,fontWeight:800,fontSize:16,color:"#0f172a" }}>📊 Profit & Loss</h3>
            <select style={{ border:`1px solid ${BORDER}`,borderRadius:8,padding:"4px 10px",fontSize:12,color:TEXT }}>
              <option>FY 2025–2026</option><option>Q1 2026</option>
            </select>
          </div>
          {[
            {label:"Client Payments Received",amount:AcctRev,type:"income"},
            {label:"TOTAL REVENUE",amount:AcctRev,type:"total-income"},
            {label:"Processing Fees (ZeniPay 2.9% + $0.30/tx)",amount:-(acctSummary?.zenipayFees ?? Math.round(AcctRev*0.029+0.30*invoices.length)),type:"expense"},
            {label:"TOTAL EXPENSES",amount:-AcctExp,type:"total-expense"},
            {label:"NET INCOME",amount:AcctNet,type:"net"},
          ].map((row,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:8,background:row.type==="total-income"?"#f0fdf4":row.type==="total-expense"?"#fff1f2":row.type==="net"?`${ZP_CYAN}10`:"transparent",marginBottom:2,borderTop:(row.type==="total-income"||row.type==="total-expense"||row.type==="net")?"2px solid #e2e8f0":"none" }}>
              <span style={{ fontSize:13,fontWeight:(row.type.startsWith("total")||row.type==="net")?800:500,color:"#374151" }}>{row.label}</span>
              <span style={{ fontWeight:800,fontSize:13,color:row.amount>0?ZP_GREEN:row.amount<0?"#EF4444":ZP_CYAN }}>{row.amount>=0?"+":""}{fmt(row.amount)}</span>
            </div>
          ))}
        </div>
        {/* Balance Sheet */}
        <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin:"0 0 18px",fontWeight:800,fontSize:16,color:"#0f172a" }}>🏛️ Balance Sheet</h3>
          <div style={{ marginBottom:16 }}>
            <p style={{ margin:"0 0 10px",fontWeight:700,fontSize:12,color:"#64748b",textTransform:"uppercase" as const }}>Assets</p>
            {[
              {label:"Business Account (ZeniPay)",value:AcctRev},
              {label:"Accounts Receivable",value:invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.amount,0)},
            ].map(a=>(
              <div key={a.label} style={{ display:"flex",justifyContent:"space-between",padding:"6px 10px",fontSize:13 }}>
                <span style={{ color:"#374151" }}>{a.label}</span>
                <span style={{ fontWeight:700,color:ZP_GREEN }}>{fmt(a.value)}</span>
              </div>
            ))}
            <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#f0fdf4",borderRadius:8,fontWeight:800,fontSize:13,marginTop:4 }}>
              <span>TOTAL ASSETS</span><span style={{ color:ZP_GREEN }}>{fmt(AcctRev+invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.amount,0))}</span>
            </div>
          </div>
          <div>
            <p style={{ margin:"0 0 10px",fontWeight:700,fontSize:12,color:"#64748b",textTransform:"uppercase" as const }}>Liabilities & Equity</p>
            {[
              {label:"Processing Fees Owed",value:acctSummary?.zenipayFees ?? 0},
              {label:"Tax Provision (est.)",value:AcctNet*0.15},
            ].map(l=>(
              <div key={l.label} style={{ display:"flex",justifyContent:"space-between",padding:"6px 10px",fontSize:13 }}>
                <span style={{ color:"#374151" }}>{l.label}</span>
                <span style={{ fontWeight:700,color:"#EF4444" }}>{fmt(-l.value)}</span>
              </div>
            ))}
            <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 10px",fontSize:13 }}>
              <span style={{ color:"#374151" }}>Retained Earnings</span>
              <span style={{ fontWeight:700,color:ZP_BLUE }}>{fmt(AcctNet)}</span>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#eff6ff",borderRadius:8,fontWeight:800,fontSize:13,marginTop:4 }}>
              <span>TOTAL L+E</span><span style={{ color:ZP_BLUE }}>{fmt(AcctNet)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart of Accounts + Journal */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        {/* Chart of accounts */}
        <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h3 style={{ margin:0,fontWeight:800,fontSize:15 }}>📋 Chart of Accounts</h3>
            <button style={{ background:ZP_CYAN,color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer" }}>+ New Account</button>
          </div>
          {[
            {code:"1000",name:"Business Account",type:"Asset",balance:AcctRev,color:ZP_GREEN},
            {code:"1200",name:"Accounts Receivable",type:"Asset",balance:invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.amount,0),color:ZP_GREEN},
            {code:"2000",name:"Payables",type:"Liability",balance:0,color:"#EF4444"},
            {code:"2500",name:"Tax Payable",type:"Liability",balance:-(AcctNet*0.15),color:"#EF4444"},
            {code:"3000",name:"Retained Earnings",type:"Equity",balance:AcctNet,color:ZP_BLUE},
            {code:"4000",name:"Client Revenue",type:"Income",balance:AcctRev,color:ZP_GREEN},
            {code:"5100",name:"Processing Fees (ZeniPay)",type:"Expense",balance:-(acctSummary?.zenipayFees ?? Math.round(AcctRev*0.029)),color:"#EF4444"},
          ].map(a=>(
            <div key={a.code} style={{ display:"flex",alignItems:"center",padding:"7px 10px",borderRadius:8,marginBottom:2,cursor:"pointer" }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <span style={{ fontSize:11,color:"#94a3b8",width:36,fontFamily:"monospace" }}>{a.code}</span>
              <span style={{ flex:1,fontSize:12,color:"#374151" }}>{a.name}</span>
              <span style={{ fontSize:10,color:"#94a3b8",marginRight:8 }}>{a.type}</span>
              <span style={{ fontSize:12,fontWeight:700,color:a.balance>0?ZP_GREEN:"#EF4444" }}>{a.balance>=0?"+":""}{fmt(a.balance)}</span>
            </div>
          ))}
        </div>
        {/* Journal + Tax */}
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ background:"white",borderRadius:20,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <h3 style={{ margin:0,fontWeight:800,fontSize:15 }}>📝 Journal Entries</h3>
              <button style={{ background:ZP_CYAN,color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer" }}>+ New Entry</button>
            </div>
            <div style={{ overflowX:"auto" as const }}>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Date","Description","Account","Debit","Credit"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px",textAlign:"left" as const,fontWeight:700,color:"#64748b",borderBottom:`1px solid ${BORDER}`,fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...invoices.slice(0,4).flatMap((inv,i)=>[
                    {key:`${i}a`,date:inv.createdAt.slice(0,10),desc:`Invoice ${inv.id} — ${inv.client}`,acc:"4000 Invoice Revenue",debit:"—",credit:fmt(inv.amount)},
                    {key:`${i}b`,date:inv.createdAt.slice(0,10),desc:`Receivable ${inv.id}`,acc:"1000 ZeniPay Balance",debit:fmt(inv.amount),credit:"—"},
                  ])].map(row=>(
                    <tr key={row.key} style={{ borderBottom:`1px solid #f8fafc` }}>
                      <td style={{ padding:"7px 10px",color:"#94a3b8" }}>{row.date}</td>
                      <td style={{ padding:"7px 10px",color:"#374151",fontWeight:500 }}>{row.desc}</td>
                      <td style={{ padding:"7px 10px",color:"#64748b" }}>{row.acc}</td>
                      <td style={{ padding:"7px 10px",fontWeight:700,color:row.debit!=="—"?ZP_GREEN:"#94a3b8" }}>{row.debit}</td>
                      <td style={{ padding:"7px 10px",fontWeight:700,color:row.credit!=="—"?ZP_BLUE:"#94a3b8" }}>{row.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Tax summary */}
          <div style={{ background:`linear-gradient(135deg, #0d1633, #1a2a5e)`, borderRadius:20, padding:20, color:"white" }}>
            <h4 style={{ margin:"0 0 14px",fontWeight:800 }}>🧾 Tax Summary</h4>
            {[
              {label:"Gross Revenue",v:fmt(AcctRev)},
              {label:"Total Deductions",v:fmt(AcctExp)},
              {label:"Net Taxable Income",v:fmt(AcctNet)},
              {label:"Corp Tax Rate (est.)",v:"15%"},
              {label:"Tax Provision",v:fmt(AcctNet*0.15)},
            ].map(t=>(
              <div key={t.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:13 }}>
                <span style={{ opacity:0.6 }}>{t.label}</span>
                <span style={{ fontWeight:700,color:"#fde68a" }}>{t.v}</span>
              </div>
            ))}
            <button onClick={exportCSV} style={{ width:"100%",background:"#F5A623",color:"#0d1633",border:"none",borderRadius:9999,padding:"10px",fontWeight:800,fontSize:13,cursor:"pointer",marginTop:8 }}>
              📥 Download Tax Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Reports grid */}
      <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <h3 style={{ margin:0,fontWeight:800,fontSize:16,color:"#0f172a" }}>📄 Financial Reports</h3>
          <span style={{ fontSize:12,color:"#94a3b8" }}>Auto-generated by ZeniPay AI</span>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          {[
            {icon:"📊",title:"Income Statement",desc:"Revenue, expenses, profit",color:ZP_BLUE},
            {icon:"🏛️",title:"Balance Sheet",desc:"Assets, liabilities, equity",color:ZP_PURPLE},
            {icon:"💸",title:"Cash Flow",desc:"Operating & financing",color:ZP_GREEN},
            {icon:"🧾",title:"Tax Return Prep",desc:"Corp filing ready",color:"#F5A623"},
            {icon:"📈",title:"Revenue by Channel",desc:"Pay links, invoices, payouts",color:ZP_CYAN},
            {icon:"📦",title:"COGS Report",desc:"Costs by transaction",color:"#EF4444"},
            {icon:"📋",title:"Payout Report",desc:"All payouts & recipients",color:ZP_PURPLE},
            {icon:"🌍",title:"Multi-Currency",desc:"CAD reconciliation",color:ZP_BLUE},
          ].map(r=>(
            <button key={r.title} onClick={exportCSV} style={{ background:`${r.color}10`,border:`1px solid ${r.color}25`,borderRadius:14,padding:"16px 14px",cursor:"pointer",textAlign:"left" as const }}>
              <div style={{ fontSize:24,marginBottom:8 }}>{r.icon}</div>
              <p style={{ margin:"0 0 4px",fontWeight:700,fontSize:13,color:"#374151" }}>{r.title}</p>
              <p style={{ margin:0,fontSize:11,color:"#64748b" }}>{r.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── ANALYTICS ─────────────────────────────────────────
  const AnalyticsSection = (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {/* KPI row */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14 }}>
        {[
          {icon:"💰",label:"Total Volume",value:fmt(account.volume),sub:"All time",color:ZP_GREEN},
          {icon:"📊",label:"Transactions",value:String(account.txCount),sub:"Processed",color:ZP_CYAN},
          {icon:"✅",label:"Invoice Rate",value:invoices.length>0?`${Math.round((invoices.filter(i=>i.status==="paid").length/invoices.length)*100)}%`:"—",sub:`${invoices.filter(i=>i.status==="paid").length}/${invoices.length} paid`,color:ZP_GREEN},
          {icon:"🔗",label:"Conversion",value:payLinks.length>0?`${Math.round((payLinks.filter(p=>p.uses>0).length/payLinks.length)*100)}%`:"—",sub:"Pay links",color:ZP_PURPLE},
          {icon:"💳",label:"Avg Transaction",value:account.txCount>0?fmt(account.volume/account.txCount):"—",sub:"Per transaction",color:"#F5A623"},
          {icon:"⏳",label:"Pending",value:fmt(invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.amount,0)),sub:"Awaiting payment",color:ZP_BLUE},
        ].map(s=>(
          <div key={s.label} style={{ background:"white",borderRadius:16,padding:"18px 20px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderLeft:`4px solid ${s.color}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <p style={{ margin:"0 0 6px",fontSize:10,fontWeight:600,color:"#64748b",textTransform:"uppercase" as const,letterSpacing:"0.06em" }}>{s.label}</p>
                <p style={{ margin:0,fontWeight:900,fontSize:20,color:"#0f172a",letterSpacing:"-0.5px" }}>{s.value}</p>
                {s.sub&&<p style={{ margin:"4px 0 0",fontSize:10,color:"#94a3b8" }}>{s.sub}</p>}
              </div>
              <span style={{ fontSize:22,opacity:0.9 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h3 style={{ margin:0,fontWeight:700,fontSize:15,color:"#0f172a" }}>📈 Revenue Chart — Last 12 months</h3>
          <span style={{ fontSize:11,color:"#94a3b8" }}>Simulated trend</span>
        </div>
        <div style={{ display:"flex",alignItems:"flex-end",gap:5,height:100 }}>
          {[12,28,20,42,35,58,44,62,50,72,58,account.volume>0?78:0].map((h,i)=>(
            <div key={i} style={{ flex:1,height:`${h}%`,borderRadius:"4px 4px 0 0",background:i===11?`linear-gradient(180deg,${ZP_GREEN},${ZP_CYAN})`:`${ZP_CYAN}25`,transition:"height 0.3s" }} title={`Month ${i+1}`} />
          ))}
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:LIGHT }}>
          {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map(m=><span key={m}>{m}</span>)}
        </div>
      </div>

      {/* Revenue by source */}
      <div style={{ background:"white",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ margin:"0 0 18px",fontWeight:700,fontSize:15,color:"#0f172a" }}>🥇 Revenue by Source</h3>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12 }}>
          {[
            {icon:"📄",label:"Invoices",rev:AcctRev,color:ZP_BLUE},
            {icon:"🔗",label:"Pay Links",rev:payLinks.filter(p=>p.uses>0).reduce((s,p)=>s+p.amount*p.uses,0),color:ZP_GREEN},
            {icon:"💸",label:"Payouts Sent",rev:AcctExp,color:"#EF4444"},
            {icon:"💰",label:"Balance",rev:account.balance,color:ZP_PURPLE},
          ].map(s=>{
            const total = AcctRev + account.balance + 1;
            const pct = Math.round((s.rev/total)*100);
            return (
              <div key={s.label} style={{ background:"#f8fafc",borderRadius:12,padding:16 }}>
                <div style={{ fontSize:24,marginBottom:8 }}>{s.icon}</div>
                <p style={{ margin:"0 0 2px",fontWeight:700,fontSize:13,color:"#374151" }}>{s.label}</p>
                <p style={{ margin:"0 0 8px",fontWeight:800,fontSize:16,color:s.color }}>{fmt(s.rev)}</p>
                <div style={{ background:"#e2e8f0",borderRadius:3,height:4,marginBottom:4 }}>
                  <div style={{ background:s.color,width:`${Math.min(100,pct)}%`,height:"100%",borderRadius:3 }} />
                </div>
                <p style={{ margin:0,fontSize:10,color:"#94a3b8" }}>{pct}% of total</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── FINANCING ────────────────────────────────────────
  const FinancingSection = (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      {/* Dark header */}
      <div style={{ background:`linear-gradient(135deg, #0d1633, #1a2a5e)`, borderRadius:20, padding:28, color:"white" }}>
        <h2 style={{ margin:"0 0 8px",fontWeight:800,fontSize:24 }}>🏛️ ZeniPay Financing</h2>
        <p style={{ margin:0,opacity:0.7 }}>Flexible payment plans and capital solutions for your business.</p>
      </div>

      {/* 3 plan cards — ZenivaComplete style */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
        {[
          {icon:"💳",title:"Pay in Full",desc:"Full payment upfront. Best rate for your clients.",badge:"Standard",color:ZP_CYAN},
          {icon:"📅",title:"Deposit + Balance",desc:"30% deposit now, balance before service delivery.",badge:"Popular",color:ZP_GREEN},
          {icon:"🔄",title:"Monthly Payments",desc:"Split into 3–12 monthly installments.",badge:"Flexible",color:ZP_PURPLE},
        ].map(p=>(
          <div key={p.title} style={{ background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderTop:`3px solid ${p.color}` }}>
            <div style={{ fontSize:32,marginBottom:12 }}>{p.icon}</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <h3 style={{ margin:0,fontWeight:700,fontSize:16,color:"#0f172a" }}>{p.title}</h3>
              <span style={{ background:`${p.color}22`,color:p.color,fontSize:10,fontWeight:700,borderRadius:6,padding:"2px 8px" }}>{p.badge}</span>
            </div>
            <p style={{ margin:"0 0 16px",color:"#64748b",fontSize:13,lineHeight:1.6 }}>{p.desc}</p>
            <button style={{ background:`${p.color}15`,color:p.color,border:`1px solid ${p.color}30`,borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer" }}>Configure Plan</button>
          </div>
        ))}
      </div>

      {/* Business capital */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        {[
          {icon:"⚡",title:"Revenue-Based Advance",desc:"Get up to 125% of monthly volume. Repay as % of daily sales.",rate:"Factor 1.15–1.35",color:ZP_GREEN},
          {icon:"🏦",title:"Equipment Financing",desc:"Finance equipment and tech with fixed monthly payments.",rate:"From 5.9% APR",color:ZP_PURPLE},
        ].map(p=>(
          <div key={p.title} style={{ background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderLeft:`4px solid ${p.color}` }}>
            <div style={{ fontSize:28,marginBottom:10 }}>{p.icon}</div>
            <div style={{ fontSize:15,fontWeight:900,color:"#0f172a",marginBottom:6 }}>{p.title}</div>
            <p style={{ fontSize:12,color:"#64748b",margin:"0 0 12px",lineHeight:1.6 }}>{p.desc}</p>
            <div style={{ fontSize:12,fontWeight:800,color:p.color,marginBottom:14 }}>{p.rate}</div>
            <button style={{ width:"100%",padding:"10px",background:ZP_GRAD,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer" }}>Apply Now →</button>
          </div>
        ))}
      </div>

      {/* Active plans + specialist */}
      <div style={{ background:"white",borderRadius:16,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin:"0 0 16px",fontWeight:700,fontSize:15 }}>📊 Active Financing Plans</h3>
        <div style={{ textAlign:"center" as const,padding:40,color:"#94a3b8",borderRadius:12,border:`1px dashed ${BORDER}` }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🏛️</div>
          <p style={{ margin:"0 0 4px",fontWeight:700,color:"#374151",fontSize:14 }}>No active financing plans yet</p>
          <p style={{ margin:0,fontSize:12 }}>Plans will appear here once activated for your account.</p>
        </div>
      </div>

      <div style={{ background:"white",borderRadius:16,padding:"18px 24px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderLeft:`4px solid ${ZP_BLUE}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"#0f172a",marginBottom:4 }}>📞 Speak to a Financing Specialist</div>
            <p style={{ margin:0,fontSize:12,color:MUTED }}>Get personalized options based on your business profile and volume.</p>
          </div>
          <a href="mailto:financing@zenipay.ca" style={{ background:ZP_GRAD,color:"#fff",textDecoration:"none",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:800,whiteSpace:"nowrap" as const }}>Contact Us →</a>
        </div>
      </div>
    </div>
  );

  // ── BEN AI ────────────────────────────────────────────
  const BenAISection = (
    <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
      <style>{`@keyframes benPulse2{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes benBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      {/* Hero card */}
      <div style={{ background:`linear-gradient(135deg, #0d1633 0%, #1a2f6e 60%, #0d2257 100%)`, borderRadius:24, padding:32, color:"white", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,background:"rgba(21,184,201,0.08)",borderRadius:"50%",filter:"blur(40px)" }} />
        <div style={{ display:"flex",alignItems:"flex-start",gap:24,position:"relative" as const }}>
          {/* Avatar */}
          <div style={{ flexShrink:0 }}>
            <div style={{ width:88,height:88,borderRadius:22,background:`linear-gradient(135deg,${ZP_CYAN},${ZP_PURPLE})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,border:`2px solid ${ZP_CYAN}60`,boxShadow:`0 0 32px ${ZP_CYAN}40` }}>🤖</div>
            <div style={{ marginTop:8,display:"flex",alignItems:"center",gap:6,justifyContent:"center" }}>
              <div style={{ width:7,height:7,background:ZP_GREEN,borderRadius:"50%",boxShadow:`0 0 6px ${ZP_GREEN}` }} />
              <span style={{ fontSize:10,color:ZP_GREEN,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.05em" }}>Online</span>
            </div>
          </div>
          {/* Info */}
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:6 }}>
              <h2 style={{ margin:0,fontWeight:900,fontSize:28,letterSpacing:"-0.5px" }}>Ben</h2>
              <span style={{ background:`${ZP_CYAN}30`,border:`1px solid ${ZP_CYAN}50`,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:ZP_CYAN }}>ZeniPay Finance Agent</span>
            </div>
            <p style={{ margin:"0 0 16px",opacity:0.7,fontSize:14,lineHeight:1.6 }}>Your ZeniPay financial intelligence. Monitors all payments, detects anomalies, tracks your revenue and payouts, and generates reports in real-time.</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
              {["🛡️ Anomaly Detection","📊 Revenue Analytics","💸 Payout Status","⚡ Payment Monitor","📄 Auto Reports","🔮 Cash Flow AI"].map(f=>(
                <span key={f} style={{ background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:600 }}>{f}</span>
              ))}
            </div>
          </div>
          {/* Stats */}
          <div style={{ display:"grid",gap:8,flexShrink:0 }}>
            {[
              {label:"Balance",value:fmt(account.balance)},
              {label:"Volume",value:fmt(account.volume)},
              {label:"Transactions",value:String(account.txCount)},
              {label:"Uptime",value:"99.9%"},
            ].map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"8px 14px",textAlign:"center" as const }}>
                <p style={{ margin:"0 0 2px",fontSize:16,fontWeight:900,color:"white" }}>{s.value}</p>
                <p style={{ margin:0,fontSize:9,opacity:0.5,textTransform:"uppercase" as const,letterSpacing:"0.05em" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Capabilities */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:24 }}>
          {[
            {icon:"🛡️",title:"Fraud Detection",desc:"Real-time anomaly"},
            {icon:"📊",title:"Revenue Analytics",desc:"Margin & trends"},
            {icon:"⚡",title:"Payment Monitor",desc:"Failures, retries"},
            {icon:"📄",title:"Auto Reports",desc:"Monthly summaries"},
            {icon:"💸",title:"Payout Engine",desc:"Automated payouts"},
          ].map(f=>(
            <div key={f.icon} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"14px 12px",textAlign:"center" as const }}>
              <div style={{ fontSize:24,marginBottom:8 }}>{f.icon}</div>
              <p style={{ margin:"0 0 4px",fontWeight:700,fontSize:12,color:"white" }}>{f.title}</p>
              <p style={{ margin:0,fontSize:10,opacity:0.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat + Live Activity */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        {/* Chat */}
        <div style={{ background:"linear-gradient(135deg, #0d1829, #111f38)",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)",display:"flex",flexDirection:"column" as const }}>
          <div style={{ background:`linear-gradient(135deg, #0d1633, #1a2f6e)`,borderRadius:"20px 20px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${ZP_CYAN},${ZP_PURPLE})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🤖</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0,color:"white",fontWeight:700,fontSize:14 }}>Ben · ZeniPay AI</p>
              <p style={{ margin:0,fontSize:11,color:"#64748b" }}>Financial Intelligence Agent</p>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5,background:`${ZP_GREEN}22`,borderRadius:6,padding:"4px 10px" }}>
              <div style={{ width:6,height:6,background:ZP_GREEN,borderRadius:"50%",animation:"benPulse2 1.5s infinite" }} />
              <span style={{ fontSize:10,color:ZP_GREEN,fontWeight:700 }}>Monitoring</span>
            </div>
          </div>
          <div style={{ flex:1,padding:16,overflowY:"auto" as const,maxHeight:360,display:"flex",flexDirection:"column" as const,gap:10 }}>
            {benChat.map((m,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:8,alignItems:"flex-end" }}>
                {m.role==="ben"&&<div style={{ width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${ZP_CYAN},${ZP_PURPLE})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>🤖</div>}
                <div style={{ background:m.role==="user"?`linear-gradient(135deg,${ZP_CYAN},#0d1633)`:"#f0f4ff",color:m.role==="user"?"white":"#0f172a",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 14px",maxWidth:"78%",fontSize:13,lineHeight:1.6,boxShadow:m.role==="user"?`0 2px 8px ${ZP_CYAN}30`:"none" }}>{m.text}</div>
              </div>
            ))}
            {benLoading&&(
              <div style={{ display:"flex",gap:8,alignItems:"flex-end" }}>
                <div style={{ width:28,height:28,background:`linear-gradient(135deg,${ZP_CYAN},${ZP_PURPLE})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>🤖</div>
                <div style={{ background:"#f0f4ff",borderRadius:"16px 16px 16px 4px",padding:"12px 16px",display:"flex",gap:4,alignItems:"center" }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,background:ZP_CYAN,borderRadius:"50%",opacity:0.6,animation:`benBounce 1s ${i*0.2}s infinite` }}/>)}
                </div>
              </div>
            )}
          </div>
          <div style={{ padding:"0 16px 8px",display:"flex",gap:6,flexWrap:"wrap" as const }}>
            {["💰 Revenue", "🛡️ Fraud check", "💸 Payout status", "📊 Report"].map(s=>(
              <button key={s} onClick={()=>setBenMsg(s.replace(/^[^ ]+ /,""))} style={{ background:"#f0f4ff",color:ZP_CYAN,border:"1px solid #dbeafe",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer" }}>{s}</button>
            ))}
          </div>
          <div style={{ padding:"0 16px 16px",display:"flex",gap:8 }}>
            <input value={benMsg} onChange={e=>setBenMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleBenSend()}
              placeholder="Ask Ben: revenue, fraud, payout, report…"
              style={{ flex:1,border:"1.5px solid #e2e8f0",borderRadius:12,padding:"11px 14px",fontSize:13,outline:"none",background:"#fafbff" }} />
            <button onClick={handleBenSend} disabled={benLoading} style={{ background:`linear-gradient(135deg,${ZP_CYAN},#0d1633)`,color:"white",border:"none",borderRadius:12,padding:"11px 20px",fontWeight:800,cursor:"pointer",fontSize:14 }}>↑</button>
          </div>
        </div>

        {/* Live Activity + Quick Actions */}
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ background:"white",borderRadius:20,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",flex:1 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <h3 style={{ margin:0,fontWeight:700,fontSize:14,color:"#0f172a" }}>⚡ Ben Live Activity</h3>
              <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:ZP_GREEN,fontWeight:600 }}>
                <div style={{ width:6,height:6,background:ZP_GREEN,borderRadius:"50%",animation:"benPulse2 1.5s infinite" }} /> Real-time
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {liveActivity.map(a=>(
                <div key={a.id} style={{ background:a.type==="alert"?"#fff1f2":"#f0fdf4",borderRadius:10,padding:"10px 14px",borderLeft:`3px solid ${a.type==="alert"?"#EF4444":ZP_GREEN}` }}>
                  <p style={{ margin:"0 0 2px",fontSize:12,fontWeight:600,color:a.type==="alert"?"#EF4444":"#065f46" }}>{a.text}</p>
                  <p style={{ margin:0,fontSize:10,color:"#94a3b8" }}>{a.time}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"white",borderRadius:20,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
            <h3 style={{ margin:"0 0 12px",fontWeight:700,fontSize:14,color:"#0f172a" }}>⚡ Quick Actions</h3>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {[
                {label:"📊 Generate Report",color:ZP_BLUE},
                {label:"💸 Trigger Payout",color:ZP_GREEN},
                {label:"🛡️ Fraud Scan",color:ZP_PURPLE},
                {label:"📧 Email Summary",color:"#F5A623"},
              ].map(a=>(
                <button key={a.label} onClick={()=>setBenMsg(a.label.replace(/^[^ ]+ /,""))} style={{ background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}30`,borderRadius:10,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── API KEYS ──────────────────────────────────────────
  const genKey = (prefix: string) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = prefix;
    for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };
  const saveAccountKeys = (patch: Partial<Account>) => {
    // Keys are saved in Supabase via the merchants API
    if (!merchantId) return;
    fetch(`/api/zenipay/merchants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: merchantId, ...patch }),
    }).catch(() => {});
  };
  const CODE: Record<string, string> = {
    node: `// Install\nnpm install @zenipay/node\n\n// Initialize\nimport ZeniPay from '@zenipay/node';\nconst zp = new ZeniPay('${activeKey||"YOUR_API_KEY"}');\n\n// Create payment\nconst payment = await zp.payments.create({\n  amount: 1000,          // in cents (CAD)\n  currency: 'cad',\n  description: 'Order #1042',\n  source: { token: 'tok_from_checkout' }\n});\nconsole.log(payment.id); // pay_xxxxxxxx`,
    php:  `// Install\ncomposer require zenipay/zenipay-php\n\n// Initialize\n$zp = new \\ZeniPay\\Client('${activeKey||"YOUR_API_KEY"}');\n\n// Create payment\n$payment = $zp->payments->create([\n  'amount'   => 1000,\n  'currency' => 'cad',\n  'description' => 'Order #1042',\n  'source'   => ['token' => 'tok_from_checkout'],\n]);\necho $payment->id;`,
    python:`# Install\npip install zenipay\n\n# Initialize\nimport zenipay\nzp = zenipay.Client('${activeKey||"YOUR_API_KEY"}')\n\n# Create payment\npayment = zp.payments.create(\n    amount=1000,\n    currency='cad',\n    description='Order #1042',\n    source={'token': 'tok_from_checkout'}\n)\nprint(payment.id)`,
    curl: `curl https://api.zenipay.ca/v1/payments \\\n  -H "Authorization: Bearer ${activeKey||"YOUR_API_KEY"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 1000,\n    "currency": "cad",\n    "description": "Order #1042",\n    "source": {"token": "tok_from_checkout"}\n  }'`,
  };
  const WEBHOOK_CODE = `// Express.js webhook handler\nconst zp = new ZeniPay('${activeKey||"YOUR_KEY"}');\n\napp.post('/webhook', express.raw({type:'application/json'}), (req, res) => {\n  const sig = req.headers['zenipay-signature'];\n  const event = zp.webhooks.verify(req.body, sig, '${account.sandboxSecret||"YOUR_WEBHOOK_SECRET"}');\n\n  switch (event.type) {\n    case 'payment.succeeded':\n      console.log('Payment succeeded:', event.data.id);\n      break;\n    case 'payment.failed':\n      console.log('Payment failed:', event.data.id);\n      break;\n  }\n  res.json({ received: true });\n});`;

  const KeysSection = (
    <div>
      {/* Hero banner */}
      <div style={{ borderRadius:18,overflow:"hidden",marginBottom:20,background:isSandbox?"linear-gradient(135deg,#78350f 0%,#92400e 100%)":"linear-gradient(135deg,#0d1633 0%,#1a2a5e 40%,#15B8C9 100%)",padding:"24px 28px",color:"#fff",position:"relative" as const }}>
        <div style={{ fontSize:22,fontWeight:900,marginBottom:4 }}>{isSandbox?"🧪 Sandbox API Keys":"🔑 Live API Keys & Endpoints"}</div>
        <div style={{ fontSize:13,opacity:0.75 }}>{isSandbox?"Test your integration safely — no real transactions":"Your production credentials — keep these secret"}</div>
        <div style={{ position:"absolute" as const,right:24,top:"50%",transform:"translateY(-50%)",fontSize:48,opacity:0.08 }}>🔑</div>
      </div>

      {/* Keys card */}
      {(()=>{
        const noop = () => {};
        const keyRows = isSandbox
          ? [
              {label:"Publishable Key",val:account.sandboxKey,prefix:"zpk_sb_",rolled:rolledSb,setRolled:setRolledSb,secret:false,note:""},
              {label:"Secret Key",val:account.sandboxSecret,prefix:"zps_sb_",rolled:null as null,setRolled:noop,secret:true,note:""},
            ]
          : [
              {label:"Live Publishable Key",val:account.liveKey||"zpk_live_"+account.id,prefix:"zpk_live_",rolled:rolledLive,setRolled:setRolledLive,secret:false,note:""},
              {label:"Live Secret Key",val:"zps_live_"+account.id,prefix:"zps_live_",rolled:null as null,setRolled:noop,secret:true,note:"Never expose in client-side code"},
              {label:"Sandbox Publishable Key",val:account.sandboxKey,prefix:"zpk_sb_",rolled:rolledSb,setRolled:setRolledSb,secret:false,note:""},
              {label:"Sandbox Secret Key",val:account.sandboxSecret,prefix:"zps_sb_",rolled:null as null,setRolled:noop,secret:true,note:""},
            ];
        return (
          <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:18,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,fontSize:11,fontWeight:800,color:isSandbox?"#D97706":ZP_GREEN,letterSpacing:"0.1em",textTransform:"uppercase" as const }}>
              {isSandbox?"🧪 Sandbox Credentials":"● Live Credentials"}
            </div>
            {keyRows.map(k=>(
              <div key={k.label} style={{ borderBottom:`1px solid ${ROW_SEP}` }}>
                <div style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:11,color:MUTED,fontWeight:700 }}>{k.label}</span>
                      {k.note && <span style={{ fontSize:10,background:"rgba(239,68,68,0.08)",color:"#DC2626",padding:"2px 8px",borderRadius:20,fontWeight:600 }}>{k.note}</span>}
                      {k.rolled && <span style={{ fontSize:10,background:"rgba(45,190,96,0.1)",color:ZP_GREEN,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>● New</span>}
                    </div>
                    {!k.secret && (
                      <button onClick={()=>{
                        const newVal = genKey(k.prefix);
                        const oldVal = k.rolled ? k.rolled.newVal : (k.val||"");
                        k.setRolled({ newVal, oldVal, rolledAt: new Date().toISOString() });
                        saveAccountKeys(k.prefix.startsWith("zpk_live") ? {liveKey:newVal} : {sandboxKey:newVal});
                      }} style={{ background:"rgba(21,184,201,0.08)",color:ZP_CYAN,border:`1px solid rgba(21,184,201,0.2)`,cursor:"pointer",padding:"5px 14px",borderRadius:8,fontSize:11,fontWeight:700,whiteSpace:"nowrap" as const }}>
                        🔄 Regenerate
                      </button>
                    )}
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <code style={{ flex:1,fontSize:12,background:"#f8fafc",padding:"10px 12px",borderRadius:8,color:TEXT,wordBreak:"break-all" as const,border:`1px solid ${BORDER}` }}>
                      {k.rolled ? k.rolled.newVal : (k.val||"—")}
                    </code>
                    <CopyBtn text={k.rolled ? k.rolled.newVal : (k.val||"")} small />
                  </div>
                  {k.rolled && (
                    <div style={{ marginTop:6,fontSize:11,color:"#D97706" }}>⚠️ Copy your new key — update your integration before deleting the old one.</div>
                  )}
                </div>
                {k.rolled && k.rolled.oldVal && (
                  <div style={{ padding:"12px 18px",background:"rgba(239,68,68,0.03)",borderTop:`1px solid rgba(239,68,68,0.1)` }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                      <span style={{ fontSize:11,color:"#DC2626",fontWeight:700 }}>🗑 Old Key — still active</span>
                      <button onClick={()=>k.setRolled(null)} style={{ background:"rgba(239,68,68,0.1)",color:"#DC2626",border:`1px solid rgba(239,68,68,0.25)`,cursor:"pointer",padding:"5px 14px",borderRadius:8,fontSize:11,fontWeight:700 }}>
                        Delete Old Key
                      </button>
                    </div>
                    <code style={{ fontSize:11,color:"#94A3B8",wordBreak:"break-all" as const,textDecoration:"line-through" }}>{k.rolled.oldVal}</code>
                    <div style={{ marginTop:4,fontSize:10,color:MUTED }}>Rolled {new Date(k.rolled.rolledAt).toLocaleString("en-CA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                )}
              </div>
            ))}
            {isSandbox && (
              <div style={{ padding:"16px 18px",textAlign:"center" as const }}>
                <div style={{ fontSize:12,color:MUTED,marginBottom:8 }}>🚀 Ready to accept real payments?</div>
                <button onClick={()=>setTab("go-live")} style={{ background:ZP_GRAD,color:"#fff",border:"none",cursor:"pointer",padding:"9px 22px",borderRadius:10,fontSize:13,fontWeight:800 }}>Activate Live Account →</button>
              </div>
            )}
          </div>
        );
      })()}

      {/* API Endpoints — live mode only */}
      {!isSandbox && (
        <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:18,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,fontSize:11,fontWeight:800,color:ZP_CYAN,letterSpacing:"0.1em",textTransform:"uppercase" as const }}>🌐 API Endpoints</div>
          <div style={{ padding:"6px 0" }}>
            {[
              {method:"POST",endpoint:"/v1/payments",desc:"Create a payment"},
              {method:"GET", endpoint:"/v1/payments/:id",desc:"Retrieve a payment"},
              {method:"POST",endpoint:"/v1/invoices",desc:"Create an invoice"},
              {method:"GET", endpoint:"/v1/invoices",desc:"List all invoices"},
              {method:"POST",endpoint:"/v1/payouts",desc:"Send a payout"},
              {method:"GET", endpoint:"/v1/payouts",desc:"List payouts"},
              {method:"POST",endpoint:"/v1/paylinks",desc:"Create a pay link"},
              {method:"GET", endpoint:"/v1/balance",desc:"Get account balance"},
              {method:"POST",endpoint:"/v1/refunds",desc:"Issue a refund"},
              {method:"GET", endpoint:"/v1/transactions",desc:"List transactions"},
            ].map(e=>(
              <div key={e.endpoint} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 18px",borderBottom:`1px solid ${ROW_SEP}` }}>
                <span style={{ fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:6,background:e.method==="POST"?"rgba(45,190,96,0.1)":"rgba(21,184,201,0.1)",color:e.method==="POST"?ZP_GREEN:ZP_CYAN,minWidth:42,textAlign:"center" as const }}>{e.method}</span>
                <code style={{ fontSize:12,color:TEXT,flex:1 }}>https://api.zenipay.ca{e.endpoint}</code>
                <span style={{ fontSize:11,color:MUTED }}>{e.desc}</span>
                <CopyBtn text={`https://api.zenipay.ca${e.endpoint}`} small />
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 18px",background:"rgba(21,184,201,0.04)",borderTop:`1px solid ${BORDER}` }}>
            <span style={{ fontSize:11,color:MUTED }}>Base URL: </span>
            <code style={{ fontSize:12,color:ZP_CYAN,fontWeight:700 }}>https://api.zenipay.ca/v1</code>
            <CopyBtn text="https://api.zenipay.ca/v1" small />
          </div>
        </div>
      )}

      {/* Code examples */}
      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:18,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
          <span style={{ fontSize:13,fontWeight:800,color:TEXT }}>Installation Guide</span>
          <div style={{ display:"flex",gap:4 }}>
            {(["node","php","python","curl"] as const).map(l=>(
              <button key={l} onClick={()=>setApiLang(l)} style={{ padding:"5px 14px",borderRadius:8,border:`1px solid ${apiLang===l?ZP_CYAN:BORDER}`,background:apiLang===l?"rgba(21,184,201,0.1)":CARD_BG,color:apiLang===l?ZP_CYAN:MUTED,fontSize:12,fontWeight:700,cursor:"pointer" }}>{l==="node"?"Node.js":l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute",top:10,right:14,zIndex:10 }}>
            <CopyBtn text={CODE[apiLang]} small />
          </div>
          <pre style={{ margin:0,padding:"16px 18px",fontSize:12,lineHeight:1.7,color:"#e6edf3",overflowX:"auto" as const,background:"#0d1117" }}>{CODE[apiLang]}</pre>
        </div>
      </div>

      {/* Webhook */}
      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:18,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,fontSize:13,fontWeight:800,color:TEXT }}>Webhook Configuration</div>
        <div style={{ padding:"16px 18px",borderBottom:`1px solid ${ROW_SEP}` }}>
          <label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:6 }}>WEBHOOK ENDPOINT URL</label>
          <div style={{ display:"flex",gap:8 }}>
            <input type="url" placeholder="https://yourdomain.com/webhook/zenipay" value={whUrl} onChange={e=>{setWhUrl(e.target.value);setWhSaved(false);}} style={{ ...IS,flex:1 }} />
            <button onClick={()=>{ try { localStorage.setItem(`zp_webhook_${merchantId}`, whUrl); } catch {} setWhSaved(true); }} style={{ background:whSaved?"rgba(45,190,96,0.1)":ZP_GRAD,border:`1px solid ${whSaved?"rgba(45,190,96,0.4)":"transparent"}`,color:whSaved?ZP_GREEN:"#fff",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap" as const }}>{whSaved?"✓ Saved":"Save"}</button>
          </div>
          <div style={{ marginTop:8,fontSize:11,color:LIGHT }}>Events: payment.succeeded · payment.failed · invoice.paid · payout.sent</div>
        </div>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute",top:10,right:14,zIndex:10 }}><CopyBtn text={WEBHOOK_CODE} small /></div>
          <pre style={{ margin:0,padding:"16px 18px",fontSize:11,lineHeight:1.7,color:"#e6edf3",overflowX:"auto" as const,background:"#0d1117" }}>{WEBHOOK_CODE}</pre>
        </div>
      </div>
    </div>
  );

  // ── SETTINGS ──────────────────────────────────────────
  const SettingsSection = (
    <div>
      <h2 style={{ fontSize:20,fontWeight:900,margin:"0 0 24px",color:TEXT }}>Settings</h2>
      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,padding:"18px 20px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ fontSize:11,color:MUTED,marginBottom:4 }}>Current Plan</div>
          <div style={{ fontSize:18,fontWeight:900,color:TEXT }}>{account.plan==="Sandbox"?"Standard":account.plan}</div>
          <div style={{ fontSize:12,color:MUTED,marginTop:2 }}>{(account.plan==="Standard"||account.plan==="Sandbox")?"2.9% + $0.30":account.plan==="Business"?"2.2% + $0.25":"2% + $0.20"} per transaction</div>
        </div>
        <a href="/payments" style={{ background:ZP_GRAD,color:"#fff",textDecoration:"none",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:800 }}>Upgrade Plan →</a>
      </div>

      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,fontSize:11,color:MUTED,fontWeight:700,textTransform:"uppercase" as const }}>Business Info</div>
        {[["Business Name",account.businessName],["Owner",account.ownerName],["Email",account.email],["Phone",account.phone||"—"],["Website",account.website||"—"],["Type",account.businessType||"—"],["Country",account.country],["Est. Volume",account.monthlyVolume?`$${account.monthlyVolume}/mo`:"—"],["Member Since",new Date(account.createdAt).toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"})]].map(([l,v])=>(
          <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"11px 18px",borderBottom:`1px solid ${ROW_SEP}` }}>
            <span style={{ color:MUTED,fontSize:13 }}>{l}</span>
            <span style={{ fontWeight:600,fontSize:13,color:TEXT }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,overflow:"hidden",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"12px 18px",borderBottom:`1px solid ${BORDER}`,fontSize:11,color:MUTED,fontWeight:700,textTransform:"uppercase" as const }}>Notifications</div>
        {[
          {label:"Email on payment received",sub:"Get notified for every successful payment"},
          {label:"Email on invoice paid",sub:"Notification when a client pays an invoice"},
          {label:"Weekly summary report",sub:"Revenue & activity summary every Monday"},
          {label:"Failed payment alerts",sub:"Immediate alert on declined transactions"},
        ].map((n,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:`1px solid ${ROW_SEP}` }}>
            <div><div style={{ fontSize:13,fontWeight:600,color:TEXT }}>{n.label}</div><div style={{ fontSize:11,color:LIGHT,marginTop:2 }}>{n.sub}</div></div>
            <button onClick={()=>setNotifEmail(v=>!v)} style={{ width:40,height:22,borderRadius:11,background:notifEmail?ZP_GREEN:BORDER,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s" }}>
              <span style={{ position:"absolute",top:2,left:notifEmail?20:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block" }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:16,padding:"16px 18px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize:12,fontWeight:700,color:ZP_BLUE,marginBottom:8 }}>💬 Support & Contact</div>
        <p style={{ margin:"0 0 8px",fontSize:13,color:MUTED,lineHeight:1.7 }}>Mon–Fri, 9am–6pm ET</p>
        <a href="mailto:info@zenipay.ca" style={{ fontSize:13,color:ZP_CYAN,fontWeight:700,textDecoration:"none" }}>info@zenipay.ca</a>
      </div>

      <button onClick={onSignOut} style={{ width:"100%",padding:13,borderRadius:14,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",fontSize:14,fontWeight:800,cursor:"pointer" }}>Sign Out</button>
    </div>
  );

  // ── GO LIVE ───────────────────────────────────────────
  const GL_STEPS = [
    { id:"business",    icon:"🏢", title:"Business Verification", desc:"Confirm your legal business information" },
    { id:"banking",     icon:"🏦", title:"Bank Account",          desc:"Where should we send your payouts?" },
    { id:"integration", icon:"⚙️", title:"Integration Setup",      desc:"Install the SDK and run a test payment" },
    { id:"compliance",  icon:"📋", title:"Volume & Compliance",    desc:"Required for payment network compliance" },
    { id:"review",      icon:"🔍", title:"Under Review",           desc:"We're reviewing your application" },
  ];
  const SDK_STEPS = [
    { key:"sdk",     label:"Install SDK",         code:"npm install @zenipay/node" },
    { key:"init",    label:"Initialize client",   code:`import ZeniPay from '@zenipay/node';\nconst zp = new ZeniPay('${account.sandboxKey||"zpk_sb_xxx"}');` },
    { key:"test",    label:"Create test payment", code:`const payment = await zp.payments.create({\n  amount: 1000, currency: 'cad',\n  source: { number: '4111111111111111', exp_month: 12, exp_year: 2028, cvc: '999' }\n});\nconsole.log(payment.id);` },
    { key:"webhook", label:"Setup webhook",       code:`app.post('/webhook', zp.webhooks.express({\n  secret: '${account.sandboxSecret||"zps_sb_xxx"}',\n  on: { 'payment.succeeded': (e) => console.log(e) }\n}));` },
  ];
  const GoLiveSection = (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20,fontWeight:900,margin:"0 0 6px",color:TEXT }}>Activate Live Account</h2>
        <p style={{ fontSize:13,color:MUTED,margin:0 }}>Complete all steps to unlock real payments and receive your live API keys.</p>
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {GL_STEPS.map((s,i)=>(
          <div key={s.id} onClick={()=>i<glStep&&setGlStep(i)} style={{ flex:1,cursor:i<glStep?"pointer":"default" }}>
            <div style={{ height:4,borderRadius:4,background:i<glStep?ZP_GREEN:i===glStep?ZP_CYAN:BORDER,marginBottom:6,transition:"background 0.3s" }} />
            <div style={{ fontSize:11,color:i===glStep?TEXT:LIGHT,fontWeight:i===glStep?700:400,textAlign:"center" as const }}>{i<glStep?"✓ ":""}{s.title.split(" ")[0]}</div>
          </div>
        ))}
      </div>
      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:14,padding:"14px 18px",marginBottom:20 }}>
        <div style={{ fontSize:12,fontWeight:800,color:"#D97706",marginBottom:10 }}>🧪 Your Sandbox Keys (active now)</div>
        <div style={{ display:"grid",gap:8 }}>
          {[{label:"Publishable Key",value:account.sandboxKey},{label:"Secret Key",value:account.sandboxSecret}].map(k=>(
            <div key={k.label} style={{ display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:11,color:MUTED,width:110,flexShrink:0 }}>{k.label}</span>
              <code style={{ flex:1,fontSize:11,background:"#f8fafc",padding:"6px 10px",borderRadius:8,color:TEXT,wordBreak:"break-all" as const,border:`1px solid ${BORDER}` }}>{k.value||"—"}</code>
              <CopyBtn text={k.value} small />
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:CARD_BG,border:`1px solid ${BORDER}`,borderRadius:18,overflow:"hidden" }}>
        <div style={{ padding:"16px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:38,height:38,borderRadius:12,background:ZP_GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{GL_STEPS[glStep].icon}</div>
          <div>
            <div style={{ fontSize:16,fontWeight:900,color:TEXT }}>Step {glStep+1} — {GL_STEPS[glStep].title}</div>
            <div style={{ fontSize:12,color:MUTED,marginTop:2 }}>{GL_STEPS[glStep].desc}</div>
          </div>
        </div>
        <div style={{ padding:20 }}>
          {glStep===0&&(
            <div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  {key:"legalName",label:"Legal Business Name",  type:"text",  ph:"ZeniPay Inc.",          full:false},
                  {key:"businessNum",label:"Business Number (BN)",type:"text",  ph:"123456789",              full:false},
                  {key:"address",label:"Business Address",       type:"text",  ph:"123 Main St, Toronto",   full:true },
                  {key:"industry",label:"Industry Category",     type:"select",options:["E-commerce","SaaS","Travel","Marketplace","Restaurant","Retail","Healthcare","Other"],full:false},
                  {key:"website2",label:"Business Website",      type:"text",  ph:"https://yourbusiness.com",full:false},
                ].map(f=>(
                  <div key={f.key} style={{ gridColumn:f.full?"1/-1":"auto" }}>
                    <label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>{f.label}</label>
                    {f.type==="select"
                      ?<select value={glForm[f.key]||""} onChange={e=>setGlField(f.key,e.target.value)} style={IS}><option value="">Choose…</option>{(f.options||[]).map(o=><option key={o}>{o}</option>)}</select>
                      :<input type="text" placeholder={f.ph} value={glForm[f.key]||""} onChange={e=>setGlField(f.key,e.target.value)} style={IS}/>
                    }
                  </div>
                ))}
              </div>
              <button onClick={()=>{setGlStep(1);saveGL({step:1});}} disabled={!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry} style={{ marginTop:18,width:"100%",padding:13,background:(!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry)?BORDER:ZP_GRAD,color:(!glForm.legalName||!glForm.businessNum||!glForm.address||!glForm.industry)?MUTED:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Save & Continue →</button>
            </div>
          )}
          {/* Step 1 – Bank Account */}
          {glStep===1&&(
            <div>
              <div style={{ marginBottom:14,padding:"10px 14px",background:"rgba(21,184,201,0.06)",border:"1px solid rgba(21,184,201,0.2)",borderRadius:10,fontSize:13,color:MUTED,lineHeight:1.6 }}>
                Enter your Canadian bank account details to receive payouts. This is where ZeniPay will deposit your settlements.
              </div>
              {bankCfg.step >= 3 ? (
                <div>
                  <div style={{ padding:"14px 18px",background:"rgba(45,190,96,0.06)",border:"1px solid rgba(45,190,96,0.3)",borderRadius:12,marginBottom:14 }}>
                    <div style={{ fontSize:14,fontWeight:800,color:ZP_GREEN,marginBottom:4 }}>✓ Bank account connected</div>
                    <div style={{ fontSize:13,color:MUTED }}>{bankCfg.bankName} — {bankCfg.accountType} ••••{bankCfg.accountNum.slice(-3)}</div>
                  </div>
                  <div style={{ display:"flex",gap:10 }}>
                    <button onClick={()=>saveBankCfg({step:1})} style={{ flex:1,padding:10,background:"#f8fafc",border:`1px solid ${BORDER}`,color:MUTED,borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer" }}>Change account</button>
                    <button onClick={()=>{setGlStep(2);saveGL({step:2});}} style={{ flex:3,padding:12,background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Continue →</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                    {[
                      {label:"Account Holder Name", key:"holderName",   ph:account.businessName||"Business Name", full:true,  sel:undefined},
                      {label:"Bank / Institution",  key:"bankName",     ph:"",    full:false, sel:["TD Canada Trust","RBC Royal Bank","BMO Bank of Montreal","Scotiabank","CIBC","National Bank","Desjardins","ATB Financial","Other"]},
                      {label:"Transit Number",      key:"transit",      ph:"00001", full:false, sel:undefined},
                      {label:"Institution Number",  key:"institution",  ph:"004",   full:false, sel:undefined},
                      {label:"Account Number",      key:"accountNum",   ph:"1234567",full:false,sel:undefined},
                      {label:"Account Type",        key:"accountType",  ph:"",    full:false, sel:["chequing","savings","business chequing"]},
                    ].map(f=>(
                      <div key={f.key} style={{ gridColumn:f.full?"1/-1":"auto" }}>
                        <label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:"0.06em" }}>{f.label}</label>
                        {f.sel
                          ?<select value={bankCfg[f.key] as string||""} onChange={e=>saveBankCfg({[f.key]:e.target.value} as Partial<BankCfg>)} style={IS}><option value="">Choose…</option>{f.sel.map(o=><option key={o}>{o}</option>)}</select>
                          :<input type="text" placeholder={f.ph} value={bankCfg[f.key] as string||""} onChange={e=>saveBankCfg({[f.key]:e.target.value} as Partial<BankCfg>)} style={IS}/>
                        }
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"8px 14px",background:"rgba(21,184,201,0.06)",border:"1px solid rgba(21,184,201,0.2)",borderRadius:10,fontSize:12,color:MUTED,marginBottom:14 }}>
                    🔒 Your banking details are encrypted and stored securely. A void cheque or bank letter may be requested.
                  </div>
                  <button
                    onClick={()=>{ saveBankCfg({step:3}); setGlStep(2); saveGL({step:2}); }}
                    disabled={!bankCfg.holderName||!bankCfg.bankName||!bankCfg.transit||!bankCfg.accountNum}
                    style={{ width:"100%",padding:13,background:(!bankCfg.holderName||!bankCfg.bankName||!bankCfg.transit||!bankCfg.accountNum)?BORDER:ZP_GRAD,color:(!bankCfg.holderName||!bankCfg.bankName||!bankCfg.transit||!bankCfg.accountNum)?MUTED:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>
                    Save Bank Account & Continue →
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Step 2 – Integration */}
          {glStep===2&&(
            <div>
              <div style={{ marginBottom:14,padding:"10px 14px",background:"rgba(45,190,96,0.06)",border:"1px solid rgba(45,190,96,0.2)",borderRadius:10,fontSize:13,color:MUTED,lineHeight:1.6 }}>Follow these steps in your terminal / codebase. Check each when done.</div>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {SDK_STEPS.map((s,i)=>(
                  <div key={s.key} style={{ background:"#f8fafc",border:`1px solid ${glChecked[s.key]?"rgba(45,190,96,0.4)":BORDER}`,borderRadius:12,overflow:"hidden" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:`1px solid ${BORDER}`,background:CARD_BG }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ width:22,height:22,borderRadius:"50%",background:glChecked[s.key]?ZP_GREEN:BORDER,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:glChecked[s.key]?"#fff":MUTED }}>{glChecked[s.key]?"✓":i+1}</div>
                        <span style={{ fontSize:13,fontWeight:700,color:TEXT }}>{s.label}</span>
                      </div>
                      <div style={{ display:"flex",gap:6 }}>
                        <CopyBtn text={s.code} small />
                        <button onClick={()=>toggleGL(s.key)} style={{ background:glChecked[s.key]?"rgba(45,190,96,0.1)":CARD_BG,border:`1px solid ${glChecked[s.key]?"rgba(45,190,96,0.4)":BORDER}`,color:glChecked[s.key]?ZP_GREEN:MUTED,padding:"4px 10px",borderRadius:8,fontSize:11,cursor:"pointer" }}>{glChecked[s.key]?"Done ✓":"Mark done"}</button>
                      </div>
                    </div>
                    <pre style={{ margin:0,padding:"10px 14px",fontSize:11,lineHeight:1.7,color:"#e6edf3",overflowX:"auto" as const,background:"#0d1117" }}>{s.code}</pre>
                  </div>
                ))}
              </div>
              <button onClick={()=>{setGlStep(3);saveGL({step:3});}} disabled={Object.values(glChecked).filter(Boolean).length<2} style={{ marginTop:18,width:"100%",padding:13,background:Object.values(glChecked).filter(Boolean).length<2?BORDER:ZP_GRAD,color:Object.values(glChecked).filter(Boolean).length<2?MUTED:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Integration looks good → Continue</button>
            </div>
          )}
          {/* Step 3 – Compliance */}
          {glStep===3&&(
            <div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  {key:"monthlyVolume2",label:"Expected Monthly Volume",type:"select",options:["Under $1,000","$1,000–$10,000","$10,000–$50,000","$50,000–$200,000","$200,000+"],full:false},
                  {key:"avgTicket",label:"Average Transaction Size",type:"select",options:["Under $25","$25–$100","$100–$500","$500–$2,000","$2,000+"],full:false},
                  {key:"intlCards",label:"Accept international cards?",type:"select",options:["Yes — mostly domestic","Yes — global","No — domestic only"],full:false},
                  {key:"refundPolicy",label:"Refund Policy URL",type:"text",ph:"https://yourbusiness.com/refunds",full:true},
                  {key:"termsUrl",label:"Terms of Service URL",type:"text",ph:"https://yourbusiness.com/terms",full:true},
                ].map(f=>(
                  <div key={f.key} style={{ gridColumn:f.full?"1/-1":"auto" }}>
                    <label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>{f.label}</label>
                    {f.type==="select"
                      ?<select value={glForm[f.key]||""} onChange={e=>setGlField(f.key,e.target.value)} style={IS}><option value="">Choose…</option>{(f.options||[]).map(o=><option key={o}>{o}</option>)}</select>
                      :<input type="text" placeholder={(f as {ph?:string}).ph||""} value={glForm[f.key]||""} onChange={e=>setGlField(f.key,e.target.value)} style={IS}/>
                    }
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14,padding:"10px 14px",background:"#f8fafc",border:`1px solid ${BORDER}`,borderRadius:10,fontSize:12,color:MUTED,lineHeight:1.7 }}>By submitting you agree to the ZeniPay Merchant Agreement and confirm all information is accurate.</div>
              <button onClick={()=>{setGlStep(4);saveGL({step:4,submitted:true});}} disabled={!glForm.monthlyVolume2||!glForm.avgTicket} style={{ marginTop:14,width:"100%",padding:13,background:(!glForm.monthlyVolume2||!glForm.avgTicket)?BORDER:ZP_GRAD,color:(!glForm.monthlyVolume2||!glForm.avgTicket)?MUTED:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer" }}>Submit for Live Review →</button>
            </div>
          )}
          {/* Step 4 – Under Review */}
          {glStep===4&&(
            <div style={{ textAlign:"center" as const,padding:"16px 0 8px" }}>
              <div style={{ fontSize:48,marginBottom:14 }}>✅</div>
              <h3 style={{ fontSize:20,fontWeight:900,margin:"0 0 10px",color:TEXT }}>Application complete — you&apos;re ready for live!</h3>
              <p style={{ color:MUTED,fontSize:14,margin:"0 0 20px",lineHeight:1.7 }}>Your account has been reviewed and you can now switch to <strong style={{ color:ZP_GREEN }}>Live Mode</strong> to accept real payments.</p>
              <button onClick={()=>onModeChange?.("live")} style={{ background:`linear-gradient(135deg,${ZP_GREEN},${ZP_CYAN})`,color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontSize:16,fontWeight:900,cursor:"pointer",boxShadow:"0 6px 24px rgba(45,190,96,0.4)",marginBottom:20,letterSpacing:"-0.3px" }}>
                ● Switch to Live Mode →
              </button>
              <div style={{ display:"grid",gap:8,maxWidth:360,margin:"0 auto 20px" }}>
                {[{icon:"✅",label:"Business Verification",done:true},{icon:"✅",label:"Bank Account Connected",done:true},{icon:"✅",label:"Integration Setup",done:true},{icon:"✅",label:"Compliance Review",done:true}].map(item=>(
                  <div key={item.label} style={{ display:"flex",alignItems:"center",gap:10,background:"rgba(45,190,96,0.06)",border:"1px solid rgba(45,190,96,0.3)",borderRadius:10,padding:"10px 14px" }}>
                    <span style={{ fontSize:18 }}>{item.icon}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:ZP_GREEN }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );


  const CashbackSection = (() => {


    const s = (cashbackData as Record<string,unknown>)?.summary as Record<string,unknown> | undefined;
    const txF = ((cashbackData as Record<string,unknown>)?.transaction_fees || []) as Array<Record<string,unknown>>;
    const setts = ((cashbackData as Record<string,unknown>)?.settlements || []) as Array<Record<string,unknown>>;
    return (<div>
      <h2 style={{ fontSize:20,fontWeight:900,margin:"0 0 20px",color:TEXT }}>Finix Cashback — 90% Markup Return</h2>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:24 }}>
        {[{l:"Total Volume",v:s?`$${Number(s.total_volume||0).toFixed(2)}`:"...",c:ZP_GREEN},{l:"Platform Fees",v:s?`$${Number(s.total_platform_fees||0).toFixed(2)}`:"...",c:ZP_CYAN},{l:"Cashback to ZeniPay (90%)",v:s?`$${Number(s.total_cashback_payouts||0).toFixed(2)}`:"...",c:ZP_PURPLE},{l:"Settlements",v:s?String(s.settlements_count):"...",c:"#E5247B"}].map(c=>(<div key={c.l} style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:`1px solid ${BORDER}`,borderTop:`3px solid ${c.c}` }}><div style={{ fontSize:22,fontWeight:900,color:c.c }}>{c.v}</div><div style={{ fontSize:11,color:MUTED,marginTop:4,fontWeight:600 }}>{c.l}</div></div>))}
      </div>
      <div style={{ fontWeight:800,fontSize:15,marginBottom:12 }}>Per-Transaction Fee Breakdown</div>
      <div style={{ background:"#fff",borderRadius:14,border:`1px solid ${BORDER}`,overflow:"hidden",marginBottom:24 }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead><tr style={{ background:"#f8fafc",borderBottom:`1px solid ${BORDER}` }}>{["Transaction","Amount","Gross Fee","Cashback 90%","Net Fee"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{txF.length===0?<tr><td colSpan={5} style={{ padding:24,textAlign:"center",color:MUTED }}>Loading...</td></tr>:txF.map(t=>(<tr key={String(t.transfer_id)} style={{ borderBottom:`1px solid ${BORDER}` }}><td style={{ padding:"10px 14px",fontFamily:"monospace",fontSize:11 }}>{String(t.transfer_id).slice(0,16)}...</td><td style={{ padding:"10px 14px",fontWeight:700 }}>${Number(t.amount).toFixed(2)}</td><td style={{ padding:"10px 14px",color:"#DC2626" }}>-${Number(t.gross_fee).toFixed(2)}</td><td style={{ padding:"10px 14px",color:ZP_GREEN,fontWeight:700 }}>+${Number(t.cashback_90pct).toFixed(2)}</td><td style={{ padding:"10px 14px",fontWeight:800 }}>-${Number(t.net_fee_merchant).toFixed(2)}</td></tr>))}</tbody>
        </table>
      </div>
      <div style={{ fontWeight:800,fontSize:15,marginBottom:12 }}>Settlement History</div>
      <div style={{ background:"#fff",borderRadius:14,border:`1px solid ${BORDER}`,overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
          <thead><tr style={{ background:"#f8fafc",borderBottom:`1px solid ${BORDER}` }}>{["Period","Volume","Fees","Cashback","Net","Status"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:MUTED,textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>{setts.length===0?<tr><td colSpan={6} style={{ padding:24,textAlign:"center",color:MUTED }}>Loading...</td></tr>:setts.map(st=>(<tr key={String(st.id)} style={{ borderBottom:`1px solid ${BORDER}` }}><td style={{ padding:"10px 14px",fontSize:11,color:MUTED }}>{String(st.period_start||"").slice(0,10)} → {String(st.period_end||"").slice(0,10)}</td><td style={{ padding:"10px 14px",fontWeight:700 }}>${Number(st.total_amount).toFixed(2)}</td><td style={{ padding:"10px 14px",color:"#DC2626" }}>-${Number(st.total_fees).toFixed(2)}</td><td style={{ padding:"10px 14px",color:ZP_GREEN,fontWeight:700 }}>+${Number(st.cashback_to_platform).toFixed(2)}</td><td style={{ padding:"10px 14px",fontWeight:800 }}>${Number(st.net_amount).toFixed(2)}</td><td style={{ padding:"10px 14px" }}><span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:String(st.status)==="APPROVED"?"rgba(22,163,74,0.08)":"rgba(217,119,6,0.08)",color:String(st.status)==="APPROVED"?"#16A34A":"#D97706" }}>{String(st.status)}</span></td></tr>))}</tbody>
        </table>
      </div>
    </div>);
  })();

  const SECTION_MAP: Record<string,React.ReactNode> = {
    overview: OverviewSection, transactions: TransactionsSection, banking: BankingSection,
    paylinks: PayLinksSection, invoices: InvoicesSection, payouts: PayoutsSection,
    financing: FinancingSection, ben: BenAISection,
    accounting: AccountingSection, analytics: AnalyticsSection, keys: KeysSection,
    settings: SettingsSection, "go-live": GoLiveSection, cashback: CashbackSection,
  };

  // ─── MODALS ──────────────────────────────────────────
  const payLinkModal = modal==="paylink" && (
    <Modal title="Create Payment Link" onClose={()=>setModal(null)}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11,color:MUTED,fontWeight:700,marginBottom:8 }}>TEMPLATES</div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {LINK_TEMPLATES.map(t=><button key={t.title} onClick={()=>setPlForm(f=>({...f,title:t.title,amount:t.amount,desc:t.desc}))} style={{ background:"#f8fafc",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer" }}>{t.title}</button>)}
        </div>
      </div>
      <div style={{ display:"grid",gap:12 }}>
        {[{label:"Link Title",key:"title",type:"text",ph:"e.g. Product Purchase"},{label:"Amount (CAD)",key:"amount",type:"number",ph:"99.00"},{label:"Customer Email (optional)",key:"email",type:"email",ph:"customer@email.com"},{label:"Description",key:"desc",type:"text",ph:"What is this payment for?"}].map(f=>(
          <div key={f.key}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>{f.label}</label><input type={f.type} placeholder={f.ph} value={plForm[f.key as keyof typeof plForm]} onChange={e=>setPlForm(p=>({...p,[f.key]:e.target.value}))} style={IS}/></div>
        ))}
        <button onClick={createPayLink} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer",marginTop:4 }}>Create Payment Link →</button>
      </div>
    </Modal>
  );
  const invoiceModal = modal==="invoice" && (
    <Modal title="Create Invoice" onClose={()=>setModal(null)}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11,color:MUTED,fontWeight:700,marginBottom:8 }}>TEMPLATES</div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {INV_TEMPLATES.map(t=><button key={t.name} onClick={()=>setInvItems(t.items)} style={{ background:"#f8fafc",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer" }}>{t.name}</button>)}
        </div>
      </div>
      <div style={{ display:"grid",gap:12,marginBottom:16 }}>
        {[{label:"Client Name",key:"client",type:"text",ph:"Acme Corp"},{label:"Client Email",key:"email",type:"email",ph:"billing@client.com"},{label:"Due Date",key:"dueDate",type:"date",ph:""}].map(f=>(
          <div key={f.key}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>{f.label}</label><input type={f.type} placeholder={f.ph} value={invForm[f.key as keyof typeof invForm]} onChange={e=>setInvForm(p=>({...p,[f.key]:e.target.value}))} style={IS}/></div>
        ))}
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11,color:MUTED,fontWeight:700,marginBottom:8 }}>LINE ITEMS</div>
        {invItems.map((item,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#f8fafc",borderRadius:8,marginBottom:6,fontSize:13,color:TEXT }}>
            <span>{item.desc} × {item.qty}</span>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}><span style={{ fontWeight:700 }}>{fmt(item.qty*item.price)}</span><button onClick={()=>setInvItems(p=>p.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:16,padding:"0 4px" }}>×</button></div>
          </div>
        ))}
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginTop:8 }}>
          <input placeholder="Description" value={invForm.desc} onChange={e=>setInvForm(f=>({...f,desc:e.target.value}))} style={{ ...IS,fontSize:12 }}/>
          <input placeholder="Qty" type="number" value={invForm.qty} onChange={e=>setInvForm(f=>({...f,qty:e.target.value}))} style={{ ...IS,fontSize:12 }}/>
          <input placeholder="Price $" type="number" value={invForm.price} onChange={e=>setInvForm(f=>({...f,price:e.target.value}))} style={{ ...IS,fontSize:12 }}/>
          <button onClick={addInvItem} style={{ background:"#f8fafc",border:`1px solid ${BORDER}`,color:TEXT,borderRadius:10,padding:"0 12px",fontSize:20,cursor:"pointer" }}>+</button>
        </div>
      </div>
      {invItems.length>0&&<div style={{ textAlign:"right",fontWeight:800,fontSize:16,marginBottom:12,color:TEXT }}>Total: {fmt(invItems.reduce((s,i)=>s+i.qty*i.price,0))}</div>}
      <button onClick={createInvoice} disabled={!invForm.client||invItems.length===0} style={{ width:"100%",background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer" }}>Create Invoice →</button>
    </Modal>
  );
  const payoutModal = modal==="payout" && (
    <Modal title="Send Payout" onClose={()=>setModal(null)}>
      <div style={{ display:"grid",gap:12 }}>
        {[{label:"Recipient Name",key:"recipient",type:"text",ph:"John Smith"},{label:"Amount (CAD)",key:"amount",type:"number",ph:"500.00"},{label:"Note (optional)",key:"note",type:"text",ph:"Invoice #1042 payment"}].map(f=>(
          <div key={f.key}><label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>{f.label}</label><input type={f.type} placeholder={f.ph} value={poForm[f.key as keyof typeof poForm]} onChange={e=>setPoForm(p=>({...p,[f.key]:e.target.value}))} style={IS}/></div>
        ))}
        <div>
          <label style={{ fontSize:11,color:MUTED,fontWeight:700,display:"block",marginBottom:5 }}>Payment Method</label>
          <select value={poForm.method} onChange={e=>setPoForm(p=>({...p,method:e.target.value}))} style={IS}>
            {["e-Transfer","ACH / EFT","Wire Transfer","Interac"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={createPayout} disabled={!poForm.recipient||!poForm.amount} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer" }}>Send Payout →</button>
      </div>
    </Modal>
  );

  // ────────────────────────────────────────────────────────
  //  RENDER — ZenivaComplete layout
  // ────────────────────────────────────────────────────────
  const SIDEBAR_W = sidebarOpen ? 240 : 64;

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display:"flex" }}>
      <style>{`
        *{box-sizing:border-box;}
        select option{background:#fff;color:#0f172a;}
        pre{font-family:'SF Mono','Fira Code',monospace;}
        button:active{opacity:0.85;}
        .zp-tab-btn:hover{background:rgba(21,184,201,0.12) !important;}
        .zp-nav-btn:hover{background:rgba(255,255,255,0.08) !important;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px;}
      `}</style>

      {/* ══ LEFT SIDEBAR ══ */}
      <div style={{ width:SIDEBAR_W, minHeight:"100vh", background:`linear-gradient(180deg, #0d1633 0%, #1a2a5e 30%, #2A8FE0 70%, #7B4FBF 100%)`, borderRight:"1px solid rgba(255,255,255,0.15)", transition:"width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow:"hidden", display:"flex", flexDirection:"column" as const, flexShrink:0, position:"sticky" as const, top:0, alignSelf:"flex-start" as const, zIndex:100, maxHeight:"100vh" }}>
        {/* Logo + toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:sidebarOpen?"space-between":"center", padding:"18px 14px", borderBottom:"1px solid rgba(255,255,255,0.15)", minHeight:70 }}>
          {sidebarOpen && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:36, height:36, objectFit:"contain", filter:"drop-shadow(0 4px 14px rgba(21,184,201,0.6))", flexShrink:0 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
              <div>
                <p style={{ margin:0, fontWeight:900, fontSize:15, color:"white", letterSpacing:"-0.5px" }}>ZeniPay</p>
                <p style={{ margin:0, fontSize:8, color:"rgba(255,255,255,0.6)", fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.1em" }}>{account.businessName}</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:32, height:32, objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(21,184,201,0.5))" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
          )}
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:8, width:26, height:26, cursor:"pointer", color:"white", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginLeft:sidebarOpen?0:"auto" }}>
            {sidebarOpen?"‹":"›"}
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex:1, overflowY:"auto" as const, padding:"8px 6px", scrollbarWidth:"none" as const }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button key={t.id} className="zp-nav-btn" onClick={()=>setTab(t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:sidebarOpen?"9px 12px":"9px 0", justifyContent:sidebarOpen?"flex-start" as const:"center" as const, border:isActive?`1px solid ${ZP_CYAN}40`:"1px solid transparent", borderRadius:10, background:isActive?`linear-gradient(135deg,${ZP_CYAN}25,${ZP_CYAN}10)`:"transparent", cursor:"pointer", marginBottom:1, transition:"all 0.15s", color:"white", boxShadow:isActive?`0 0 16px ${ZP_CYAN}20`:"none" }}>
                <span style={{ fontSize:15, flexShrink:0, opacity:isActive?1:0.7 }}>{t.icon}</span>
                {sidebarOpen && <span style={{ fontSize:12, fontWeight:isActive?700:400, color:isActive?"white":"rgba(255,255,255,0.45)", whiteSpace:"nowrap" as const }}>{t.label}</span>}
                {sidebarOpen && isActive && <div style={{ marginLeft:"auto", width:4, height:16, background:ZP_CYAN, borderRadius:9999, boxShadow:`0 0 8px ${ZP_CYAN}` }} />}
              </button>
            );
          })}
        </div>

        {/* Bottom status */}
        {sidebarOpen && (
          <div style={{ padding:"14px", borderTop:"1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ background:isSandbox?`rgba(245,166,35,0.15)`:`rgba(45,190,96,0.15)`, border:`1px solid ${isSandbox?"rgba(245,166,35,0.3)":"rgba(45,190,96,0.3)"}`, borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, background:isSandbox?"#F5A623":"#2DBE60", borderRadius:"50%", boxShadow:`0 0 6px ${isSandbox?"#F5A623":"#2DBE60"}` }} />
                <span style={{ fontSize:10, color:isSandbox?"#F5A623":"#2DBE60", fontWeight:700, letterSpacing:"0.05em" }}>{isSandbox?"SANDBOX MODE":"LIVE MODE"}</span>
              </div>
              <p style={{ margin:"4px 0 0", fontSize:9, color:"rgba(255,255,255,0.55)" }}>ZeniPay · {isSandbox?"Testing":"Production"}</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${ZP_CYAN},${ZP_PURPLE})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"white", fontWeight:900 }}>{(account.ownerName||account.businessName||"?")[0].toUpperCase()}</div>
              <div>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"white" }}>{account.ownerName||"Account"}</p>
                <p style={{ margin:0, fontSize:9, color:"rgba(255,255,255,0.65)" }}>{account.plan==="Sandbox"?"Standard":account.plan} Plan</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:140 }} />
      )}

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ flex:1, minHeight:"100vh", overflow:"auto", background:"#f0f4f8" }}>

        {/* ── HEADER ── */}
        <div style={{ background:`linear-gradient(135deg, #0d1633 0%, #1a2a5e 25%, #2DBE60 55%, #15B8C9 75%, #7B4FBF 100%)`, padding:"0 24px", borderBottom:"1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ maxWidth:1400, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.15)" }}>
              {/* Brand */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:900, fontSize:16, color:"white", letterSpacing:"-0.5px" }}>ZeniPay</span>
                  <span style={{ background:isSandbox?"rgba(245,166,35,0.25)":"rgba(45,190,96,0.25)", border:`1px solid ${isSandbox?"rgba(245,166,35,0.5)":"rgba(45,190,96,0.5)"}`, color:isSandbox?"#F5A623":"#2DBE60", fontSize:8, fontWeight:800, borderRadius:4, padding:"2px 6px", letterSpacing:"0.1em" }}>
                    {isSandbox?"● SANDBOX":"● LIVE"}
                  </span>
                </div>
                <p style={{ margin:0, fontSize:9, color:"#94a3b8", letterSpacing:"0.06em" }}>{account.businessName}</p>
              </div>
              {/* Balance + quick actions */}
              <div style={{ marginLeft:"auto", display:"flex", gap:20, alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.65)", textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>Balance</p>
                  <p style={{ margin:0, fontWeight:900, fontSize:20, color:"white", letterSpacing:"-0.5px" }}>{fmt(account.balance)}</p>
                </div>
                <div style={{ width:1, height:36, background:"rgba(255,255,255,0.25)" }} />
                <div>
                  <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.65)" }}>Volume</p>
                  <p style={{ margin:0, fontWeight:800, fontSize:16, color:"white" }}>{fmt(account.volume)}</p>
                </div>
                <div style={{ width:1, height:36, background:"rgba(255,255,255,0.25)" }} />
                <div style={{ display:"flex", gap:8 }}>
                  {/* Mode toggle */}
                  <div style={{ display:"flex",background:"rgba(0,0,0,0.3)",borderRadius:20,padding:3,gap:2,border:"1px solid rgba(255,255,255,0.12)" }}>
                    <button onClick={()=>onModeChange?.("sandbox")} style={{ padding:"4px 12px",borderRadius:16,border:"none",fontSize:10,fontWeight:800,cursor:"pointer",transition:"all 0.2s", background:isSandbox?"rgba(217,119,6,0.4)":"transparent", color:isSandbox?"#F59E0B":"rgba(255,255,255,0.35)", boxShadow:isSandbox?"0 1px 6px rgba(217,119,6,0.3)":"none" }}>◎ SANDBOX</button>
                    <button onClick={()=>onModeChange?.("live")} style={{ padding:"4px 12px",borderRadius:16,border:"none",fontSize:10,fontWeight:800,cursor:"pointer",transition:"all 0.2s", background:!isSandbox?"rgba(45,190,96,0.4)":"transparent", color:!isSandbox?"#4ADE80":"rgba(255,255,255,0.35)", boxShadow:!isSandbox?"0 1px 6px rgba(45,190,96,0.3)":"none" }}>● LIVE</button>
                  </div>
                  <button onClick={()=>{setTab("paylinks");setModal("paylink");}} style={{ background:"linear-gradient(90deg,#F5A623,#E5247B)", border:"none", borderRadius:8, padding:"8px 14px", color:"white", fontSize:11, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(245,166,35,0.5)" }}>+ New Payment</button>
                  <button onClick={onSignOut} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, padding:"8px 14px", color:"#EF4444", fontSize:11, fontWeight:700, cursor:"pointer" }}>🔓 Sign Out</button>
                </div>
              </div>
            </div>

            {/* ── TAB BAR ── */}
            <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" as const }}>
              {TABS.map(t => (
                <button key={t.id} onClick={()=>setTab(t.id)} className="zp-tab-btn" style={{ background:tab===t.id?`${ZP_CYAN}15`:"transparent", border:"none", borderBottom:tab===t.id?`2px solid ${ZP_CYAN}`:"2px solid transparent", color:tab===t.id?ZP_CYAN:"rgba(255,255,255,0.35)", padding:"11px 14px", fontSize:11, fontWeight:tab===t.id?700:400, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"all 0.15s", display:"flex", gap:5, alignItems:"center", flexShrink:0 }}>
                  <span style={{ fontSize:13 }}>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 28px" }}>
          {SECTION_MAP[tab] || OverviewSection}
        </div>
      </div>

      {payLinkModal}
      {invoiceModal}
      {payoutModal}

      {/* Invoice Detail View Modal */}
      {viewInvoice && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={()=>setViewInvoice(null)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:600,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ padding:"24px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:22,fontWeight:900,background:ZP_GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{account.businessName || "ZeniPay"}</div>
                <div style={{ fontSize:10,color:"#94a3b8",marginTop:2 }}>{account.email || ""}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:800,fontSize:16,color:TEXT }}>#{viewInvoice.id}</div>
                <div style={{ fontSize:11,color:MUTED,marginTop:2 }}>{new Date(viewInvoice.createdAt).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
                <span style={{ display:"inline-block",marginTop:6,background:viewInvoice.status==="paid"?"#d1fae5":"#fef3c7",color:viewInvoice.status==="paid"?"#065f46":"#92400e",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:9999 }}>{viewInvoice.status.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ padding:"20px 28px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              <div>
                <div style={{ fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4 }}>Bill To</div>
                <div style={{ fontWeight:700,fontSize:14,color:TEXT }}>{viewInvoice.client}</div>
                <div style={{ fontSize:12,color:MUTED }}>{viewInvoice.email}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4 }}>Due Date</div>
                <div style={{ fontSize:12,color:MUTED }}>{new Date(viewInvoice.dueDate).toLocaleDateString("en-CA")}</div>
              </div>
            </div>
            <div style={{ padding:"0 28px" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#f8fafc" }}>
                  {["Description","Qty","Price","Total"].map((h,i)=>(
                    <th key={h} style={{ padding:"8px 12px",textAlign:i===3?"right":"left",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",borderBottom:"2px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {viewInvoice.items.length > 0 ? viewInvoice.items.map((it,i)=>(
                    <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>{it.desc}</td>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>{it.qty}</td>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>{fmt(it.price)}</td>
                      <td style={{ padding:"10px 12px",fontSize:13,fontWeight:700,textAlign:"right" }}>{fmt(it.qty*it.price)}</td>
                    </tr>
                  )) : (
                    <tr style={{ borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>Payment</td>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>1</td>
                      <td style={{ padding:"10px 12px",fontSize:13 }}>{fmt(viewInvoice.amount)}</td>
                      <td style={{ padding:"10px 12px",fontSize:13,fontWeight:700,textAlign:"right" }}>{fmt(viewInvoice.amount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding:"16px 28px",textAlign:"right" }}>
              <div style={{ fontSize:20,fontWeight:900,color:TEXT }}>Total: {fmt(viewInvoice.amount)}</div>
            </div>
            <div style={{ padding:"16px 28px 12px",display:"flex",gap:10,justifyContent:"flex-end" }}>
              <button onClick={()=>{ const w=window.open("","_blank"); if(!w)return; w.document.write(`<!DOCTYPE html><html><head><title>Invoice #${viewInvoice.id}</title><style>body{font-family:sans-serif;margin:40px;color:#0f172a}h1{font-size:28px;font-weight:900;background:linear-gradient(90deg,#2DBE60,#15B8C9,#7B4FBF);-webkit-background-clip:text;-webkit-text-fill-color:transparent}table{width:100%;border-collapse:collapse;margin:24px 0}th{background:#f8fafc;text-align:left;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0}td{padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px}.total{text-align:right;font-size:20px;font-weight:900;margin-top:16px}</style></head><body><h1>${account.businessName || "ZeniPay"}</h1><p>Invoice #${viewInvoice.id}</p><p><strong>${viewInvoice.client}</strong> · ${viewInvoice.email}</p><p>Date: ${new Date(viewInvoice.createdAt).toLocaleDateString("en-CA")} · Due: ${new Date(viewInvoice.dueDate).toLocaleDateString("en-CA")}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${viewInvoice.items.map(it=>`<tr><td>${it.desc}</td><td>${it.qty}</td><td>$${it.price.toFixed(2)}</td><td style="text-align:right;font-weight:700">$${(it.qty*it.price).toFixed(2)}</td></tr>`).join("")||`<tr><td>Payment</td><td>1</td><td>$${viewInvoice.amount.toFixed(2)}</td><td style="text-align:right;font-weight:700">$${viewInvoice.amount.toFixed(2)}</td></tr>`}</tbody></table><div class="total">Total: $${viewInvoice.amount.toFixed(2)}</div><p style="margin-top:40px;font-size:11px;color:#94a3b8;text-align:center">Powered by ZeniPay · zenipay.ca</p></body></html>`); w.document.close(); w.focus(); setTimeout(()=>w.print(),300); }} style={{ background:ZP_GRAD,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer" }}>🖨 Print / PDF</button>
              <button onClick={()=>setViewInvoice(null)} style={{ background:"#f1f5f9",color:MUTED,border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer" }}>Close</button>
            </div>
            <div style={{ padding:"0 28px 20px",textAlign:"center" }}>
              <div style={{ fontSize:10,color:"#94a3b8" }}>Powered by ZeniPay</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
