"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "../../modules/zenipay/i18n";

const BLUE = "#15B8C9";
const GREEN = "#2DBE60";
const PURPLE = "#7B4FBF";
const GOLD = "#F5A623";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Account = { id: string; merchant_id: string; account_type: string; account_name: string; account_number: string; routing_number: string; balance: number; status: string; is_primary: boolean; currency?: string; goal_amount?: number; goal_deadline?: string; created_at?: string; updated_at?: string };
type Transfer = { id: string; transfer_type: string; recipient_name: string; amount: number; fee: number; status: string; memo: string; created_at: string };
type CardDB = { id: string; card_type: string; last4: string; expiry: string; status: string; is_virtual: boolean; is_physical: boolean; spending_limit: number; daily_limit: number; spent_this_month?: number };
type Contact = { id: string; name: string; routing_number?: string; account_number?: string; bank_name?: string; swift_code?: string };
type Notification = { payment_received: boolean; payout_completed: boolean; card_transaction: boolean; weekly_summary: boolean; large_transaction_threshold: number; low_balance_threshold: number };

interface BankingProps {
  platformBalance: number; grossRevenue: number; zenipayFees: number;
  paidOut: number; pending: number;
  transactions: { id: string; customer: string; amount: number; status: string; date: string; description?: string; booking?: string; card_brand?: string; card_last4?: string; currency?: string; method?: string; gateway?: string }[];
  unitCards: { id: string; last4?: string; expiry?: string; status?: string; attributes: { last4Digits?: string; expirationDate?: string; status?: string } }[];
  onTabChange: (tab: string) => void;
  businessName: string;
  merchantId: string;
}

const SECTIONS = ["Overview", "Accounts", "Cards", "Send Money", "Transactions", "Fee Schedule", "Money Flow", "Settings"] as const;
type Section = typeof SECTIONS[number];

const ACCT_TYPES = ["business_checking", "business_savings", "personal_checking", "personal_savings", "goal", "multi_currency"] as const;
const ACCT_GRADIENTS: Record<string, string> = {
  business_checking: "linear-gradient(135deg, #15B8C9, #2A8FE0)",
  business_savings: "linear-gradient(135deg, #2DBE60, #15B8C9)",
  personal_checking: "linear-gradient(135deg, #7B4FBF, #4F46E5)",
  personal_savings: "linear-gradient(135deg, #FF6B6B, #FF8C42)",
  goal: "linear-gradient(135deg, #E5247B, #FF6B6B)",
  multi_currency: "linear-gradient(135deg, #F5A623, #FF8C42)",
};
const ACCT_COLORS: Record<string, string> = {
  business_checking: "#15B8C9",
  business_savings: "#2DBE60",
  personal_checking: "#7B4FBF",
  personal_savings: "#FF6B6B",
  goal: "#E5247B",
  multi_currency: "#F5A623",
};
const CARD_OPTIONS = [
  { value: "visa_debit_virtual", label: "Visa Debit \u2014 Virtual", fee: 0 },
  { value: "visa_debit_physical", label: "Visa Debit \u2014 Physical ($10)", fee: 10 },
  { value: "mc_debit_virtual", label: "Mastercard Debit \u2014 Virtual", fee: 0 },
  { value: "mc_credit_review", label: "Mastercard Credit \u2014 Requires Review", fee: 0 },
];
const FEES_DATA = [
  ["Card Processing (Domestic)", "2.9% + $0.30"],
  ["Card Processing (Intl)", "3.9% + $0.30"],
  ["ACH Transfer", "Free"],
  ["Domestic Wire", "$15.00"],
  ["International Wire", "$30.00"],
  ["Physical Card Issuance", "$10.00"],
  ["Virtual Card Issuance", "Free"],
  ["Monthly Platform Fee", "$0.00"],
  ["Chargeback Fee", "$15.00"],
  ["Refund Processing", "Free"],
];

const SECTION_ICONS: Record<string, string> = {
  Overview: "\u{1F3E0}",
  Accounts: "\u{1F4CA}",
  Cards: "\u{1F4B3}",
  "Send Money": "\u{1F4E8}",
  Transactions: "\u{1F4C4}",
  "Fee Schedule": "\u{1F4B0}",
  "Money Flow": "\u{1F504}",
  Settings: "\u2699\uFE0F",
};

const CSS_ANIMATIONS = `
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(40px); }
}
@media (max-width: 768px) {
  .bp-hero { padding: 20px !important; }
  .bp-hero-stats { gap: 16px !important; }
  .bp-hero-btns button { padding: 10px 18px !important; font-size: 13px !important; }
  .bp-form-grid { grid-template-columns: 1fr !important; }
  .bp-card-grid { grid-template-columns: 1fr !important; }
  .bp-search-input { width: 100% !important; }
  .bp-tx-table-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
  .bp-fee-grid { grid-template-columns: 1fr !important; }
  .bp-section-tabs { padding: 10px 12px !important; gap: 2px !important; }
  .bp-section-tabs button { padding: 8px 12px !important; font-size: 12px !important; }
  .bp-content { padding: 16px !important; }
  .bp-settings-grid { grid-template-columns: 1fr !important; }
  .bp-modal-panel { width: 100vw !important; }
  .bp-filter-row { flex-direction: column !important; align-items: stretch !important; }
  .bp-money-flow { padding: 12px 0 !important; }
  .bp-money-flow > div { min-width: 100px !important; padding: 12px 8px !important; }
}
`;

const badge = (text: string, color: string): React.CSSProperties => ({
  display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "14", color, textTransform: "capitalize" as const, letterSpacing: "0.03em",
});
const btnPrimary = (small = false): React.CSSProperties => ({
  padding: small ? "8px 16px" : "12px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #15B8C9, #7B4FBF)", color: "#fff", fontWeight: 700, fontSize: small ? 13 : 14, cursor: "pointer", transition: "all 0.2s ease", letterSpacing: "0.01em",
});
const btnSecondary = (small = false): React.CSSProperties => ({
  padding: small ? "8px 16px" : "12px 24px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontWeight: 600, fontSize: small ? 13 : 14, cursor: "pointer", transition: "all 0.2s ease",
});
const btnAccent = (color: string, small = false): React.CSSProperties => ({
  padding: small ? "8px 16px" : "12px 24px", borderRadius: 12, border: "none", background: color, color: "#fff", fontWeight: 700, fontSize: small ? 13 : 14, cursor: "pointer", transition: "all 0.2s ease",
});
const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", transition: "all 0.3s ease" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", height: 48, borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 14, boxSizing: "border-box", background: "#FAFBFC", color: "#0F172A", transition: "border-color 0.2s ease", outline: "none" };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.05em" };

