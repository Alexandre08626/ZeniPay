// /agents/overview — AI Agent Wallet marketing page.
//
// Public marketing (distinct from /agents/dashboard, the authenticated
// operator surface). Features the real DiceBear fleet, a code-snippet
// showcase, and a 3-step how-it-works flow. Uses the shared
// zenipay-brand tokens + the /public/agents/*.svg static avatars.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot, Zap, CheckSquare, BarChart2, Lock, Globe,
  UserPlus, ExternalLink, Copy, Check,
  type LucideIcon,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

const ROSTER: Array<{ name: string; role: string; bal?: string; status?: "active" | "idle" }> = [
  { name: "Marco", role: "Lead Hunter",         bal: "$1,240.00", status: "active" },
  { name: "Sofia", role: "Email Marketing",     bal: "$380.50",   status: "active" },
  { name: "Ben",   role: "Finance Agent",       bal: "$4,200.00", status: "active" },
  { name: "Luna",  role: "Voice & SMS",         bal: "$195.00",   status: "active" },
  { name: "Atlas", role: "Security Agent",      bal: "$890.00",   status: "active" },
  { name: "Mia",   role: "Social Media",        bal: "$320.00",   status: "idle"   },
  { name: "Leo",   role: "Analytics",           status: "active" },
  { name: "Rex",   role: "Platform Engineer",   status: "active" },
  { name: "Vera",  role: "Compliance & Risk",   status: "active" },
  { name: "Nova",  role: "Agent Success",       status: "active" },
  { name: "Kai",   role: "Revenue Intelligence", status: "active" },
];

