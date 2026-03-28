"use client";
import React, { useState } from "react";

const BLUE = "#15B8C9";
const GREEN = "#2DBE60";
const PURPLE = "#7B4FBF";
const GOLD = "#F5A623";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

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
}

export default function BankingPage({ platformBalance, grossRevenue, zenipayFees, paidOut, pending, transactions, unitCards, onTabChange, businessName }: BankingProps) {
  const [activeSection, setActiveSection] = useState<"overview" | "send" | "request" | "statements">("overview");
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [sendForm, setSendForm] = useState({ to: "", amount: "", memo: "", method: "ach" });
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);

  const card = unitCards[0];
  const netBalance = platformBalance;

  // Build banking transactions from real data (income + fees)
  const bankingTxns = transactions.map((t, i) => {
    const fee = Number(t.amount) * 0.029 + 0.30;
    return [
      { id: `${t.id}-in`, date: t.date, desc: `Payment from ${t.customer}`, type: "Payment Received", amount: Number(t.amount), balance: 0, positive: true, card: t.card_brand ? `${t.card_brand} ••••${t.card_last4}` : "" },
      { id: `${t.id}-fee`, date: t.date, desc: `ZeniPay fee — ${t.id}`, type: "Fee", amount: fee, balance: 0, positive: false, card: "" },
    ];
  }).flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate running balance
  let runBal = netBalance;
  for (const tx of bankingTxns) {
    tx.balance = runBal;
    runBal -= tx.positive ? tx.amount : -tx.amount;
  }

  const filteredTxns = bankingTxns.filter(tx => {
    if (txFilter === "income" && !tx.positive) return false;
    if (txFilter === "expenses" && tx.positive) return false;
    if (txSearch && !tx.desc.toLowerCase().includes(txSearch.toLowerCase()) && !tx.id.includes(txSearch)) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ═══ 1. ACCOUNT OVERVIEW ═══ */}
      <div style={{ background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)", borderRadius: 24, padding: "32px 36px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(45,190,96,0.12) 0%,transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>{businessName} — Available Balance</p>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 48, letterSpacing: "-2px", lineHeight: 1 }}>{fmt(netBalance)}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
              {[
                { l: "Pending", v: fmt(pending), c: GOLD },
                { l: "Paid Out", v: fmt(paidOut), c: PURPLE },
              ].map(s => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{s.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Quick Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "💸 Send Money", action: () => setActiveSection("send") },
              { label: "📥 Request Money", action: () => setActiveSection("request") },
              { label: "↔️ Transfer", action: () => setActiveSection("send") },
              { label: "📄 Statements", action: () => setActiveSection("statements") },
            ].map(b => (
              <button key={b.label} onClick={b.action} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10, padding: "10px 18px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        {/* Balance Breakdown */}
        <div style={{ display: "flex", gap: 1, marginTop: 20, background: "rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          {[
            { l: "Gross Revenue", v: fmt(grossRevenue), c: GREEN },
            { l: "ZeniPay Fees", v: `- ${fmt(zenipayFees)}`, c: GOLD },
            { l: "Net Available", v: fmt(netBalance), c: BLUE },
          ].map((s, i) => (
            <div key={s.l} style={{ flex: 1, padding: "12px 14px", textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, opacity: 0.4, marginTop: 3, letterSpacing: "0.08em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 2. ACCOUNTS ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>🏦 Accounts</h3>
          <button style={{ background: `${BLUE}12`, border: `1px solid ${BLUE}30`, borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: BLUE, cursor: "pointer" }}>+ Open New Account</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {[
            { name: "Business Checking", acct: "••••1847", balance: netBalance, type: "Primary", active: true },
            { name: "Business Savings", acct: "—", balance: 0, type: "Savings", active: false },
          ].map(a => (
            <div key={a.name} style={{ borderRadius: 16, padding: "20px 22px", border: a.active ? `2px solid ${BLUE}40` : "1px solid #e2e8f0", background: a.active ? `${BLUE}06` : "#fafafa" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{a.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{a.acct}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", background: a.active ? `${GREEN}15` : "#f1f5f9", color: a.active ? GREEN : "#94a3b8" }}>
                  {a.active ? "Active" : "Open"}
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 26, color: a.active ? "#0f172a" : "#cbd5e1" }}>{fmt(a.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 3. MONEY FLOW (Universal) ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 15 }}>⚡ How Payments Flow</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { icon: "👤", label: "Customer Pays", sub: "Credit/Debit Card", color: "#6366f1" },
            null,
            { icon: "🔄", label: "Card Network", sub: "Visa / Mastercard", color: BLUE },
            null,
            { icon: "💳", label: "Finix Processes", sub: "Payment Gateway", color: PURPLE },
            null,
            { icon: "📊", label: "ZeniPay Fees", sub: "2.9% + $0.30", color: GOLD },
            null,
            { icon: "🏦", label: "Your Account", sub: "Net deposited", color: GREEN },
          ].map((s, i) => s === null ? (
            <div key={i} style={{ fontSize: 18, color: "#cbd5e1", flexShrink: 0, padding: "0 6px" }}>→</div>
          ) : (
            <div key={i} style={{ flexShrink: 0, textAlign: "center", minWidth: 90 }}>
              <div style={{ width: 44, height: 44, background: `${s.color}12`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 6px", border: `1px solid ${s.color}20` }}>{s.icon}</div>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 11, color: "#374151" }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 9, color: "#94a3b8" }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 4. SEND MONEY ═══ */}
      {activeSection === "send" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>💸 Send Money</h3>
            <button onClick={() => setActiveSection("overview")} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕ Close</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "ach", label: "🏦 ACH Transfer", sub: "1-3 business days" },
              { id: "wire", label: "⚡ Wire Transfer", sub: "Same day" },
              { id: "internal", label: "↔️ Internal", sub: "Instant" },
              { id: "bill", label: "📄 Bill Pay", sub: "Scheduled" },
            ].map(m => (
              <button key={m.id} onClick={() => setSendForm(f => ({ ...f, method: m.id }))}
                style={{ flex: 1, padding: "14px 12px", borderRadius: 12, border: sendForm.method === m.id ? `2px solid ${BLUE}` : "1px solid #e2e8f0", background: sendForm.method === m.id ? `${BLUE}08` : "white", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: sendForm.method === m.id ? BLUE : "#374151" }}>{m.label}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{m.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "RECIPIENT", key: "to", ph: "Name or account number" },
              { label: "AMOUNT", key: "amount", ph: "0.00", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 6, letterSpacing: "0.04em" }}>{f.label}</label>
                <input value={sendForm[f.key as keyof typeof sendForm]} onChange={e => setSendForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph} type={f.type || "text"}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 6, letterSpacing: "0.04em" }}>MEMO</label>
              <input value={sendForm.memo} onChange={e => setSendForm(p => ({ ...p, memo: e.target.value }))}
                placeholder="Payment for..." style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>
          <button disabled={!sendForm.to || !sendForm.amount} style={{ marginTop: 16, padding: "14px 32px", borderRadius: 12, border: "none", background: !sendForm.to || !sendForm.amount ? "#e2e8f0" : `linear-gradient(135deg, ${GREEN}, ${BLUE})`, color: "white", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Send {sendForm.amount ? fmt(Number(sendForm.amount)) : ""}
          </button>
        </div>
      )}

      {/* ═══ 5. REQUEST MONEY ═══ */}
      {activeSection === "request" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📥 Request Money</h3>
            <button onClick={() => setActiveSection("overview")} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕ Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              { icon: "🔗", title: "Pay Link", desc: "Send a payment link to collect money", action: () => onTabChange("paylinks") },
              { icon: "📄", title: "Invoice", desc: "Create and send a professional invoice", action: () => onTabChange("invoices") },
              { icon: "📱", title: "QR Code", desc: "Generate a QR code for in-person payments", action: () => {} },
            ].map(o => (
              <button key={o.title} onClick={o.action} style={{ padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{o.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{o.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 6. RECENT TRANSACTIONS ═══ */}
      <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📋 Transactions</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>📥 Export CSV</button>
            <button style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#64748b" }}>📄 Export PDF</button>
          </div>
        </div>
        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
          {["all", "income", "expenses"].map(f => (
            <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "7px 16px", borderRadius: 8, border: txFilter === f ? `1px solid ${BLUE}` : "1px solid #e2e8f0", background: txFilter === f ? `${BLUE}10` : "white", color: txFilter === f ? BLUE : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
          <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search transactions..." style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, width: 220 }} />
        </div>
        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                {["Date", "Description", "Type", "Amount", "Balance"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTxns.slice(0, 30).map(tx => (
                <tr key={tx.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "12px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{tx.desc}</div>
                    {tx.card && <div style={{ fontSize: 10, color: "#94a3b8" }}>{tx.card}</div>}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", background: tx.positive ? `${GREEN}12` : "#fef2f2", color: tx.positive ? GREEN : "#DC2626" }}>{tx.type}</span>
                  </td>
                  <td style={{ padding: "12px", fontWeight: 700, color: tx.positive ? GREEN : "#DC2626", fontFamily: "monospace" }}>
                    {tx.positive ? "+" : "-"}{fmt(tx.amount)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{fmt(tx.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 7. DEBIT CARD ═══ */}
      {card && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 20px", fontWeight: 800, fontSize: 17 }}>💳 ZeniPay Debit Card</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Card visual */}
            <div style={{ width: "100%", aspectRatio: "1.586", borderRadius: 20, background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #2DBE60 80%, #15B8C9 100%)", position: "relative", overflow: "hidden", padding: "6% 7%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "white", boxShadow: "0 20px 50px rgba(45,190,96,0.3)", opacity: cardFrozen ? 0.5 : 1 }}>
              {cardFrozen && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, zIndex: 2 }}>🔒 FROZEN</div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>ZeniPay</div>
                  <div style={{ fontSize: 8, opacity: 0.6, letterSpacing: "0.1em", textTransform: "uppercase" }}>DEBIT · Unit.co</div>
                </div>
                <div style={{ width: 32, height: 24, borderRadius: 4, background: "linear-gradient(145deg,#c9a84c,#f2d76a,#b8900a)" }} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: "0.2em" }}>
                {showCardDetails ? "4242 4242 4242 " + (card.last4 || card.attributes?.last4Digits || "5050") : `•••• •••• •••• ${card.last4 || card.attributes?.last4Digits || "5050"}`}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 7, opacity: 0.5, letterSpacing: "0.1em" }}>VALID THRU</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{card.expiry || card.attributes?.expirationDate || "2030-03"}</div>
                </div>
                <div style={{ fontStyle: "italic", fontWeight: 900, fontSize: 14 }}>VISA</div>
              </div>
            </div>
            {/* Card controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>CARD STATUS</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cardFrozen ? "#DC2626" : GREEN }}>{cardFrozen ? "Frozen 🔒" : "Active ✅"}</div>
              </div>
              <button onClick={() => setShowCardDetails(!showCardDetails)} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: BLUE }}>
                {showCardDetails ? "🙈 Hide Card Details" : "👁 Reveal Card Details"}
              </button>
              <button onClick={() => setCardFrozen(!cardFrozen)} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: cardFrozen ? GREEN : "#fef2f2", fontWeight: 700, fontSize: 13, cursor: "pointer", color: cardFrozen ? "white" : "#DC2626" }}>
                {cardFrozen ? "🔓 Unfreeze Card" : "🔒 Freeze Card"}
              </button>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>SPENDING LIMITS</div>
                {[
                  { l: "Daily", v: "$10,000" },
                  { l: "Monthly", v: "$50,000" },
                  { l: "Per Transaction", v: "$25,000" },
                ].map(lim => (
                  <div key={lim.l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>{lim.l}</span>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>{lim.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 8. STATEMENTS ═══ */}
      {activeSection === "statements" && (
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>📄 Statements & Documents</h3>
            <button onClick={() => setActiveSection("overview")} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>✕ Close</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "March 2026 Statement", type: "Monthly", date: "Apr 1, 2026" },
              { label: "February 2026 Statement", type: "Monthly", date: "Mar 1, 2026" },
              { label: "2025 Annual Statement", type: "Annual", date: "Jan 15, 2026" },
              { label: "2025 Tax Document (1099-K)", type: "Tax", date: "Jan 31, 2026" },
            ].map(doc => (
              <div key={doc.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{doc.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.type} · Available {doc.date}</div>
                  </div>
                </div>
                <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", color: BLUE }}>
                  📥 Download PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
