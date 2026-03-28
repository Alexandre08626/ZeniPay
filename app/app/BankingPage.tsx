"use client";
import React, { useState, useEffect, useCallback } from "react";

const BLUE = "#15B8C9";
const GREEN = "#2DBE60";
const PURPLE = "#7B4FBF";
const GOLD = "#F5A623";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Account = { id: string; merchant_id: string; account_type: string; account_name: string; account_number: string; routing_number: string; balance: number; status: string; is_primary: boolean };
type Transfer = { id: string; transfer_type: string; recipient_name: string; amount: number; fee: number; status: string; memo: string; created_at: string };
type Card = { id: string; card_type: string; last4: string; expiry: string; status: string; is_virtual: boolean; is_physical: boolean; spending_limit: number; daily_limit: number };

interface BankingProps {
  platformBalance: number;
  grossRevenue: number;
  zenipayFees: number;
  paidOut: number;
  pending: number;
  transactions: { id: string; customer: string; amount: number; status: string; date: string; description?: string; booking?: string; card_brand?: string; card_last4?: string; currency?: string; method?: string; gateway?: string }[];
  unitCards: { id: string; last4?: string; expiry?: string; status?: string; attributes: { last4Digits?: string; expirationDate?: string; status?: string } }[];
  onTabChange: (tab: string) => void;
  businessName: string;
  merchantId: string;
}