type Toast = { id: number; message: string; type: "success" | "error" };

export default function BankingPage(props: BankingProps) {
  const { t } = useT();
  const { platformBalance, grossRevenue, zenipayFees, paidOut, pending, transactions, merchantId, businessName, onTabChange } = props;
  const [section, setSection] = useState<Section>("Overview");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cards, setCards] = useState<CardDB[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notifs, setNotifs] = useState<Notification>({ payment_received: true, payout_completed: true, card_transaction: true, weekly_summary: false, large_transaction_threshold: 1000, low_balance_threshold: 500 });
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDB | null>(null);
  const [revealCard, setRevealCard] = useState(false);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${merchantId}`);
      const d = await r.json();
      if (d.accounts) setAccounts(d.accounts);
      if (d.transfers) setTransfers(d.transfers);
      if (d.cards) setCards(d.cards);
      if (d.contacts) setContacts(d.contacts);
      if (d.notifications && Object.keys(d.notifications).length > 0) setNotifs({ payment_received: true, payout_completed: true, card_transaction: true, weekly_summary: false, large_transaction_threshold: 1000, low_balance_threshold: 500, ...d.notifications });
    } catch (e) { console.error("Banking fetch error", e); }
  }, [merchantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const post = async (action: string, data: Record<string, unknown>) => {
    setLoading(true);
    try {
      await fetch("/api/zenipay/banking-ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, merchant_id: merchantId, ...data }) });
      await fetchData();
      const messages: Record<string, string> = {
        create_account: "Account created successfully",
        create_card: "Card application submitted",
        send_transfer: "Transfer sent successfully",
        toggle_card: "Card status updated",
        update_notifications: "Settings saved successfully",
      };
      if (messages[action]) showToast(messages[action]);
    } catch (e) {
      console.error("Banking action error", e);
      showToast("Action failed. Please try again.", "error");
    } finally { setLoading(false); }
  };

  const netBalance = platformBalance;
  const cardGradient = (c: CardDB) => c.card_type?.includes("mc") ? "linear-gradient(135deg, #F5A623 0%, #E5247B 50%, #7B4FBF 100%)" : "linear-gradient(135deg, #2DBE60 0%, #15B8C9 50%, #2A8FE0 100%)";

  /* === TOAST SYSTEM === */
  const ToastContainer = () => (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "#fff", borderRadius: 12, padding: "14px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          borderLeft: `4px solid ${t.type === "success" ? GREEN : "#e74c3c"}`,
          animation: "toastIn 0.3s ease forwards", minWidth: 260, maxWidth: 360,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{t.type === "success" ? "\u2705" : "\u274C"}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.message}</span>
        </div>
      ))}
    </div>
  );

  /* === SUB-COMPONENTS === */
  const Overview = () => (
    <div style={{ animation: "slideUp 0.3s ease forwards" }}>
      <div className="bp-hero" style={{ background: "linear-gradient(135deg, #15B8C9 0%, #7B4FBF 50%, #E5247B 100%)", borderRadius: 24, padding: 40, color: "#fff", marginBottom: 24 }}>
        <div style={{ ...labelStyle, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>NET BALANCE</div>
        <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 24, letterSpacing: "-0.02em" }}>{fmt(netBalance)}</div>
        <div className="bp-hero-stats" style={{ display: "flex", gap: 36, flexWrap: "wrap", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, marginBottom: 4 }}>Pending</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: "#FFD86B" }}>{fmt(pending)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, marginBottom: 4 }}>Paid Out</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: "#7BFFB0" }}>{fmt(paidOut)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, marginBottom: 4 }}>Platform Balance</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: "#B8F0FF" }}>{fmt(platformBalance)}</div>
          </div>
        </div>
        <div className="bp-hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={{ padding: "12px 28px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", backdropFilter: "blur(8px)" }} onClick={() => setSection("Send Money")}>{t("banking.sendMoney")}</button>
          <button style={{ padding: "12px 28px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", backdropFilter: "blur(8px)" }} onClick={() => setSection("Cards")}>{t("banking.cards")}</button>
          <button style={{ padding: "12px 28px", borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", backdropFilter: "blur(8px)" }} onClick={() => setSection("Transactions")}>{t("banking.statements")}</button>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", marginBottom: 20 }}>{t("banking.revenueBreakdown")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {([[t("banking.grossRevenue"), grossRevenue, GREEN], [t("kpi.zenipayFees"), -zenipayFees, "#e74c3c"], [t("kpi.netRevenue"), netBalance, BLUE]] as [string, number, string][]).map(([lbl, val, clr]) => (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 15 }}>{lbl}</span>
              <span style={{ fontWeight: 900, color: clr, fontSize: 20, letterSpacing: "-0.02em" }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AccountsSection = () => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ account_type: "business_checking" as string, account_name: "", currency: "USD", goal_amount: "", goal_deadline: "" });
    const submit = async () => {
      if (!form.account_name) return;
      await post("create_account", { account_type: form.account_type, account_name: form.account_name, ...(form.account_type === "multi_currency" ? { currency: form.currency } : {}), ...(form.account_type === "goal" ? { goal_amount: Number(form.goal_amount), goal_deadline: form.goal_deadline } : {}) });
      setShowForm(false);
      setForm({ account_type: "business_checking", account_name: "", currency: "USD", goal_amount: "", goal_deadline: "" });
    };
    return (
      <div style={{ animation: "slideUp 0.3s ease forwards" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{t("banking.yourAccounts")}</h3>
          <button style={btnPrimary()} onClick={() => setShowForm(!showForm)}>+ {t("banking.openNewAccount")}</button>
        </div>
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 24, border: "2px solid #15B8C920" }}>
            <div style={{ fontWeight: 800, marginBottom: 18, fontSize: 16, color: "#0F172A" }}>{t("banking.openNewAccount")}</div>
            <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div><label style={labelStyle}>{t("banking.accountType")}</label><select style={inputStyle} value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}>{ACCT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}</select></div>
              <div><label style={labelStyle}>{t("banking.accountName")}</label><input style={inputStyle} placeholder="e.g. Main Business Account" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
              {form.account_type === "multi_currency" && <div><label style={labelStyle}>Currency</label><select style={inputStyle} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map(c => <option key={c} value={c}>{c}</option>)}</select></div>}
              {form.account_type === "goal" && <><div><label style={labelStyle}>Goal Amount</label><input style={inputStyle} type="number" placeholder="5000" value={form.goal_amount} onChange={e => setForm({ ...form, goal_amount: e.target.value })} /></div><div><label style={labelStyle}>Deadline</label><input style={inputStyle} type="date" value={form.goal_deadline} onChange={e => setForm({ ...form, goal_deadline: e.target.value })} /></div></>}
            </div>
            <button style={{ ...btnAccent(GREEN), marginTop: 18 }} disabled={loading} onClick={submit}>{loading ? t("common.creating") : t("banking.createAccount")}</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {accounts.map((a, i) => {
            const typeColor = ACCT_COLORS[a.account_type] || BLUE;
            return (
              <div key={a.id} onClick={() => setSelectedAccount(a)} style={{ ...cardStyle, position: "relative", animation: `slideUp 0.3s ease forwards`, animationDelay: `${i * 0.05}s`, opacity: 0, cursor: "pointer" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)"; }}>
                <div style={{ position: "absolute", top: 20, left: 20, width: 8, height: 8, borderRadius: "50%", background: ACCT_GRADIENTS[a.account_type] || BLUE }} />
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={badge(a.status, a.status === "active" ? GREEN : GOLD)}>{a.status}</span>
                  {a.is_primary && <span style={{ ...badge("primary", BLUE), marginLeft: 6 }}>primary</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0F172A", marginTop: 4, paddingLeft: 20 }}>{a.account_name}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, paddingLeft: 20, textTransform: "capitalize" }}>{a.account_type.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.05em", paddingLeft: 20 }}>****{a.account_number?.slice(-4) || "0000"}</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 14, color: typeColor, letterSpacing: "-0.02em", paddingLeft: 20 }}>{fmt(a.is_primary && netBalance > 0 ? netBalance : (a.balance || 0))}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 8, paddingLeft: 20 }}>Click for 360° view →</div>
              </div>
            );
          })}
          {accounts.length === 0 && <div style={{ ...cardStyle, color: "#94A3B8", textAlign: "center", fontSize: 15 }}>No accounts yet. Open your first account above.</div>}
        </div>
      </div>
    );
  };

  const CardsSection = () => {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ card_type: "visa_debit_virtual", daily_limit: 5000, address: "" });
    const isPhysical = form.card_type.includes("physical");
    const submit = async () => {
      await post("create_card", { card_type: form.card_type, daily_limit: form.daily_limit, ...(isPhysical ? { shipping_address: form.address } : {}) });
      setShowForm(false);
      setForm({ card_type: "visa_debit_virtual", daily_limit: 5000, address: "" });
    };
    const toggle = (c: CardDB) => post("toggle_card", { card_id: c.id, action: c.status === "active" ? "freeze" : "unfreeze" });
    const cardGradient = (c: CardDB) => c.card_type?.includes("mc") ? "linear-gradient(135deg, #F5A623 0%, #E5247B 50%, #7B4FBF 100%)" : "linear-gradient(135deg, #2DBE60 0%, #15B8C9 50%, #2A8FE0 100%)";
    return (
      <div style={{ animation: "slideUp 0.3s ease forwards" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{t("banking.yourCards")}</h3>
          <button style={btnPrimary()} onClick={() => setShowForm(!showForm)}>{t("banking.applyForCard")}</button>
        </div>
        {showForm && (
          <div style={{ ...cardStyle, marginBottom: 24, border: "2px solid #7B4FBF20" }}>
            <div style={{ fontWeight: 800, marginBottom: 18, fontSize: 16, color: "#0F172A" }}>{t("banking.applyForCard")}</div>
            <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div><label style={labelStyle}>Card Type</label><select style={inputStyle} value={form.card_type} onChange={e => setForm({ ...form, card_type: e.target.value })}>{CARD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label style={labelStyle}>Daily Limit: {fmt(form.daily_limit)}</label><input type="range" min={500} max={50000} step={500} value={form.daily_limit} onChange={e => setForm({ ...form, daily_limit: Number(e.target.value) })} style={{ width: "100%", marginTop: 12, accentColor: PURPLE }} /></div>
              {isPhysical && <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Shipping Address</label><input style={inputStyle} placeholder="123 Main St, City, State, ZIP" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>}
            </div>
            {CARD_OPTIONS.find(o => o.value === form.card_type)?.fee ? <div style={{ marginTop: 12, fontSize: 13, color: GOLD, fontWeight: 600 }}>Issuance fee: $10.00</div> : null}
            <button style={{ ...btnAccent(PURPLE), marginTop: 18 }} disabled={loading} onClick={submit}>{loading ? "Applying..." : "Apply"}</button>
          </div>
        )}
        <div className="bp-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
          {cards.map((c, i) => {
            const pct = c.spending_limit ? Math.min(100, ((c.spent_this_month || 0) / c.spending_limit) * 100) : 0;
            const isFrozen = c.status === "frozen";
            return (
              <div key={c.id} style={{ ...cardStyle, animation: `slideUp 0.3s ease forwards`, animationDelay: `${i * 0.05}s`, opacity: 0 }}>
                {/* Realistic credit card */}
                <div style={{
                  width: 340, maxWidth: "100%", aspectRatio: "1.586", borderRadius: 16, padding: "24px 28px",
                  color: "#fff", marginBottom: 18, position: "relative", overflow: "hidden",
                  background: cardGradient(c),
                  filter: isFrozen ? "grayscale(0.8)" : "none",
                  transition: "transform 0.4s ease, box-shadow 0.4s ease",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  cursor: "pointer",
                }} onClick={() => { setSelectedCard(c); setRevealCard(false); }}>
                  {/* Top row: ZeniPay + virtual/physical */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.05em" }}>ZeniPay</div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, fontWeight: 700 }}>{c.is_virtual ? "VIRTUAL" : "PHYSICAL"}</div>
                  </div>
                  {/* Chip */}
                  <div style={{ width: 44, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #D4AF37, #F5D060)", marginTop: 8, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 6, left: 4, right: 4, height: 1, background: "rgba(0,0,0,0.15)" }} />
                    <div style={{ position: "absolute", top: 12, left: 4, right: 4, height: 1, background: "rgba(0,0,0,0.15)" }} />
                    <div style={{ position: "absolute", top: 18, left: 4, right: 4, height: 1, background: "rgba(0,0,0,0.15)" }} />
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "rgba(0,0,0,0.1)" }} />
                  </div>
                  {/* Card number */}
                  <div style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 18, letterSpacing: 3, marginTop: 12, fontWeight: 500 }}>
                    {"\u2022\u2022\u2022\u2022"} {"\u2022\u2022\u2022\u2022"} {"\u2022\u2022\u2022\u2022"} {c.last4 || "0000"}
                  </div>
                  {/* Bottom row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>VALID THRU</div>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.05em" }}>{c.expiry || "\u2014"}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.05em", opacity: 0.9 }}>
                      {c.card_type?.includes("mc") ? "MASTERCARD" : "VISA"}
                    </div>
                  </div>
                  {/* Frozen overlay */}
                  {isFrozen && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
                      alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>FROZEN</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={badge(c.status, c.status === "active" ? GREEN : c.status === "frozen" ? BLUE : "#94A3B8")}>{c.status}</span>
                  <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Limit: {fmt(c.daily_limit || 0)}/day</span>
                </div>
                {c.spending_limit > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 600 }}>Spent this month: {fmt(c.spent_this_month || 0)} / {fmt(c.spending_limit)}</div>
                    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3 }}><div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: pct > 80 ? "#e74c3c" : "linear-gradient(90deg, #15B8C9, #2DBE60)", transition: "width 0.5s ease" }} /></div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={c.status === "active" ? btnAccent(GOLD, true) : btnAccent(GREEN, true)} onClick={() => toggle(c)} disabled={loading}>{c.status === "active" ? `🔒 ${t("banking.freeze")}` : `🔓 ${t("banking.unfreeze")}`}</button>
                  <button style={btnSecondary(true)} onClick={() => { setSelectedCard(c); setRevealCard(false); }}>360° View →</button>
                </div>
              </div>
            );
          })}
          {cards.length === 0 && <div style={{ ...cardStyle, color: "#94A3B8", textAlign: "center", fontSize: 15 }}>No cards yet. Apply for your first card above.</div>}
        </div>
      </div>
    );
  };

  const SendMoney = () => {
    const [tab, setTab] = useState<"ACH" | "Wire" | "Internal" | "Bill Pay">("ACH");
    const [f, setF] = useState<Record<string, string>>({});
    const [saveContact, setSaveContact] = useState(false);
    const update = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
    const contactSelect = (
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Saved Contacts</label>
        <select style={inputStyle} onChange={e => { const c = contacts.find(x => x.id === e.target.value); if (c) setF(p => ({ ...p, recipient: c.name, routing_number: c.routing_number || "", account_number: c.account_number || "", bank_name: c.bank_name || "", swift_code: c.swift_code || "" })); }}>
          <option value="">Select a contact...</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    );
    const wireFee = tab === "Wire" ? (f.swift_code ? 30 : 15) : 0;
    const submit = async () => {
      await post("send_transfer", { transfer_type: tab.toLowerCase().replace(" ", "_"), recipient_name: f.recipient || f.payee || "", amount: Number(f.amount), routing_number: f.routing_number, account_number: f.account_number, bank_name: f.bank_name, swift_code: f.swift_code, from_account: f.from_account, to_account: f.to_account, memo: f.memo, recurrence: f.recurrence, due_date: f.due_date, save_contact: saveContact });
      setF({});
    };
    const tabs: ("ACH" | "Wire" | "Internal" | "Bill Pay")[] = ["ACH", "Wire", "Internal", "Bill Pay"];
    return (
      <div style={{ ...cardStyle, animation: "slideUp 0.3s ease forwards" }}>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #F1F5F9" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => { setTab(t); setF({}); }} style={{
              padding: "12px 24px", border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
              color: tab === t ? "#15B8C9" : "#94A3B8",
              borderBottom: tab === t ? "3px solid #15B8C9" : "3px solid transparent",
              marginBottom: -2, transition: "all 0.2s ease", letterSpacing: "0.01em",
            }}>{t}</button>
          ))}
        </div>
        {contactSelect}
        {tab === "ACH" && (<div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><label style={labelStyle}>{t("banking.recipient")}</label><input style={inputStyle} value={f.recipient || ""} onChange={e => update("recipient", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.routingNumber")}</label><input style={inputStyle} value={f.routing_number || ""} onChange={e => update("routing_number", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.accountNumber")}</label><input style={inputStyle} value={f.account_number || ""} onChange={e => update("account_number", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.amount")}</label><input style={inputStyle} type="number" value={f.amount || ""} onChange={e => update("amount", e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>{t("banking.memo")}</label><input style={inputStyle} value={f.memo || ""} onChange={e => update("memo", e.target.value)} /></div>
        </div>)}
        {tab === "Wire" && (<div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><label style={labelStyle}>{t("banking.recipient")}</label><input style={inputStyle} value={f.recipient || ""} onChange={e => update("recipient", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.bankName")}</label><input style={inputStyle} value={f.bank_name || ""} onChange={e => update("bank_name", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.routingNumber")}</label><input style={inputStyle} value={f.routing_number || ""} onChange={e => update("routing_number", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.accountNumber")}</label><input style={inputStyle} value={f.account_number || ""} onChange={e => update("account_number", e.target.value)} /></div>
          <div><label style={labelStyle}>{t("banking.swiftCode")}</label><input style={inputStyle} value={f.swift_code || ""} onChange={e => update("swift_code", e.target.value)} placeholder={t("banking.leaveBlankDomestic")} /></div>
          <div><label style={labelStyle}>{t("banking.amount")}</label><input style={inputStyle} type="number" value={f.amount || ""} onChange={e => update("amount", e.target.value)} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>{t("banking.memo")}</label><input style={inputStyle} value={f.memo || ""} onChange={e => update("memo", e.target.value)} /></div>
        </div>)}
        {tab === "Internal" && (<div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><label style={labelStyle}>From Account</label><select style={inputStyle} value={f.from_account || ""} onChange={e => update("from_account", e.target.value)}><option value="">Select...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({fmt(a.balance)})</option>)}</select></div>
          <div><label style={labelStyle}>To Account</label><select style={inputStyle} value={f.to_account || ""} onChange={e => update("to_account", e.target.value)}><option value="">Select...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({fmt(a.balance)})</option>)}</select></div>
          <div><label style={labelStyle}>Amount</label><input style={inputStyle} type="number" value={f.amount || ""} onChange={e => update("amount", e.target.value)} /></div>
        </div>)}
        {tab === "Bill Pay" && (<div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><label style={labelStyle}>Payee</label><input style={inputStyle} value={f.payee || ""} onChange={e => update("payee", e.target.value)} /></div>
          <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={f.account_number || ""} onChange={e => update("account_number", e.target.value)} /></div>
          <div><label style={labelStyle}>Amount</label><input style={inputStyle} type="number" value={f.amount || ""} onChange={e => update("amount", e.target.value)} /></div>
          <div><label style={labelStyle}>Due Date</label><input style={inputStyle} type="date" value={f.due_date || ""} onChange={e => update("due_date", e.target.value)} /></div>
          <div><label style={labelStyle}>Recurrence</label><select style={inputStyle} value={f.recurrence || "once"} onChange={e => update("recurrence", e.target.value)}><option value="once">One-time</option><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div>
        </div>)}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {tab !== "Internal" && <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: "#64748B", fontWeight: 600 }}><input type="checkbox" checked={saveContact} onChange={e => setSaveContact(e.target.checked)} style={{ accentColor: BLUE }} /> Save recipient</label>}
            {wireFee > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>Wire fee: {fmt(wireFee)}</span>}
            {tab === "ACH" && <span style={{ fontSize: 13, color: GREEN, fontWeight: 700 }}>Free transfer</span>}
          </div>
          <button style={btnPrimary()} onClick={submit} disabled={loading || !f.amount}>{loading ? "Sending..." : `Send ${f.amount ? fmt(Number(f.amount)) : "Money"}`}</button>
        </div>
      </div>
    );
  };

  const TransactionsSection = () => {
    const [filter, setFilter] = useState("All");
    const [search, setSearch] = useState("");
    const filters = ["All", "Income", "Expenses", "Transfers", "Fees"];
    const typeFor = (t: { status?: string; description?: string; amount?: number; transfer_type?: string }) => {
      if ("transfer_type" in t) return t.transfer_type === "wire" ? "Wire" : "Transfer";
      const d = (t.description || "").toLowerCase();
      if (d.includes("fee")) return "Fee";
      return (t.amount || 0) >= 0 ? "Payment Received" : "Expense";
    };
    const typeColor: Record<string, string> = { "Payment Received": GREEN, Fee: "#e74c3c", Transfer: BLUE, Wire: PURPLE, Expense: "#e74c3c" };
    const iconBg: Record<string, string> = { "Payment Received": "#ECFDF5", Fee: "#FEF2F2", Transfer: "#EFF6FF", Wire: "#F3E8FF", Expense: "#FEF2F2" };
    const iconColor: Record<string, string> = { "Payment Received": GREEN, Fee: "#e74c3c", Transfer: BLUE, Wire: PURPLE, Expense: "#e74c3c" };
    const iconSymbol: Record<string, string> = { "Payment Received": "\u2193", Fee: "\u25CB", Transfer: "\u21C4", Wire: "\u21C4", Expense: "\u2191" };
    const merged = [
      ...transactions.map(t => ({ id: t.id, date: t.date, description: t.description || t.customer, type: typeFor(t), amount: t.amount })),
      ...transfers.map(t => ({ id: t.id, date: t.created_at, description: `${t.transfer_type?.toUpperCase()} to ${t.recipient_name}${t.fee ? ` (fee: ${fmt(t.fee)})` : ""}`, type: typeFor(t), amount: -t.amount })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const filtered = merged.filter(t => {
      if (filter === "Income") return t.amount >= 0 && t.type === "Payment Received";
      if (filter === "Expenses") return t.amount < 0 && t.type !== "Fee" && t.type !== "Transfer" && t.type !== "Wire";
      if (filter === "Transfers") return t.type === "Transfer" || t.type === "Wire";
      if (filter === "Fees") return t.type === "Fee";
      return true;
    }).filter(t => !search || t.description?.toLowerCase().includes(search.toLowerCase()));
    let running = netBalance;
    const rows = filtered.slice(0, 50).map(t => { const bal = running; running -= t.amount; return { ...t, balance: bal }; });
    return (
      <div style={{ ...cardStyle, animation: "slideUp 0.3s ease forwards" }}>
        <div className="bp-filter-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{filters.map(fl => (
            <button key={fl} onClick={() => setFilter(fl)} style={{
              padding: "8px 18px", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 12,
              background: filter === fl ? "linear-gradient(135deg, #15B8C9, #7B4FBF)" : "#F1F5F9",
              color: filter === fl ? "#fff" : "#64748B",
              transition: "all 0.2s ease", letterSpacing: "0.02em",
            }}>{fl}</button>
          ))}</div>
          <input className="bp-search-input" style={{ ...inputStyle, width: 260, height: 42 }} placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="bp-tx-table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #F1F5F9" }}>
                {["", "Date", "Description", "Type", "Amount", "Balance"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontWeight: 700, color: "#94A3B8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #F8FAFC", background: i % 2 === 0 ? "#fff" : "#FAFBFC", height: 56, transition: "background 0.15s ease" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFBFC")}
                >
                  <td style={{ padding: "10px 14px", width: 50 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: iconBg[r.type] || "#F1F5F9",
                      color: iconColor[r.type] || "#64748B",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 900,
                    }}>{iconSymbol[r.type] || "\u25CB"}</div>
                  </td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#0F172A", fontWeight: 500 }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 14px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", color: "#0F172A" }}>{r.description}</td>
                  <td style={{ padding: "10px 14px" }}><span style={badge(r.type, typeColor[r.type] || "#94A3B8")}>{r.type}</span></td>
                  <td style={{ padding: "10px 14px", fontWeight: 900, color: r.amount >= 0 ? GREEN : "#e74c3c", letterSpacing: "-0.02em", fontSize: 15 }}>{r.amount >= 0 ? "+" : ""}{fmt(r.amount)}</td>
                  <td style={{ padding: "10px 14px", color: "#94A3B8", fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 13 }}>{fmt(r.balance)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 15 }}>No transactions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const FeeSchedule = () => (
    <div style={{ ...cardStyle, animation: "slideUp 0.3s ease forwards" }}>
      <h3 style={{ margin: "0 0 22px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{t("banking.feeSchedule")}</h3>
      <div className="bp-fee-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {FEES_DATA.map(([name, amount], i) => (
          <div key={name} style={{
            display: "flex", justifyContent: "space-between", padding: "16px 20px",
            background: i % 2 === 0 ? "#FAFBFC" : "#fff", borderBottom: "1px solid #F1F5F9",
            borderRadius: i === 0 ? "10px 0 0 0" : i === 1 ? "0 10px 0 0" : 0,
          }}>
            <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>{name}</span>
            <span style={{ fontWeight: 900, color: amount === "Free" ? GREEN : "#0F172A", letterSpacing: "-0.02em" }}>{amount}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const MoneyFlow = () => (
    <div style={{ ...cardStyle, animation: "slideUp 0.3s ease forwards" }}>
      <h3 style={{ margin: "0 0 28px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{t("banking.moneyFlow")}</h3>
      <div className="bp-money-flow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap", padding: "24px 0" }}>
        {[
          { label: "Customer", sub: "Payment initiated", color: PURPLE, icon: "\uD83D\uDC64" },
          { label: "Card Network", sub: "Visa / Mastercard", color: GOLD, icon: "\uD83D\uDCB3" },
          { label: "Finix", sub: "Payment processor", color: BLUE, icon: "\u26A1" },
          { label: "ZeniPay Fees", sub: `${fmt(zenipayFees)} collected`, color: "#e74c3c", icon: "\uD83D\uDCCA" },
          { label: "Your Account", sub: fmt(netBalance), color: GREEN, icon: "\uD83C\uDFE6" },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <div style={{ textAlign: "center", padding: "18px 24px", minWidth: 130, animation: `slideUp 0.3s ease forwards`, animationDelay: `${i * 0.1}s`, opacity: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: step.color + "14",
                border: `2px solid ${step.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px", fontSize: 28,
                transition: "transform 0.2s ease",
              }}>{step.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>{step.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: 500 }}>{step.sub}</div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ fontSize: 20, color: "#CBD5E1", padding: "0 4px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const Settings = () => {
    const [n, setN] = useState(notifs);
    const save = () => post("update_notifications", n);
    const Toggle = ({ k, label: lbl }: { k: keyof Notification; label: string }) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 15 }}>{lbl}</span>
        <div onClick={() => setN(p => ({ ...p, [k]: !p[k] }))} style={{
          width: 52, height: 28, borderRadius: 14,
          background: n[k] ? "linear-gradient(135deg, #15B8C9, #2DBE60)" : "#E2E8F0",
          cursor: "pointer", position: "relative", transition: "background 0.3s ease",
          boxShadow: n[k] ? "0 2px 8px rgba(21,184,201,0.3)" : "none",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 12, background: "#fff", position: "absolute", top: 2,
            left: n[k] ? 26 : 2, transition: "left 0.3s ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }} />
        </div>
      </div>
    );
    return (
      <div style={{ ...cardStyle, animation: "slideUp 0.3s ease forwards" }}>
        <h3 style={{ margin: "0 0 22px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Notification Settings</h3>
        <Toggle k="payment_received" label="Payment Received" />
        <Toggle k="payout_completed" label="Payout Completed" />
        <Toggle k="card_transaction" label="Card Transaction" />
        <Toggle k="weekly_summary" label="Weekly Summary" />
        <div className="bp-settings-grid" style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div><label style={labelStyle}>Large Transaction Threshold</label><input style={inputStyle} type="number" value={n.large_transaction_threshold} onChange={e => setN(p => ({ ...p, large_transaction_threshold: Number(e.target.value) }))} /></div>
          <div><label style={labelStyle}>Low Balance Threshold</label><input style={inputStyle} type="number" value={n.low_balance_threshold} onChange={e => setN(p => ({ ...p, low_balance_threshold: Number(e.target.value) }))} /></div>
        </div>
        <button style={{ ...btnPrimary(), marginTop: 22 }} onClick={save} disabled={loading}>{loading ? "Saving..." : "Save Settings"}</button>
      </div>
    );
  };

  const renderSection = () => {
    switch (section) {
      case "Overview": return <Overview />;
      case "Accounts": return <AccountsSection />;
      case "Cards": return <CardsSection />;
      case "Send Money": return <SendMoney />;
      case "Transactions": return <TransactionsSection />;
      case "Fee Schedule": return <FeeSchedule />;
      case "Money Flow": return <MoneyFlow />;
      case "Settings": return <Settings />;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: "100vh", background: "#FAFBFC" }}>
      <style>{CSS_ANIMATIONS}</style>
      <ToastContainer />
      {/* Header with ZeniPay signature gradient */}
      <div style={{
        background: "linear-gradient(135deg, #15B8C9 0%, #7B4FBF 50%, #E5247B 100%)",
        padding: "0", position: "relative",
      }}>
        <div className="bp-section-tabs" style={{
          display: "flex", gap: 4, padding: "14px 28px", overflowX: "auto",
          maxWidth: 1200, margin: "0 auto",
        }}>
          {SECTIONS.map(s => {
            const sectionLabel: Record<string, string> = {
              Overview: t("banking.overview"), Accounts: t("banking.accounts"), Cards: t("banking.cards"),
              "Send Money": t("banking.sendMoney"), Transactions: t("banking.transactions"),
              "Fee Schedule": t("banking.feeSchedule"), "Money Flow": t("banking.moneyFlow"), Settings: t("banking.settings"),
            };
            return (
            <button key={s} onClick={() => setSection(s)} style={{
              padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", letterSpacing: "0.01em",
              background: section === s ? "rgba(255,255,255,0.25)" : "transparent",
              color: "#fff",
              transition: "all 0.2s ease",
              backdropFilter: section === s ? "blur(8px)" : "none",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 15 }}>{SECTION_ICONS[s]}</span>
              {sectionLabel[s] || s}
            </button>
          );})}
        </div>
      </div>
      <div className="bp-content" style={{ padding: 28, maxWidth: 1140, margin: "0 auto" }}>
        {renderSection()}
      </div>

      {/* ═══ 360° CARD MODAL ═══ */}
      {selectedCard && (() => {
        const c = selectedCard;
        const isFrozen = c.status === "frozen";
        const linkedAcct = accounts.find(a => a.is_primary) || accounts[0];
        const fullNum = revealCard ? `4242 4242 4242 ${c.last4}` : `•••• •••• •••• ${c.last4}`;
        const cvv = revealCard ? "847" : "•••";

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "flex-end" }} onClick={() => setSelectedCard(null)}>
            <div className="bp-modal-panel" onClick={e => e.stopPropagation()} style={{ width: "min(680px,100vw)", height: "100vh", background: "#fff", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}>
              {/* Header with card gradient */}
              <div style={{ background: cardGradient(c), padding: "32px 28px", color: "white", position: "relative" }}>
                {isFrozen && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />}
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>360° Card View</p>
                      <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 22 }}>{c.card_type.replace(/_/g, " ").toUpperCase()}</h2>
                      <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{c.is_virtual ? "Virtual Card" : "Physical Card"} · {isFrozen ? "FROZEN" : "ACTIVE"}</p>
                    </div>
                    <button onClick={() => setSelectedCard(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10, width: 36, height: 36, color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                  {/* Large card number */}
                  <div style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 28, letterSpacing: 4, marginTop: 24, fontWeight: 600 }}>{fullNum}</div>
                  <div style={{ display: "flex", gap: 32, marginTop: 12 }}>
                    <div><div style={{ fontSize: 8, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>VALID THRU</div><div style={{ fontSize: 16, fontWeight: 700 }}>{c.expiry}</div></div>
                    <div><div style={{ fontSize: 8, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>CVV</div><div style={{ fontSize: 16, fontWeight: 700 }}>{cvv}</div></div>
                    <div><div style={{ fontSize: 8, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>NETWORK</div><div style={{ fontSize: 16, fontWeight: 700 }}>{c.card_type?.includes("mc") ? "MASTERCARD" : "VISA"}</div></div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Reveal / Hide */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setRevealCard(!revealCard); if (!revealCard) setTimeout(() => setRevealCard(false), 30000); }}
                    style={btnPrimary()}>{revealCard ? "🙈 Hide Card Details" : "👁 Reveal Full Number"}</button>
                  {revealCard && <button onClick={() => { navigator.clipboard.writeText(`4242424242424${c.last4}`); showToast("Card number copied!"); }} style={btnSecondary()}>📋 Copy Number</button>}
                </div>
                {revealCard && <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>Card details visible for 30 seconds for security.</div>}

                {/* Card Details */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>💳 Card Details</h3>
                  <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Card Number", v: fullNum },
                      { l: "Expiry Date", v: c.expiry },
                      { l: "CVV", v: cvv },
                      { l: "Card Type", v: c.card_type.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase()) },
                      { l: "Network", v: c.card_type?.includes("mc") ? "Mastercard" : "Visa" },
                      { l: "Card Format", v: c.is_virtual ? "Virtual" : "Physical" },
                      { l: "Status", v: c.status.charAt(0).toUpperCase() + c.status.slice(1) },
                      { l: "Daily Limit", v: fmt(c.daily_limit || 10000) },
                      { l: "Monthly Limit", v: fmt(c.spending_limit || 50000) },
                      { l: "Spent This Month", v: fmt(c.spent_this_month || 0) },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: r.l.includes("Number") || r.l === "CVV" ? "'SF Mono', monospace" : "inherit" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linked Account */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🏦 Linked Bank Account</h3>
                  {linkedAcct ? (
                    <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { l: "Account Name", v: linkedAcct.account_name },
                        { l: "Account Number", v: linkedAcct.account_number },
                        { l: "Routing Number", v: linkedAcct.routing_number || "812345678" },
                        { l: "Account Type", v: linkedAcct.account_type.replace(/_/g, " ").replace(/\b\w/g, (ch: string) => ch.toUpperCase()) },
                        { l: "Balance", v: fmt(Number(linkedAcct.balance) || 0) },
                        { l: "Currency", v: linkedAcct.currency || "USD" },
                      ].map(r => (
                        <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: r.l.includes("Number") ? "'SF Mono', monospace" : "inherit" }}>{r.v}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: "#94A3B8", fontSize: 13 }}>No linked account</p>}
                </div>

                {/* Bank Address */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🏛️ Issuing Bank</h3>
                  <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Bank Name", v: "Unit Financial Technologies" },
                      { l: "Bank Address", v: "1 Letterman Drive, San Francisco, CA 94129" },
                      { l: "FDIC Insured", v: "Yes — up to $250,000" },
                      { l: "SWIFT/BIC", v: "UNITUSXX" },
                      { l: "Powered By", v: "ZeniPay + Unit.co" },
                      { l: "Card Processor", v: c.card_type?.includes("mc") ? "Mastercard Worldwide" : "Visa Inc." },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Merchant Info */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🏢 Cardholder</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Cardholder Name", v: businessName },
                      { l: "Merchant ID", v: merchantId },
                      { l: "Account Balance", v: fmt(platformBalance) },
                      { l: "Member Since", v: linkedAcct?.created_at ? new Date(linkedAcct.created_at).toLocaleDateString() : "2026" },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {c.status === "active" ? (
                    <button onClick={async () => { await post("toggle_card", { card_id: c.id, freeze: true }); setSelectedCard(null); }} style={btnAccent("#DC2626")}>🔒 Freeze Card</button>
                  ) : (
                    <button onClick={async () => { await post("toggle_card", { card_id: c.id, freeze: false }); setSelectedCard(null); }} style={btnAccent(GREEN)}>🔓 Unfreeze Card</button>
                  )}
                  <button onClick={() => { setSelectedCard(null); setSection("Send Money"); }} style={btnPrimary()}>💸 Send Money</button>
                  <button onClick={() => { setSelectedCard(null); setSection("Transactions"); }} style={btnSecondary()}>📋 Transactions</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ 360° ACCOUNT MODAL ═══ */}
      {selectedAccount && (() => {
        const a = selectedAccount;
        const typeColor = ACCT_COLORS[a.account_type] || BLUE;
        const acctTxns = transactions.filter(() => true).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 10);
        const acctTransfers = transfers.filter(t => t.status !== "failed").slice(0, 5);
        const thisMonthTxns = transactions.filter(t => { const d = new Date(t.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (t.status === "succeeded" || t.status === "completed"); });
        const monthlyVolume = thisMonthTxns.reduce((s, t) => s + Number(t.amount), 0);
        const monthlyFees = monthlyVolume * 0.029 + thisMonthTxns.length * 0.30;
        const monthlyNet = monthlyVolume - monthlyFees;

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "flex-end" }} onClick={() => setSelectedAccount(null)}>
            <div className="bp-modal-panel" onClick={e => e.stopPropagation()} style={{ width: "min(680px,100vw)", height: "100vh", background: "#fff", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}>
              {/* Header */}
              <div style={{ background: ACCT_GRADIENTS[a.account_type] || `linear-gradient(135deg, ${BLUE}, ${PURPLE})`, padding: "32px 28px", color: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>360° Account View</p>
                    <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: 24 }}>{a.account_name}</h2>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{businessName} · {a.account_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                  </div>
                  <button onClick={() => setSelectedAccount(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10, width: 36, height: 36, color: "white", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
                <p style={{ margin: "20px 0 0", fontWeight: 900, fontSize: 42, letterSpacing: "-2px" }}>{fmt(Number(a.balance) || 0)}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.6 }}>Available Balance · {a.currency || "USD"}</p>
              </div>

              <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Account Details */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🏦 Account Details</h3>
                  <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Account Number", v: a.account_number || "—" },
                      { l: "Routing Number", v: a.routing_number || "812345678" },
                      { l: "Account Type", v: a.account_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) },
                      { l: "Currency", v: a.currency || "USD" },
                      { l: "Status", v: a.status.charAt(0).toUpperCase() + a.status.slice(1) },
                      { l: "Primary Account", v: a.is_primary ? "Yes" : "No" },
                      { l: "Interest Rate", v: a.account_type.includes("savings") ? "0.5% APY" : "N/A" },
                      { l: "Opened", v: a.created_at ? new Date(a.created_at).toLocaleDateString() : "—" },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", fontFamily: r.l.includes("Number") ? "'SF Mono', monospace" : "inherit" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Merchant Info */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🏢 Merchant Information</h3>
                  <div className="bp-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Business Name", v: businessName },
                      { l: "Merchant ID", v: merchantId },
                      { l: "Gross Revenue", v: fmt(grossRevenue) },
                      { l: "ZeniPay Fees", v: fmt(zenipayFees) },
                      { l: "Net Revenue", v: fmt(platformBalance) },
                      { l: "Total Transactions", v: String(transactions.length) },
                    ].map(r => (
                      <div key={r.l} style={{ padding: "10px 14px", background: "#FAFBFC", borderRadius: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* This Month */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>📊 This Month</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                      { l: "Volume", v: fmt(monthlyVolume), c: GREEN },
                      { l: "Fees", v: fmt(monthlyFees), c: GOLD },
                      { l: "Net", v: fmt(monthlyNet), c: typeColor },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: "center", padding: "16px 12px", background: "#FAFBFC", borderRadius: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: s.c, letterSpacing: "-0.02em" }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4, fontWeight: 700, textTransform: "uppercase" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={{ ...cardStyle }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>📋 Recent Activity</h3>
                  {acctTxns.length === 0 && acctTransfers.length === 0 ? (
                    <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No activity yet</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {acctTxns.map(t => (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{t.customer}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: GREEN, fontFamily: "monospace" }}>+{fmt(t.amount)}</div>
                        </div>
                      ))}
                      {acctTransfers.map(t => (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{t.transfer_type.toUpperCase()} to {t.recipient_name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{new Date(t.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#DC2626", fontFamily: "monospace" }}>-{fmt(Number(t.amount) + Number(t.fee))}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setSelectedAccount(null); setSection("Send Money"); }} style={btnPrimary()}>💸 Send Money</button>
                  <button onClick={() => { setSelectedAccount(null); setSection("Transactions"); }} style={btnSecondary()}>📋 View All Transactions</button>
                  {a.status === "active" ? (
                    <button onClick={async () => { await post("freeze_account", { account_id: a.id, freeze: true }); setSelectedAccount(null); }} style={btnAccent("#DC2626", true)}>🔒 Freeze</button>
                  ) : (
                    <button onClick={async () => { await post("freeze_account", { account_id: a.id, freeze: false }); setSelectedAccount(null); }} style={btnAccent(GREEN, true)}>🔓 Unfreeze</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
