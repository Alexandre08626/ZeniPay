"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const ZP_GREEN = "#2DBE60"; const ZP_CYAN = "#15B8C9"; const ZP_BLUE = "#2A8FE0"; const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E"; const DARK2 = "#111827"; const GLASS = "rgba(255,255,255,0.05)";
const NAV_LINKS = [{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }];

const SECTIONS = [
  {
    category: "Getting Started", color: ZP_GREEN, icon: "🚀",
    items: [
      { method: "GUIDE", path: "Quickstart", desc: "Accept your first sandbox payment in under 10 minutes. Step-by-step with code." },
      { method: "GUIDE", path: "Authentication", desc: "API keys, Bearer tokens, rotating keys, and IP allowlisting." },
      { method: "GUIDE", path: "Sandbox environment", desc: "Test cards, test bank accounts, and simulated events — no real money." },
      { method: "GUIDE", path: "Idempotency", desc: "How to use idempotency keys to safely retry requests." },
      { method: "GUIDE", path: "Error handling", desc: "Standard error codes, retry strategies, and how to handle declines." },
      { method: "GUIDE", path: "Webhooks setup", desc: "Register endpoints, verify signatures, and handle event retries." },
    ],
  },
  {
    category: "Payments API", color: ZP_CYAN, icon: "💳",
    items: [
      { method: "POST", path: "/v1/payments", desc: "Create a payment charge. Accepts card token, amount, currency, metadata." },
      { method: "GET", path: "/v1/payments/:id", desc: "Retrieve a single payment with full event history." },
      { method: "GET", path: "/v1/payments", desc: "List payments with filtering, pagination, and date ranges." },
      { method: "POST", path: "/v1/payments/:id/capture", desc: "Capture a previously authorized payment." },
      { method: "POST", path: "/v1/payments/:id/cancel", desc: "Cancel an uncaptured authorization." },
      { method: "POST", path: "/v1/refunds", desc: "Issue a full or partial refund on any succeeded payment." },
    ],
  },
  {
    category: "Payouts API", color: ZP_BLUE, icon: "💸",
    items: [
      { method: "POST", path: "/v1/payouts", desc: "Send a payout to a saved recipient. Specify rail: rtp, ach, wire." },
      { method: "POST", path: "/v1/payouts/batch", desc: "Send to multiple recipients in one call. Up to 10,000 per batch." },
      { method: "GET", path: "/v1/payouts/:id", desc: "Get payout status, estimated arrival, and IMAD/OMAD for wires." },
      { method: "GET", path: "/v1/payouts", desc: "List all payouts with status filter and date range." },
      { method: "POST", path: "/v1/recipients", desc: "Save a bank account as a verified recipient." },
      { method: "GET", path: "/v1/recipients", desc: "List all saved recipients with verification status." },
    ],
  },
  {
    category: "Wallets & Balances", color: ZP_PURPLE, icon: "👛",
    items: [
      { method: "GET", path: "/v1/wallets", desc: "List all wallets for your account with current balances." },
      { method: "POST", path: "/v1/wallets", desc: "Create a new wallet (Business, Escrow, Commission, Payout)." },
      { method: "GET", path: "/v1/wallets/:id/balance", desc: "Real-time available and pending balance." },
      { method: "GET", path: "/v1/wallets/:id/transactions", desc: "Full ledger with debit/credit entries and running balance." },
      { method: "POST", path: "/v1/transfers", desc: "Move funds between your own wallets instantly." },
    ],
  },
  {
    category: "Webhooks & Events", color: "#F5A623", icon: "📡",
    items: [
      { method: "POST", path: "/v1/webhooks", desc: "Register a new webhook endpoint with event filtering." },
      { method: "GET", path: "/v1/webhooks", desc: "List all registered webhook endpoints." },
      { method: "DELETE", path: "/v1/webhooks/:id", desc: "Unregister a webhook endpoint." },
      { method: "GET", path: "/v1/events", desc: "Browse all fired events with payload and delivery status." },
      { method: "POST", path: "/v1/events/:id/retry", desc: "Manually retry a failed event delivery." },
    ],
  },
];