export default function AgentsOverviewPage() {
  const router = useRouter();
  // Keep the pre-existing behaviour: logged-in merchants jump straight to
  // /app/overview instead of landing on marketing every time.
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("zp_client")) {
        router.replace("/app/overview");
      }
    } catch { /* ignore */ }
  }, [router]);

  return (
    <div style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <MarketingNav />
      <Hero />
      <FleetDemo />
      <FeaturesGrid />
      <HowItWorks />
      <CodeSnippet />
      <RosterShowcase />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <span aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(circle at 15% 10%, rgba(123,79,191,0.10) 0%, transparent 55%),
                     radial-gradient(circle at 85% 30%, rgba(21,184,201,0.07) 0%, transparent 50%)`,
      }} />
      <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "72px 24px 56px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "5px 12px",
          borderRadius: zp.radius.pill, background: zp.surface.bg2,
          border: `1px solid ${zp.surface.border}`, marginBottom: 24,
        }}>
          <span className="zp-brand-text" style={{ fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            AI Agent Infrastructure
          </span>
        </div>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(40px, 6vw, 72px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.035em", lineHeight: 1.02, color: zp.text.primary,
        }}>
          Your AI agents.
          <br />
          <span style={{ color: zp.brand.violet }}>Their own wallets.</span>
        </h1>

        <p style={{ margin: "22px auto 0", maxWidth: 640, fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
          Stop hard-coding credit cards into your AI agents. Give each one a
          real wallet, a spending limit, and a full audit trail — with zero
          Visa dependency.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <Link href="/register" style={primaryCta}>Get started</Link>
          <Link href="https://github.com/Alexandre08626/ZeniPay" target="_blank" rel="noreferrer" style={ghostCta}>
            <ExternalLink size={14} style={{ marginRight: 6 }} /> View API docs
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 28, flexWrap: "wrap", fontSize: 12, color: zp.text.dim }}>
          <TrustItem>Zero Visa dependency</TrustItem>
          <TrustItem>SHA-256 chain integrity</TrustItem>
          <TrustItem>Real-time approval flows</TrustItem>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: zp.brand.green, fontWeight: zp.weight.bold }}>✓</span>
      {children}
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function FleetDemo() {
  return (
    <section style={{ padding: "48px 24px 96px" }}>
      <div style={{
        maxWidth: 1160, margin: "0 auto",
        display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
        gap: 40, alignItems: "center",
      }} className="mk-fleet-grid">
        <FleetCard />
        <FloatingCard />
      </div>
      <style>{`
        @media (max-width: 960px) {
          .mk-fleet-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function FleetCard() {
  const visible = ROSTER.filter((a) => a.bal);
  const total = visible.reduce((s, a) => s + parseFloat((a.bal ?? "$0").replace(/[^0-9.]/g, "")), 0);

  return (
    <div style={{
      background: "#fff", borderRadius: zp.radius.xl, overflow: "hidden",
      boxShadow: "0 26px 60px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.06)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 22px", borderBottom: `1px solid ${zp.surface.border}`,
        background: zp.surface.bg2,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Your Agent Fleet</div>
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>ZeniCore · Live</div>
        </div>
        <button
          disabled
          style={{
            background: zp.gradient.main, color: "#fff", border: "none",
            padding: "8px 14px", borderRadius: zp.radius.sm,
            fontSize: 12, fontWeight: zp.weight.semibold,
            cursor: "default", letterSpacing: "0.02em",
          }}
        >
          + Issue card
        </button>
      </div>

      {visible.map((a) => (
        <FleetRow key={a.name} a={a} />
      ))}

      <div style={{
        padding: "16px 22px", background: zp.gradient.tintCyan,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: `2px solid ${zp.surface.border}`,
      }}>
        <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Total fleet balance
        </span>
        <span style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.brand.cyan, fontFamily: zp.font.sans }}>
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
        </span>
      </div>
    </div>
  );
}

function FleetRow({ a }: { a: { name: string; role: string; bal?: string; status?: "active" | "idle" } }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", overflow: "hidden",
        background: zp.surface.bg2, flexShrink: 0,
        boxShadow: `0 0 0 2px rgba(123,79,191,0.22)`,
      }}>
        <Image src={`/agents/${a.name.toLowerCase()}.svg`} alt={`${a.name} avatar`} width={40} height={40} style={{ width: 40, height: 40, objectFit: "cover" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{a.name}</div>
        <div style={{ fontSize: 11, color: zp.text.muted }}>{a.role}</div>
      </div>
      <div style={{ ...zp.amountStyle.base, fontFamily: zp.font.mono, fontSize: 13, color: zp.brand.violet, fontWeight: zp.weight.semibold }}>
        {a.bal}
      </div>
      <span style={{
        width: 9, height: 9, borderRadius: "50%",
        background: a.status === "active" ? zp.semantic.success : zp.surface.bg3,
        flexShrink: 0,
        boxShadow: a.status === "active" ? `0 0 0 3px ${zp.semantic.success}22` : "none",
      }} />
    </div>
  );
}

function FloatingCard() {
  return (
    <div style={{
      position: "relative", padding: "20px 0",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 340, minHeight: 212,
        borderRadius: 18, padding: "22px 22px",
        color: "#fff",
        background: `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 50%, ${zp.brand.violet} 100%)`,
        boxShadow: `0 30px 60px rgba(123,79,191,0.4), 0 0 0 1px rgba(255,255,255,0.1)`,
        transform: "rotate(-3deg)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        <span aria-hidden style={{ position: "absolute", right: -70, top: -70, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.15)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
              BEN AGENT
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Finance · $4,200 / month</div>
          </div>
          <Image src="/zenipay-logo-nobg.png" alt="" width={28} height={28} style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
        </div>
        <div style={{ fontFamily: zp.font.mono, fontSize: 22, letterSpacing: "0.14em", fontWeight: zp.weight.medium, position: "relative", zIndex: 1, marginTop: 28 }}>
          •••• •••• •••• 4821
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 1, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>Valid thru</div>
            <div style={{ fontSize: 13, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>12/28</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>
            ZeniPay · Visa
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function FeaturesGrid() {
  const features: Array<{ Icon: LucideIcon; title: string; body: string }> = [
    { Icon: Bot,         title: "Virtual card per agent",   body: "Each agent gets its own card with custom limits." },
    { Icon: Zap,         title: "Instant distribution",     body: "Fund your treasury once. Deploy anywhere in < 1s." },
    { Icon: CheckSquare, title: "Real-time approvals",      body: "Human-in-the-loop. Approve or block any transaction." },
    { Icon: BarChart2,   title: "GL auto-categorization",   body: "Every spend auto-tagged. QuickBooks & Xero ready." },
    { Icon: Lock,        title: "Immutable audit trail",    body: "SHA-256 chain hash. SOC2-ready out of the box." },
    { Icon: Globe,       title: "Multi-currency",           body: "USD, CAD, EUR. USDC coming soon." },
  ];
  return (
    <section style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 48 }}>
          <H2>Everything you need to run AI payments.</H2>
          <p style={{ ...bodyStyle, margin: "14px auto 0", maxWidth: 620 }}>
            Six primitives. One API. Built for enterprises.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: "22px 22px", borderRadius: zp.radius.lg,
              background: "#fff", border: `1px solid ${zp.surface.border}`,
              transition: zp.motion.base,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: zp.radius.md,
                background: zp.gradient.tintViolet, color: zp.brand.violet,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <f.Icon size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{f.title}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
        <H2>Deploy your first agent wallet in 3 steps.</H2>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            { Icon: UserPlus, title: "Connect your organization", body: "Sign up and link your corporate ZeniPay account." },
            { Icon: Bot,      title: "Create your agents",        body: "Name them, assign roles, set spending limits." },
            { Icon: Zap,      title: "Distribute and track",      body: "Fund once. Every move logged in ZeniCore." },
          ].map((s, i) => (
            <div key={s.title} style={{
              padding: "24px 22px", borderRadius: zp.radius.lg,
              background: "#fff", border: `1px solid ${zp.surface.border}`,
              textAlign: "left" as const,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: zp.radius.md,
                background: `linear-gradient(135deg, ${zp.brand.cyan} 0%, ${zp.brand.violet} 100%)`,
                color: "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <s.Icon size={18} />
              </div>
              <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
                Step {i + 1}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{s.title}</h3>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function CodeSnippet() {
  const [copied, setCopied] = useState(false);
  const body = `// Fund your agent in one API call
POST /api/v1/agents/treasury/distribute-from-merchant
{
  "to_agent_id":  "agt_marco",
  "amount_units": 500,
  "currency":     "USD",
  "memo":         "Monthly budget allocation"
}

// Response
{
  "success":             true,
  "agent_tx_group_id":   "txg_...",
  "new_agent_balance":   1740.00
}`;

  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 32 }}>
          <H2>For developers.</H2>
          <p style={{ ...bodyStyle, margin: "14px auto 0", maxWidth: 560 }}>
            One endpoint. One signed request. Every move lands on the
            ZeniCore ledger.
          </p>
        </div>

        <div style={{
          borderRadius: zp.radius.lg,
          background: zp.surface.heroInk, color: zp.text.inverse,
          boxShadow: zp.elevation.heroInk, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px", borderBottom: `1px solid rgba(255,255,255,0.06)`,
          }}>
            <span style={{
              fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.inverseMuted,
              letterSpacing: "0.14em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: zp.radius.pill,
              background: "rgba(123,79,191,0.2)", border: "1px solid rgba(123,79,191,0.35)",
            }}>
              ZeniCore API v1
            </span>
            <button
              onClick={copy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: zp.radius.sm,
                background: "rgba(255,255,255,0.08)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: 11, fontWeight: zp.weight.semibold, cursor: "pointer",
              }}
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <pre style={{
            margin: 0, padding: "20px 22px",
            fontFamily: zp.font.mono, fontSize: 13, lineHeight: 1.55,
            color: "#e2e8f0",
            overflowX: "auto" as const,
            whiteSpace: "pre",
          }}>
            {renderHighlightedSnippet(body)}
          </pre>
        </div>
      </div>
    </section>
  );
}

// Tiny hand-rolled syntax highlighter: comments → slate, keys → violet,
// string values → green, numbers → cyan, true/false → amber.
function renderHighlightedSnippet(raw: string): React.ReactNode {
  const lines = raw.split("\n");
  return lines.map((line, i) => (
    <div key={i}>{highlightLine(line)}</div>
  ));
}

function highlightLine(line: string): React.ReactNode {
  if (line.trim().startsWith("//")) {
    return <span style={{ color: "#64748b" }}>{line}</span>;
  }
  // Match: "key": value OR value on its own (POST / { / })
  // Simple regex pass: split on "key": boundary.
  const keyValueMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)(.*)$/);
  if (keyValueMatch) {
    const [, indent, key, sep, val] = keyValueMatch;
    return (
      <>
        <span>{indent}</span>
        <span style={{ color: zp.brand.violet }}>&quot;{key}&quot;</span>
        <span style={{ color: "#94a3b8" }}>{sep}</span>
        {colorValue(val)}
      </>
    );
  }
  // Method line (POST /...)
  const methodMatch = line.match(/^(\s*)(POST|GET|PUT|DELETE)(\s+.+)$/);
  if (methodMatch) {
    const [, indent, method, rest] = methodMatch;
    return (
      <>
        <span>{indent}</span>
        <span style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>{method}</span>
        <span style={{ color: "#cbd5e1" }}>{rest}</span>
      </>
    );
  }
  return <span>{line}</span>;
}

function colorValue(v: string): React.ReactNode {
  const trimmed = v.trimEnd();
  const trailing = v.slice(trimmed.length);
  // String
  const strMatch = trimmed.match(/^"([^"]*)"(,?)$/);
  if (strMatch) {
    return (
      <>
        <span style={{ color: zp.brand.green }}>&quot;{strMatch[1]}&quot;</span>
        <span style={{ color: "#94a3b8" }}>{strMatch[2]}</span>
        <span>{trailing}</span>
      </>
    );
  }
  // Number
  const numMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)(,?)$/);
  if (numMatch) {
    return (
      <>
        <span style={{ color: zp.brand.cyan }}>{numMatch[1]}</span>
        <span style={{ color: "#94a3b8" }}>{numMatch[2]}</span>
        <span>{trailing}</span>
      </>
    );
  }
  // Boolean
  const boolMatch = trimmed.match(/^(true|false)(,?)$/);
  if (boolMatch) {
    return (
      <>
        <span style={{ color: zp.brand.orange }}>{boolMatch[1]}</span>
        <span style={{ color: "#94a3b8" }}>{boolMatch[2]}</span>
        <span>{trailing}</span>
      </>
    );
  }
  return <span style={{ color: "#cbd5e1" }}>{v}</span>;
}

// ───────────────────────────────────────────────────────────────────────────

function RosterShowcase() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 40 }}>
          <H2>11 agents. Ready to deploy.</H2>
          <p style={{ ...bodyStyle, margin: "14px auto 0", maxWidth: 560 }}>
            A full roster of specialized AI agents, each with its own role,
            wallet, and audit trail.
          </p>
        </div>
        <div style={{
          display: "grid", gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}>
          {ROSTER.map((a) => (
            <div
              key={a.name}
              className="mk-agent-tile"
              style={{
                padding: "20px 18px", borderRadius: zp.radius.lg,
                background: "#fff", border: `1px solid ${zp.surface.border}`,
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center" as const, gap: 10,
                transition: zp.motion.base, cursor: "default",
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
                background: zp.surface.bg2,
                boxShadow: `0 0 0 3px rgba(123,79,191,0.18)`,
              }}>
                <Image src={`/agents/${a.name.toLowerCase()}.svg`} alt={`${a.name} avatar`} width={64} height={64} style={{ width: 64, height: 64, objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{a.name}</div>
                <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>{a.role}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
                borderRadius: zp.radius.pill,
                background: zp.gradient.tintGreen, color: zp.semantic.success,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                Ready
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .mk-agent-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(123,79,191,0.16);
          border-color: rgba(123,79,191,0.35) !important;
        }
      `}</style>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", textAlign: "center" as const, background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <H2>Ship your first agent wallet today.</H2>
        <p style={{ ...bodyStyle, marginTop: 14 }}>
          Sign up, create your fleet, and fund your first agent in under 10 minutes.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/register" style={primaryCta}>Get started</Link>
          <Link href="mailto:info@zeniva.ca" style={ghostCta}>Book a demo</Link>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.1, color: zp.text.primary }}>
      {children}
    </h2>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: "18px 0 0", fontSize: 16, lineHeight: 1.55, color: zp.text.muted,
};
const primaryCta: React.CSSProperties = {
  background: zp.gradient.main, color: "#fff",
  padding: "14px 24px", borderRadius: zp.radius.sm,
  fontSize: 15, fontWeight: zp.weight.semibold,
  textDecoration: "none", boxShadow: "0 6px 20px rgba(21,184,201,0.35)",
  letterSpacing: "0.01em", display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const ghostCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "transparent", color: zp.text.primary,
  border: `1px solid ${zp.surface.border}`,
  padding: "13px 22px", borderRadius: zp.radius.sm,
  fontSize: 15, fontWeight: zp.weight.semibold, textDecoration: "none",
};
