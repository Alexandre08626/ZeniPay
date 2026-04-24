// /agents/overview — AI Agent Wallet marketing page.
//
// Public marketing (distinct from /agents/dashboard, the authenticated
// operator surface). Features the real DiceBear fleet, a code-snippet
// showcase, and a 3-step how-it-works flow. Uses the shared
// zenipay-brand tokens + the /public/agents/*.png static avatars.

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

// Demo roster — four agents displayed as BIG Mercury/Brex-style cards
// that merge the character avatar with live banking numbers. Every
// field is plausible, investor-ready fiction (no live data).
interface DemoAgent {
  name: string;
  role: string;
  accent: string;                // per-agent card accent color
  balance: number;               // dollars
  limit: number;                 // monthly spending cap
  spent: number;                 // spent this month
  last4: string;                 // virtual card tail
  txCount: number;               // tx this month
  lastActivity: string;          // human label
  status: "active" | "idle";
}

const ROSTER: DemoAgent[] = [
  { name: "Marco", role: "Lead Hunter",     accent: "#15B8C9", balance: 1240.00, limit: 2000, spent: 760,   last4: "7712", txCount: 42, lastActivity: "2m ago",  status: "active" },
  { name: "Sofia", role: "Email Marketing", accent: "#FF6B9D", balance: 380.50,  limit: 1500, spent: 1119.5, last4: "2081", txCount: 18, lastActivity: "14m ago", status: "active" },
  { name: "Ben",   role: "Finance Agent",   accent: "#7B4FBF", balance: 4200.00, limit: 10000, spent: 5800, last4: "4821", txCount: 87, lastActivity: "just now", status: "active" },
  { name: "Atlas", role: "Security Agent",  accent: "#10B981", balance: 890.00,  limit: 1200, spent: 310,   last4: "9933", txCount: 11, lastActivity: "1h ago",  status: "active" },
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

// FleetDemo — four BIG agent cards inspired by Zeniva Travel's AgentCard
// (aspect-ratio avatar block with a gradient tint per agent, overlaid
// status + balance, stats panel at the bottom). Merges the AI-agent
// persona with the banking numbers.
function FleetDemo() {
  const totals = ROSTER.reduce((acc, a) => ({
    bal:   acc.bal   + a.balance,
    spent: acc.spent + a.spent,
    tx:    acc.tx    + a.txCount,
  }), { bal: 0, spent: 0, tx: 0 });

  return (
    <section style={{ padding: "40px 24px 96px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto" }}>
        {/* Header above the grid */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 22, flexWrap: "wrap", gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.brand.violet, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
              Your Fleet · ZeniCore Live
            </div>
            <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(30px, 3.6vw, 44px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.1, color: zp.text.primary }}>
              Four specialists. Four wallets. One audit trail.
            </h2>
          </div>

          <div style={{
            display: "flex", gap: 22, padding: "14px 18px",
            background: zp.surface.bg1, border: `1px solid ${zp.surface.border}`,
            borderRadius: zp.radius.md, boxShadow: zp.elevation.sm,
          }}>
            <MiniStat label="Total balance" value={money(totals.bal)} color={zp.brand.cyan} />
            <Divider />
            <MiniStat label="Spent this month" value={money(totals.spent)} color={zp.brand.violet} />
            <Divider />
            <MiniStat label="Transactions" value={totals.tx.toLocaleString("en-US")} color={zp.brand.green} />
          </div>
        </div>

        {/* 4 big cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
        }}>
          {ROSTER.map((a) => (
            <AgentBigCard key={a.name} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentBigCard({ a }: { a: DemoAgent }) {
  const pct = Math.min(100, Math.round((a.spent / a.limit) * 100));
  const overLimit = a.spent > a.limit;

  return (
    <article
      className="mk-agent-big"
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${zp.surface.border}`,
        boxShadow: zp.elevation.sm,
        display: "flex",
        flexDirection: "column",
        transition: zp.motion.base,
      }}
    >
      {/* Full-bleed avatar block — modeled on Zeniva Travel AgentCard. */}
      <div style={{
        position: "relative",
        aspectRatio: "1 / 1",
        background: `linear-gradient(135deg, ${a.accent}14 0%, ${a.accent}06 100%)`,
        overflow: "hidden",
      }}>
        <Image
          src={`/agents/${a.name.toLowerCase()}.png`}
          alt={`${a.name} — ${a.role}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          style={{ objectFit: "cover", objectPosition: "top" }}
        />

        {/* White fade at the bottom 128px — Zeniva's h-32 from-white gradient */}
        <span aria-hidden style={{
          position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, bottom: 0,
          height: 128,
          background: "linear-gradient(0deg, #fff 0%, rgba(255,255,255,0.82) 40%, transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Top-right: status pill */}
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: zp.weight.bold,
            padding: "5px 10px", borderRadius: zp.radius.pill,
            background: "rgba(255,255,255,0.92)",
            color: a.status === "active" ? zp.semantic.success : zp.text.muted,
            border: `1px solid rgba(15,23,42,0.08)`,
            letterSpacing: "0.1em", textTransform: "uppercase",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
          }}>
            <span className={a.status === "active" ? "zp-pulse-green" : undefined} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: a.status === "active" ? zp.semantic.success : zp.surface.bg3,
            }} />
            {a.status === "active" ? "Live" : "Idle"}
          </span>
        </div>

        {/* Top-left: account badge (•• last4) — banking context cue */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          fontSize: 10, fontWeight: zp.weight.bold,
          padding: "5px 10px", borderRadius: zp.radius.pill,
          background: "rgba(10,11,31,0.85)", color: "#fff",
          fontFamily: zp.font.mono, letterSpacing: "0.1em",
        }}>
          •• {a.last4}
        </div>
      </div>

      {/* Info panel — pulled UP into the avatar block like Zeniva's -mt-8 */}
      <div style={{ padding: "0 20px 20px", marginTop: -32, position: "relative", zIndex: 1 }}>
        {/* Name + role (Zeniva's big black name + colored role). */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{
            margin: 0, fontFamily: zp.font.display,
            fontSize: 24, fontWeight: zp.weight.bold,
            letterSpacing: "-0.025em", color: zp.text.primary,
          }}>
            {a.name}
          </h3>
          <div style={{
            fontSize: 11, fontWeight: zp.weight.bold,
            color: a.accent, letterSpacing: "0.04em",
            marginTop: 4,
          }}>
            {a.role}
          </div>
        </div>

        {/* Wallet balance — big hero number replacing the Zeniva description */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
            letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 2,
          }}>
            Wallet balance
          </div>
          <div style={{
            fontFamily: zp.font.mono,
            fontSize: 30, fontWeight: zp.weight.bold, letterSpacing: "-0.02em",
            color: a.accent, lineHeight: 1.05,
          }}>
            {money(a.balance)}
          </div>
        </div>

        {/* Banking stat chips — replacing Zeniva's feature pills with numbers */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          <Chip accent={a.accent} label={`${a.txCount} tx`} />
          <Chip accent={a.accent} label={`${pct}% of ${money(a.limit)}`} emphasize={overLimit} />
          <Chip accent={a.accent} label={a.lastActivity} ghost />
        </div>

        {/* Budget bar — thin, colored by accent (turns red if over) */}
        <div style={{ height: 4, background: zp.surface.bg3, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: overLimit ? zp.semantic.danger : a.accent,
            transition: zp.motion.base,
          }} />
        </div>

        {/* Bottom CTAs — Zeniva's "Discover + Chat" pair, adapted for banking */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 12px", borderRadius: 12,
            background: `${a.accent}12`, color: a.accent,
            border: `1px solid ${a.accent}26`,
            fontSize: 13, fontWeight: zp.weight.bold,
            letterSpacing: "0.01em",
          }}>
            View {a.name}&rsquo;s account
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
            </svg>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 14px", borderRadius: 12,
            background: a.accent, color: "#fff",
            fontSize: 13, fontWeight: zp.weight.bold,
            letterSpacing: "0.02em",
            boxShadow: `0 6px 16px ${a.accent}4D`,
          }}>
            💳 Visa
          </div>
        </div>
      </div>

      <style>{`
        .mk-agent-big:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 50px rgba(15,23,42,0.14), 0 0 0 1px ${a.accent}40;
        }
      `}</style>
    </article>
  );
}

function Chip({ label, accent, ghost, emphasize }: { label: string; accent: string; ghost?: boolean; emphasize?: boolean }) {
  if (ghost) {
    return (
      <span style={{
        fontSize: 10, fontWeight: zp.weight.semibold,
        padding: "3px 9px", borderRadius: 10,
        background: zp.surface.bg3, color: zp.text.muted,
        border: `1px solid ${zp.surface.border}`,
      }}>
        {label}
      </span>
    );
  }
  const bg = emphasize ? zp.semantic.dangerBg : `${accent}12`;
  const fg = emphasize ? zp.semantic.danger : accent;
  const border = emphasize ? zp.semantic.danger + "33" : `${accent}33`;
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.bold,
      padding: "3px 9px", borderRadius: 10,
      background: bg, color: fg,
      border: `1px solid ${border}`,
      fontFamily: zp.font.mono, letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{
        fontFamily: zp.font.mono, fontSize: 16, fontWeight: zp.weight.semibold,
        color, marginTop: 2, letterSpacing: "-0.01em",
      }}>
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: zp.surface.border, alignSelf: "stretch" }} />;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
