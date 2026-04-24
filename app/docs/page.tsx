// /docs — public ZeniPay API documentation.

"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

const SECTIONS = [
  { id: "authentication", label: "Authentication" },
  { id: "agents", label: "Agents" },
  { id: "treasury", label: "Treasury" },
  { id: "cards", label: "Cards" },
  { id: "webhooks", label: "Webhooks" },
  { id: "errors", label: "Errors" },
];

export default function DocsPage() {
  return (
    <div style={{ background: zp.surface.bg1, minHeight: "100vh" }}>
      <MarketingNav />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 40 }} className="docs-grid">
          <Sidebar />
          <article style={{ minWidth: 0 }}>
            <Header />

            <Section id="authentication" title="Authentication" intro="Every ZeniPay API call is authenticated by a merchant API key. Create one in /app/settings → API Keys.">
              <p style={para}>
                Every API call must include a Bearer token in the <code style={inlineCode}>Authorization</code> header.
                Keys live in your merchant settings at{" "}
                <a href="/app/settings#api" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>/app/settings → API Keys</a>.
              </p>
              <Code code={`curl https://api.zenipay.ca/v1/agents \\
  -H "Authorization: Bearer zpk_live_<your_key>"`} />
              <h3 style={h3}>Test vs live keys</h3>
              <p style={para}>
                <code style={inlineCode}>zpk_test_</code> keys route to sandbox resources. <code style={inlineCode}>zpk_live_</code> keys touch real money.
                Build against test, promote to live when the flow is stable.
              </p>
            </Section>

            <Section id="agents" title="Agents" intro="Create, list, and manage AI agents. Each agent has a wallet with a balance, a policy, and a keypair signed by your org.">
              <Endpoint method="POST" path="/api/v1/agents" desc="Create a new agent." />
              <Code code={`curl -X POST https://api.zenipay.ca/v1/agents \\
  -H "Authorization: Bearer zpk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Marco",
    "agent_type": "sales",
    "description": "Qualifies inbound leads 24/7"
  }'`} />
              <Endpoint method="GET"   path="/api/v1/agents"        desc="List all agents in your org." />
              <Endpoint method="GET"   path="/api/v1/agents/:id"    desc="Fetch one agent + its wallet + policy." />
              <Endpoint method="PATCH" path="/api/v1/agents/:id"    desc="Update name / description / policy." />
            </Section>

            <Section id="treasury" title="Treasury" intro="Fund an org treasury and distribute to agents. Merchant → treasury transfers always land in the org wallet first; distribution to a specific agent is a separate action.">
              <Endpoint method="POST" path="/api/v1/agents/treasury/distribute-from-merchant" desc="Debit a ZeniPay account, credit the org treasury." />
              <Endpoint method="POST" path="/api/v1/agents/treasury/request-distribution"     desc="Smart wrapper around distribute-to-agent. Creates an approval request when a rule matches, otherwise executes immediately." />
              <Endpoint method="POST" path="/api/v1/agents/treasury/distribute-to-agent"      desc="Debit the org treasury, credit an agent wallet." />
              <Endpoint method="POST" path="/api/v1/agents/treasury/reclaim-from-agent"       desc="Reverse of distribute-to-agent. Debit agent wallet, credit treasury." />
              <Endpoint method="POST" path="/api/v1/agents/treasury/return-to-merchant"       desc="Debit the org treasury, credit a merchant ZeniPay account." />
              <Endpoint method="GET"  path="/api/v1/agents/treasury/events"                   desc="List funding events (card top-ups, ACH, wire, USDC)." />
              <Code code={`curl -X POST https://api.zenipay.ca/v1/agents/treasury/request-distribution \\
  -H "Authorization: Bearer zpk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to_agent_id": "agt_xxx",
    "amount_units": 250,
    "currency": "CAD",
    "idempotency_key": "ops-payroll-2026-05-01"
  }'`} />
            </Section>

            <Section id="cards" title="ZeniCards" intro="Issue virtual or physical cards for agents. Every authorization runs through the tamper-evident ZeniCore ledger.">
              <Endpoint method="POST"  path="/api/v1/agents/zenicards/issue"             desc="Issue a new card for an agent." />
              <Endpoint method="GET"   path="/api/v1/agents/zenicards"                   desc="List cards in your org." />
              <Endpoint method="PATCH" path="/api/v1/agents/zenicards/:id/status"        desc="Freeze, unfreeze, or cancel a card." />
            </Section>

            <Section id="webhooks" title="Webhooks" intro="Subscribe to events to keep your own systems in sync. Every payload is signed with your webhook secret.">
              <p style={para}>Events emitted:</p>
              <ul style={list}>
                <li><code style={inlineCode}>payment.completed</code> — customer payment settled.</li>
                <li><code style={inlineCode}>payout.sent</code> — withdrawal fired to an external destination.</li>
                <li><code style={inlineCode}>approval.requested</code> — merchant-rule approval pending.</li>
                <li><code style={inlineCode}>card.charged</code> — agent card authorized or settled.</li>
                <li><code style={inlineCode}>agent.funded</code> — agent wallet received funds from treasury.</li>
              </ul>
              <h3 style={h3}>Signature verification</h3>
              <Code code={`import { createHmac, timingSafeEqual } from "node:crypto";

async function verify(req: Request, secret: string): Promise<boolean> {
  const sig = req.headers.get("x-zp-signature") ?? "";
  const body = await req.text();
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}`} />
            </Section>

            <Section id="errors" title="Errors" intro="Every error response carries a stable { error: { code, message } } shape. Here are the codes you'll see most often.">
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr style={{ background: zp.surface.bg2 }}>
                    {["HTTP", "Code", "Meaning"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${zp.surface.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "invalid_request",   "Body is malformed or missing required fields."],
                    ["401", "unauthorized",      "API key missing, invalid, or revoked."],
                    ["403", "forbidden",         "Key lacks permission for this resource."],
                    ["404", "not_found",         "Resource doesn’t exist or you can’t see it."],
                    ["409", "conflict",          "State conflict — e.g. already approved."],
                    ["422", "validation_error", "Business-rule violation (insufficient funds, currency mismatch)."],
                    ["429", "rate_limited",     "Too many requests. Back off and retry."],
                    ["500", "internal_error",   "We broke something. Retry and tell us if it recurs."],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderTop: `1px solid ${zp.surface.border}` }}>
                      <td style={td}><code style={inlineCode}>{row[0]}</code></td>
                      <td style={{ ...td, fontFamily: zp.font.mono }}>{row[1]}</td>
                      <td style={{ ...td, color: zp.text.muted }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </article>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .docs-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Header() {
  return (
    <div style={{ marginBottom: 40 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: zp.weight.bold, color: zp.brand.violet, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Reference
      </p>
      <h1 style={{
        margin: "8px 0 10px", fontFamily: zp.font.display,
        fontSize: 40, fontWeight: zp.weight.semibold, color: zp.text.primary,
        letterSpacing: "-0.03em", lineHeight: 1.05,
      }}>
        API documentation
      </h1>
      <p style={{ margin: 0, fontSize: 15, color: zp.text.muted, maxWidth: 640 }}>
        Everything you need to integrate ZeniPay — accounts, agents, cards, treasury, approvals, webhooks.
      </p>
    </div>
  );
}

function Sidebar() {
  return (
    <aside style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{
        fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10,
      }}>On this page</div>
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} style={{
          display: "block", padding: "8px 10px", fontSize: 13,
          color: zp.text.primary, textDecoration: "none", borderRadius: 8,
          fontWeight: zp.weight.medium,
        }}>{s.label}</a>
      ))}
    </aside>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 40, marginBottom: 48 }}>
      <h2 style={{
        margin: "0 0 6px", fontFamily: zp.font.display, fontSize: 26,
        fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em",
      }}>{title}</h2>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: zp.text.muted }}>{intro}</p>
      {children}
    </section>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColor =
    method === "GET" ? "#2DBE60" :
    method === "POST" ? zp.brand.cyan :
    method === "PATCH" ? "#D97706" :
    method === "DELETE" ? "#DC2626" :
    zp.text.muted;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "center", padding: "10px 12px",
      border: `1px solid ${zp.surface.border}`, borderRadius: 10, marginBottom: 6,
      background: "#fff", flexWrap: "wrap",
    }}>
      <span style={{
        fontSize: 11, fontWeight: zp.weight.bold, color: methodColor,
        fontFamily: zp.font.mono, minWidth: 56,
      }}>{method}</span>
      <code style={{ ...inlineCode, fontSize: 13, padding: "3px 8px" }}>{path}</code>
      <span style={{ color: zp.text.muted, fontSize: 13, marginLeft: "auto" }}>{desc}</span>
    </div>
  );
}

function Code({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <pre style={{
        margin: 0, padding: "16px 18px", borderRadius: 12,
        background: "#0f172a", color: "#e5e7eb",
        fontFamily: zp.font.mono, fontSize: 12, lineHeight: 1.55,
        overflow: "auto",
      }}>{code}</pre>
      <button onClick={copy} aria-label="Copy" style={{
        position: "absolute", top: 10, right: 10,
        background: "rgba(255,255,255,0.08)", color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.1)",
        padding: "6px 8px", borderRadius: 8, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: zp.weight.semibold,
      }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

const para: React.CSSProperties = { fontSize: 14, color: zp.text.primary, margin: "0 0 12px", lineHeight: 1.6 };
const h3: React.CSSProperties = { margin: "20px 0 8px", fontFamily: zp.font.display, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary };
const list: React.CSSProperties = { margin: "0 0 12px 20px", fontSize: 14, lineHeight: 1.7, color: zp.text.primary };
const inlineCode: React.CSSProperties = { background: zp.surface.bg3, fontFamily: zp.font.mono, fontSize: 12, padding: "2px 6px", borderRadius: 6, color: zp.text.primary };
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: zp.text.primary };