export default function BankingPage({ platformBalance, grossRevenue, zenipayFees, paidOut, pending, transactions, onTabChange, businessName, merchantId }: BankingProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [section, setSection] = useState<string | null>(null);
  const [sendType, setSendType] = useState("ach");
  const [sendForm, setSendForm] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [newAcctType, setNewAcctType] = useState("");
  const [newAcctName, setNewAcctName] = useState("");
  const [creatingAcct, setCreatingAcct] = useState(false);
  const [cardType, setCardType] = useState("visa_debit");
  const [cardPhysical, setCardPhysical] = useState(false);
  const [cardAddr, setCardAddr] = useState("");
  const [applyingCard, setApplyingCard] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  const load = useCallback(() => {
    fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(merchantId)}`)
      .then(r => r.json())
      .then(d => {
        setAccounts(d.accounts || []);
        setTransfers(d.transfers || []);
        setCards(d.cards || []);
      }).catch(() => {});
  }, [merchantId]);

  useEffect(() => { load(); }, [load]);

  const primaryAcct = accounts.find(a => a.is_primary) || accounts[0];

  const api = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/zenipay/banking-ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: merchantId, ...body }) });
    return r.json();
  };

  const handleCreateAccount = async () => {
    if (!newAcctType) return;
    setCreatingAcct(true);
    await api({ action: "create_account", account_type: newAcctType, account_name: newAcctName || undefined });
    setCreatingAcct(false); setSection(null); setNewAcctType(""); setNewAcctName("");
    load();
  };

  const handleSend = async () => {
    setSending(true); setSendMsg("");
    const fee = sendType === "wire" ? (sendForm.swift ? 30 : 15) : sendType === "instant" ? Math.max(0.50, Number(sendForm.amount || 0) * 0.015) : 0;
    const res = await api({
      action: "send_transfer",
      from_account_id: primaryAcct?.id,
      transfer_type: sendType,
      recipient_name: sendForm.recipient || "",
      recipient_routing: sendForm.routing || "",
      recipient_account: sendForm.account || "",
      recipient_bank: sendForm.bank || "",
      recipient_swift: sendForm.swift || "",
      amount: Number(sendForm.amount || 0),
      memo: sendForm.memo || "",
      to_account_id: sendForm.to_account || "",
      scheduled_date: sendForm.date || null,
      recurrence: sendForm.recurrence || "one_time",
    });
    setSending(false);
    if (res.ok) { setSendMsg(`Sent ${fmt(Number(sendForm.amount))}${res.fee > 0 ? ` (fee: ${fmt(res.fee)})` : ""}`); setSendForm({}); load(); }
    else setSendMsg(res.error || "Failed");
  };

  const handleApplyCard = async () => {
    setApplyingCard(true);
    await api({ action: "apply_card", card_type: cardType, is_physical: cardPhysical, account_id: primaryAcct?.id, shipping_address: cardPhysical ? { address: cardAddr } : {} });
    setApplyingCard(false); setSection(null);
    load();
  };

  // Banking-style transaction ledger
  const bankTxns = transactions.map(t => {
    const fee = Number(t.amount) * 0.029 + 0.30;
    return [
      { id: `${t.id}-in`, date: t.date, desc: `Payment from ${t.customer}`, type: "Payment Received", amount: Number(t.amount), positive: true, card: t.card_brand ? `${t.card_brand} ••••${t.card_last4}` : "" },
      { id: `${t.id}-fee`, date: t.date, desc: `ZeniPay fee — ${t.id}`, type: "Fee", amount: fee, positive: false, card: "" },
    ];
  }).flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add transfers to ledger
  for (const tr of transfers) {
    bankTxns.push({ id: tr.id, date: tr.created_at, desc: `${tr.transfer_type.toUpperCase()} to ${tr.recipient_name}`, type: "Transfer", amount: Number(tr.amount) + Number(tr.fee), positive: false, card: "" });
  }
  bankTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let runBal = platformBalance;
  for (const tx of bankTxns) { (tx as Record<string, unknown>).balance = runBal; runBal += tx.positive ? -tx.amount : tx.amount; }

  const filteredTxns = bankTxns.filter(tx => {
    if (txFilter === "income" && !tx.positive) return false;
    if (txFilter === "expenses" && tx.positive) return false;
    if (txSearch && !tx.desc.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  });

  const ACCT_TYPES = [
    { id: "business_checking", name: "Business Checking", sub: "$0/month", icon: "🏦" },
    { id: "business_savings", name: "Business Savings", sub: "0.5% APY", icon: "💰" },
    { id: "personal_checking", name: "Personal Checking", sub: "$0/month", icon: "👤" },
    { id: "personal_savings", name: "Personal Savings", sub: "0.5% APY", icon: "🐷" },
  ];

  const SEND_TYPES = [
    { id: "ach", label: "🏦 ACH", sub: "1-3 days · Free" },
    { id: "wire", label: "⚡ Wire", sub: "Same day · $15-30" },
    { id: "internal", label: "↔️ Internal", sub: "Instant · Free" },
    { id: "bill_pay", label: "📄 Bill Pay", sub: "Scheduled" },
  ];

  const StatusBadge = ({ s }: { s: string }) => {
    const m: Record<string, { bg: string; co: string }> = { active: { bg: "#f0fdf4", co: GREEN }, processing: { bg: "#fffbeb", co: "#D97706" }, completed: { bg: "#f0fdf4", co: GREEN }, pending: { bg: "#fffbeb", co: "#D97706" }, scheduled: { bg: "#eff6ff", co: BLUE }, failed: { bg: "#fef2f2", co: "#DC2626" }, frozen: { bg: "#fef2f2", co: "#DC2626" }, applied: { bg: "#eff6ff", co: BLUE }, shipped: { bg: "#fffbeb", co: GOLD } };
    const st = m[s] || m.pending;
    return <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", background: st.bg, color: st.co, textTransform: "capitalize" }}>{s}</span>;
  };

  const Input = ({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5, letterSpacing: "0.04em" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || "text"} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ═══ 1. ACCOUNT OVERVIEW ═══ */}
      <div style={{ background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)", borderRadius: 24, padding: "32px 36px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,190,96,0.12) 0%,transparent 70%)" }} />
        <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>{businessName} — Available Balance</p>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 48, letterSpacing: "-2px", lineHeight: 1 }}>{fmt(platformBalance)}</p>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.5 }}>Pending <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(pending)}</span></span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>Paid Out <span style={{ color: PURPLE, fontWeight: 700 }}>{fmt(paidOut)}</span></span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          {[
            { label: "💸 Send Money", act: "send" }, { label: "📥 Request Money", act: "request" },
            { label: "💳 Cards", act: "cards" }, { label: "📄 Statements", act: "statements" },
          ].map(b => (
            <button key={b.act} onClick={() => setSection(section === b.act ? null : b.act)} style={{ background: section === b.act ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, padding: "10px 18px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{b.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 1, marginTop: 18, background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          {[{ l: "Gross Revenue", v: fmt(grossRevenue), c: GREEN }, { l: "ZeniPay Fees", v: `- ${fmt(zenipayFees)}`, c: GOLD }, { l: "Net Available", v: fmt(platformBalance), c: BLUE }].map((s, i) => (
            <div key={s.l} style={{ flex: 1, padding: "11px 14px", textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, opacity: 0.4, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 2. ACCOUNTS ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>🏦 Accounts</h3>
          <button onClick={() => setSection(section === "new_account" ? null : "new_account")} style={{ background: `${BLUE}12`, border: `1px solid ${BLUE}30`, borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: BLUE, cursor: "pointer" }}>+ Open New Account</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {accounts.map(a => (
            <div key={a.id} style={{ borderRadius: 16, padding: "20px 22px", border: a.is_primary ? `2px solid ${BLUE}40` : "1px solid #e2e8f0", background: a.is_primary ? `${BLUE}06` : "#fafafa" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.account_name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>••••{a.account_number.slice(-4)} · {a.routing_number}</p>
                </div>
                <StatusBadge s={a.status} />
              </div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 26, color: "#0f172a" }}>{fmt(Number(a.balance))}</p>
            </div>
          ))}
          {accounts.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>No accounts yet. Click &quot;+ Open New Account&quot; to get started.</p>}
        </div>
        {/* New Account Modal */}
        {section === "new_account" && (
          <div style={{ marginTop: 18, background: "#f8fafc", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 14px", fontWeight: 800, fontSize: 15 }}>Open New Account</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
              {ACCT_TYPES.filter(at => !accounts.some(a => a.account_type === at.id)).map(at => (
                <button key={at.id} onClick={() => { setNewAcctType(at.id); setNewAcctName(at.name); }}
                  style={{ padding: "16px 18px", borderRadius: 12, border: newAcctType === at.id ? `2px solid ${BLUE}` : "1px solid #e2e8f0", background: newAcctType === at.id ? `${BLUE}08` : "white", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 22 }}>{at.icon}</span>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6, color: newAcctType === at.id ? BLUE : "#0f172a" }}>{at.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{at.sub}</div>
                </button>
              ))}
            </div>
            {newAcctType && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input label="ACCOUNT NAME (optional)" value={newAcctName} onChange={setNewAcctName} placeholder="My Savings" />
                </div>
                <button onClick={handleCreateAccount} disabled={creatingAcct} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", height: 44 }}>
                  {creatingAcct ? "Creating..." : "Open Account"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 3. SEND MONEY ═══ */}
      {section === "send" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>💸 Send Money</h3>
            <button onClick={() => setSection(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {SEND_TYPES.map(m => (
              <button key={m.id} onClick={() => { setSendType(m.id); setSendForm({}); setSendMsg(""); }}
                style={{ flex: 1, padding: "14px 12px", borderRadius: 12, border: sendType === m.id ? `2px solid ${BLUE}` : "1px solid #e2e8f0", background: sendType === m.id ? `${BLUE}08` : "white", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: sendType === m.id ? BLUE : "#374151" }}>{m.label}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{m.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {sendType === "ach" && <>
              <Input label="RECIPIENT NAME" value={sendForm.recipient || ""} onChange={v => setSendForm(p => ({ ...p, recipient: v }))} placeholder="John Smith" />
              <Input label="AMOUNT" value={sendForm.amount || ""} onChange={v => setSendForm(p => ({ ...p, amount: v }))} placeholder="0.00" type="number" />
              <Input label="ROUTING NUMBER" value={sendForm.routing || ""} onChange={v => setSendForm(p => ({ ...p, routing: v }))} placeholder="021000021" />
              <Input label="ACCOUNT NUMBER" value={sendForm.account || ""} onChange={v => setSendForm(p => ({ ...p, account: v }))} placeholder="1234567890" />
            </>}
            {sendType === "wire" && <>
              <Input label="RECIPIENT NAME" value={sendForm.recipient || ""} onChange={v => setSendForm(p => ({ ...p, recipient: v }))} placeholder="John Smith" />
              <Input label="BANK NAME" value={sendForm.bank || ""} onChange={v => setSendForm(p => ({ ...p, bank: v }))} placeholder="Chase Bank" />
              <Input label="ROUTING (ABA)" value={sendForm.routing || ""} onChange={v => setSendForm(p => ({ ...p, routing: v }))} placeholder="021000021" />
              <Input label="ACCOUNT NUMBER" value={sendForm.account || ""} onChange={v => setSendForm(p => ({ ...p, account: v }))} placeholder="1234567890" />
              <Input label="SWIFT (international)" value={sendForm.swift || ""} onChange={v => setSendForm(p => ({ ...p, swift: v }))} placeholder="Optional" />
              <Input label="AMOUNT" value={sendForm.amount || ""} onChange={v => setSendForm(p => ({ ...p, amount: v }))} placeholder="0.00" type="number" />
            </>}
            {sendType === "internal" && <>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5 }}>FROM ACCOUNT</label>
                <select value={sendForm.from_account || primaryAcct?.id || ""} onChange={e => setSendForm(p => ({ ...p, from_account: e.target.value }))} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({fmt(Number(a.balance))})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5 }}>TO ACCOUNT</label>
                <select value={sendForm.to_account || ""} onChange={e => setSendForm(p => ({ ...p, to_account: e.target.value }))} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}>
                  <option value="">Select account</option>
                  {accounts.filter(a => a.id !== (sendForm.from_account || primaryAcct?.id)).map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <Input label="AMOUNT" value={sendForm.amount || ""} onChange={v => setSendForm(p => ({ ...p, amount: v }))} placeholder="0.00" type="number" />
            </>}
            {sendType === "bill_pay" && <>
              <Input label="PAYEE NAME" value={sendForm.recipient || ""} onChange={v => setSendForm(p => ({ ...p, recipient: v }))} placeholder="Electric Company" />
              <Input label="ACCOUNT NUMBER" value={sendForm.account || ""} onChange={v => setSendForm(p => ({ ...p, account: v }))} placeholder="Payee acct #" />
              <Input label="AMOUNT" value={sendForm.amount || ""} onChange={v => setSendForm(p => ({ ...p, amount: v }))} placeholder="0.00" type="number" />
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5 }}>PAYMENT DATE</label>
                <input type="date" value={sendForm.date || ""} onChange={e => setSendForm(p => ({ ...p, date: e.target.value }))} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 5 }}>RECURRENCE</label>
                <select value={sendForm.recurrence || "one_time"} onChange={e => setSendForm(p => ({ ...p, recurrence: e.target.value }))} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}>
                  {["one_time", "weekly", "bi_weekly", "monthly"].map(r => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
            </>}
            <div style={{ gridColumn: "span 2" }}>
              <Input label="MEMO" value={sendForm.memo || ""} onChange={v => setSendForm(p => ({ ...p, memo: v }))} placeholder="Payment for..." />
            </div>
          </div>
          {sendType === "wire" && sendForm.amount && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
              Wire fee: {sendForm.swift ? "$30 (international)" : "$15 (domestic)"} · Total debit: {fmt(Number(sendForm.amount) + (sendForm.swift ? 30 : 15))}
            </div>
          )}
          {sendMsg && <div style={{ marginTop: 12, padding: "10px 14px", background: sendMsg.includes("Sent") ? "#f0fdf4" : "#fef2f2", borderRadius: 8, fontSize: 13, fontWeight: 700, color: sendMsg.includes("Sent") ? GREEN : "#DC2626" }}>{sendMsg}</div>}
          <button onClick={handleSend} disabled={sending || !sendForm.amount} style={{ marginTop: 14, padding: "14px 32px", borderRadius: 12, border: "none", background: sending || !sendForm.amount ? "#e2e8f0" : `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            {sending ? "Sending..." : `Send ${sendForm.amount ? fmt(Number(sendForm.amount)) : ""}`}
          </button>
        </div>
      )}

      {/* ═══ 4. REQUEST MONEY ═══ */}
      {section === "request" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📥 Request Money</h3>
            <button onClick={() => setSection(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { icon: "🔗", title: "Payment Link", desc: "Send a link to collect money instantly", act: () => onTabChange("paylinks") },
              { icon: "📄", title: "Invoice", desc: "Create and send a professional invoice", act: () => onTabChange("invoices") },
              { icon: "📱", title: "QR Code", desc: "Generate QR for in-person payments", act: () => onTabChange("paylinks") },
            ].map(o => (
              <button key={o.title} onClick={o.act} style={{ padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{o.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{o.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 5. CARDS ═══ */}
      {section === "cards" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>💳 Cards</h3>
            <button onClick={() => setSection(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
          {/* Existing cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 18 }}>
            {cards.map(c => (
              <div key={c.id} style={{ borderRadius: 16, padding: "18px 20px", border: "1px solid #e2e8f0", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{c.card_type.replace(/_/g, " ").toUpperCase()}</span>
                  <StatusBadge s={c.status} />
                </div>
                <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: 16, fontWeight: 700 }}>•••• •••• •••• {c.last4}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Exp {c.expiry} · {c.is_virtual ? "Virtual" : "Physical"} · Limit {fmt(c.spending_limit)}</p>
                {c.status === "active" && (
                  <button onClick={async () => { await api({ action: "toggle_card", card_id: c.id, freeze: true }); load(); }} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔒 Freeze Card</button>
                )}
                {c.status === "frozen" && (
                  <button onClick={async () => { await api({ action: "toggle_card", card_id: c.id, freeze: false }); load(); }} style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "none", background: "#f0fdf4", color: GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔓 Unfreeze</button>
                )}
              </div>
            ))}
          </div>
          {/* Apply for new card */}
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 14 }}>Apply for New Card</h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["visa_debit", "visa_credit", "mc_debit"].map(t => (
                <button key={t} onClick={() => setCardType(t)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: cardType === t ? `2px solid ${BLUE}` : "1px solid #e2e8f0", background: cardType === t ? `${BLUE}08` : "white", cursor: "pointer", fontSize: 13, fontWeight: 700, color: cardType === t ? BLUE : "#374151" }}>
                  {t === "visa_debit" ? "Visa Debit" : t === "visa_credit" ? "Visa Credit" : "Mastercard Debit"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={cardPhysical} onChange={e => setCardPhysical(e.target.checked)} /> Physical card ($10 fee)
              </label>
            </div>
            {cardPhysical && (
              <div style={{ marginBottom: 12 }}>
                <Input label="SHIPPING ADDRESS" value={cardAddr} onChange={setCardAddr} placeholder="123 Main St, Toronto, ON M5V 1A1" />
              </div>
            )}
            <button onClick={handleApplyCard} disabled={applyingCard} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              {applyingCard ? "Applying..." : `Apply for ${cardType === "visa_debit" ? "Visa Debit" : cardType === "visa_credit" ? "Visa Credit" : "MC Debit"}`}
            </button>
          </div>
        </div>
      )}

      {/* ═══ 6. STATEMENTS ═══ */}
      {section === "statements" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📄 Statements & Documents</h3>
            <button onClick={() => setSection(null)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {["March 2026", "February 2026", "January 2026"].map(m => (
              <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m} Statement</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Monthly · PDF</div>
                  </div>
                </div>
                <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", color: BLUE }}>📥 Download</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🧾</span>
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>2025 Tax Document (1099-K)</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Annual · PDF</div></div>
              </div>
              <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", color: BLUE }}>📥 Download</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 7. FEE SCHEDULE ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 15 }}>💰 ZeniPay Fee Schedule</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { l: "Account Maintenance", v: "FREE", g: true }, { l: "ACH Transfer", v: "FREE", g: true },
            { l: "Domestic Wire", v: "$15.00" }, { l: "International Wire", v: "$30.00" },
            { l: "Instant Payout", v: "1.5% (min $0.50)" }, { l: "Physical Card", v: "$10.00 one-time" },
            { l: "Card Replacement", v: "$5.00" }, { l: "Returned Payment", v: "$25.00" },
          ].map(f => (
            <div key={f.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#f8fafc" }}>
              <span style={{ fontSize: 13, color: "#374151" }}>{f.l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: (f as { g?: boolean }).g ? GREEN : "#374151" }}>{f.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 8. MONEY FLOW ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 15 }}>⚡ How Payments Flow</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { icon: "👤", label: "Customer Pays", sub: "Credit/Debit", color: "#6366f1" }, null,
            { icon: "🔄", label: "Card Network", sub: "Visa / MC", color: BLUE }, null,
            { icon: "💳", label: "Finix", sub: "Gateway", color: PURPLE }, null,
            { icon: "📊", label: "ZeniPay Fees", sub: "2.9% + $0.30", color: GOLD }, null,
            { icon: "🏦", label: "Your Account", sub: "Net deposited", color: GREEN },
          ].map((s, i) => s === null ? (
            <div key={i} style={{ fontSize: 18, color: "#cbd5e1", flexShrink: 0, padding: "0 6px" }}>→</div>
          ) : (
            <div key={i} style={{ flexShrink: 0, textAlign: "center", minWidth: 85 }}>
              <div style={{ width: 40, height: 40, background: `${s.color}12`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, margin: "0 auto 5px", border: `1px solid ${s.color}20` }}>{s.icon}</div>
              <p style={{ margin: "0 0 1px", fontWeight: 700, fontSize: 10, color: "#374151" }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 8, color: "#94a3b8" }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 9. TRANSACTION LEDGER ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📋 Transaction History</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>📥 CSV</button>
            <button style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>📄 PDF</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
          {["all", "income", "expenses"].map(f => (
            <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "6px 14px", borderRadius: 8, border: txFilter === f ? `1px solid ${BLUE}` : "1px solid #e2e8f0", background: txFilter === f ? `${BLUE}10` : "white", color: txFilter === f ? BLUE : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
          ))}
          <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search..." style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 180 }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "2px solid #f1f5f9" }}>
              {["Date", "Description", "Type", "Amount", "Balance"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredTxns.slice(0, 40).map(tx => (
                <tr key={tx.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "10px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td style={{ padding: "10px" }}><div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{tx.desc}</div>{tx.card && <div style={{ fontSize: 10, color: "#94a3b8" }}>{tx.card}</div>}</td>
                  <td style={{ padding: "10px" }}><span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: tx.positive ? `${GREEN}12` : "#fef2f2", color: tx.positive ? GREEN : "#DC2626" }}>{tx.type}</span></td>
                  <td style={{ padding: "10px", fontWeight: 700, color: tx.positive ? GREEN : "#DC2626", fontFamily: "monospace" }}>{tx.positive ? "+" : "-"}{fmt(tx.amount)}</td>
                  <td style={{ padding: "10px", fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{fmt((tx as Record<string, unknown>).balance as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTxns.length === 0 && <p style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>No transactions found</p>}
        </div>
      </div>
    </div>
  );
}