const TEST_CARDS = [
  { number: "4242 4242 4242 4242", type: "Visa", result: "Succeeds" },
  { number: "4000 0000 0000 0002", type: "Visa", result: "Declined — card_declined" },
  { number: "4000 0025 0000 3155", type: "Visa", result: "3DS2 required" },
  { number: "5555 5555 5555 4444", type: "Mastercard", result: "Succeeds" },
  { number: "3782 822463 10005", type: "Amex", result: "Succeeds" },
  { number: "4000 0000 0000 9995", type: "Visa", result: "Insufficient funds" },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("Getting Started");
  const current = SECTIONS.find(s => s.category === activeSection)!;

  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <Link href="/" style={{ textDecoration: "none" }}><Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {NAV_LINKS.map(item => <Link key={item.label} href={item.href} style={{ color: item.label === "Docs" ? "#fff" : "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, fontWeight: item.label === "Docs" ? 700 : 500, borderBottom: item.label === "Docs" ? `2px solid ${ZP_BLUE}` : "2px solid transparent", paddingBottom: 2 }}>{item.label}</Link>)}
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 100, paddingBottom: 48, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(42,143,224,0.1) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(36px, 4.5vw, 58px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 16px", letterSpacing: "-1.5px" }}>
            API Reference
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, margin: "0 auto 28px", maxWidth: 500 }}>
            Clean REST API. Consistent patterns. Built for developers who move fast.
          </p>
          {/* Base URL */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontFamily: "monospace", fontSize: 14 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", fontFamily: "inherit" }}>Base URL</span>
            <span style={{ color: ZP_GREEN }}>https://</span><span style={{ color: "#e6edf3" }}>api.zenipay.ca/v1</span>
          </div>
        </div>
      </section>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", maxWidth: 1100, margin: "0 auto", padding: "0 5% 80px", gap: 32 }}>
        {/* Sidebar */}
        <div style={{ paddingTop: 16 }}>
          <div style={{ position: "sticky", top: 80 }}>
            {SECTIONS.map(s => (
              <button key={s.category} onClick={() => setActiveSection(s.category)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: activeSection === s.category ? s.color + "18" : "transparent", color: activeSection === s.category ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: activeSection === s.category ? 700 : 500, textAlign: "left", borderLeft: `2px solid ${activeSection === s.category ? s.color : "transparent"}`, marginBottom: 2 }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span>{s.category}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 28 }}>{current.icon}</span>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: current.color }}>{current.category}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 48 }}>
            {current.items.map(item => (
              <div key={item.path} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, flexShrink: 0, fontFamily: "monospace", letterSpacing: "0.04em",
                  background: item.method === "POST" ? "rgba(45,190,96,0.15)" : item.method === "GET" ? "rgba(42,143,224,0.15)" : item.method === "DELETE" ? "rgba(220,38,38,0.15)" : "rgba(123,79,191,0.15)",
                  color: item.method === "POST" ? ZP_GREEN : item.method === "GET" ? ZP_BLUE : item.method === "DELETE" ? "#ef4444" : ZP_PURPLE,
                  border: `1px solid ${item.method === "POST" ? ZP_GREEN + "33" : item.method === "GET" ? ZP_BLUE + "33" : item.method === "DELETE" ? "#ef444433" : ZP_PURPLE + "33"}`,
                }}>{item.method}</span>
                <div>
                  <code style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3", fontFamily: "monospace" }}>{item.path}</code>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Test cards (always shown) */}
          <div style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "24px 28px", marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px", color: ZP_CYAN }}>🧪 Sandbox test cards</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Card number", "Type", "Result"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TEST_CARDS.map(c => (
                    <tr key={c.number} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#e6edf3", fontSize: 13 }}>{c.number}</td>
                      <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{c.type}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ color: c.result === "Succeeds" ? ZP_GREEN : c.result.includes("3DS") ? ZP_CYAN : "#f59e0b", fontWeight: 600 }}>{c.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 14, marginBottom: 0 }}>Use any future expiry date and any 3-digit CVC in sandbox mode.</p>
          </div>

          {/* Curl example */}
          <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginLeft: 8 }}>curl example — create payment</span>
            </div>
            <div style={{ padding: "22px 28px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.9, overflowX: "auto" }}>
              <div><span style={{ color: "#ff7b72" }}>curl</span> -X POST https://api.zenipay.ca/v1/payments \</div>
              <div style={{ paddingLeft: 24 }}>-H <span style={{ color: "#a5d6ff" }}>&quot;Authorization: Bearer zpk_sb_your_key&quot;</span> \</div>
              <div style={{ paddingLeft: 24 }}>-H <span style={{ color: "#a5d6ff" }}>&quot;Content-Type: application/json&quot;</span> \</div>
              <div style={{ paddingLeft: 24 }}>-H <span style={{ color: "#a5d6ff" }}>&quot;Idempotency-Key: order-12345&quot;</span> \</div>
              <div style={{ paddingLeft: 24 }}>-d <span style={{ color: "#a5d6ff" }}>&apos;&#123;</span></div>
              <div style={{ paddingLeft: 48 }}><span style={{ color: "#a5d6ff" }}>&quot;amount&quot;: 4999,</span></div>
              <div style={{ paddingLeft: 48 }}><span style={{ color: "#a5d6ff" }}>&quot;currency&quot;: &quot;usd&quot;,</span></div>
              <div style={{ paddingLeft: 48 }}><span style={{ color: "#a5d6ff" }}>&quot;card_token&quot;: &quot;tok_sandbox_xxxx&quot;,</span></div>
              <div style={{ paddingLeft: 48 }}><span style={{ color: "#a5d6ff" }}>&quot;description&quot;: &quot;Order #12345&quot;</span></div>
              <div style={{ paddingLeft: 24 }}><span style={{ color: "#a5d6ff" }}>&#125;&apos;</span></div>
              <div style={{ marginTop: 16, color: "#8b949e" }}># 200 OK</div>
              <div style={{ color: "#a5d6ff" }}>&#123; &quot;id&quot;: <span style={{ color: ZP_GREEN }}>&quot;pay_3xK9mNpqr&quot;</span>, &quot;status&quot;: <span style={{ color: ZP_GREEN }}>&quot;succeeded&quot;</span>, &quot;amount&quot;: 4999 &#125;</div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ background: DARK2, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}><Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit: "contain" }} /></Link>
        <div style={{ display: "flex", gap: 24 }}>{NAV_LINKS.map(item => <Link key={item.label} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>)}</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>© 2026 ZeniPay Inc.</p>
      </footer>
    </div>
  );
}
