// Shared big agent card — the Mercury-on-Mars composition used on
// /agents/overview (marketing), /agents/dashboard, and /agents/agents.
//
// Full-bleed aspect-square avatar on top (photo from /public/agents/*.png
// when the name matches the ZeniPay roster, else a deterministic gradient
// initial), white fade to bottom, info panel pulled up into the photo
// with name + role, wallet balance hero, optional banking chips
// (tx count, budget %, last activity), optional monthly-spend bar, and
// a two-button CTA pair.
//
// Every extended banking field is optional — if the caller only passes
// name/role/balance (the minimum the authenticated API returns), the
// card just hides the chips / bar instead of showing zeros.

"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const DISPLAY = "var(--font-fraunces), Fraunces, Georgia, serif";

// ZeniPay roster photos that ship in /public/agents/. Anything outside
// this set falls back to a gradient initial.
const KNOWN_AGENTS = new Set([
  // Default four shown to every merchant out of the box.
  "ben", "max", "jade", "kai",
  // Eight templates available through the "New agent" picker.
  "marco", "sofia", "atlas", "luna", "mia", "leo", "rex", "vera",
]);

export interface AgentCardData {
  id?: string;
  name: string;
  role: string;                         // agent_type label
  balance: number;                      // in major units (dollars)
  currency?: string;
  status: "active" | "idle" | "paused" | "revoked" | string;
  accent?: string;                      // override card accent colour
  /** Optional banking fields. When omitted the corresponding UI block is hidden. */
  last4?: string;
  limit?: number;
  spent?: number;
  txCount?: number;
  lastActivity?: string;
  /** Badge shown in the primary CTA slot ("Live", "Example", etc.) */
  primaryLabel?: string;
  /** Override the destination of the primary CTA (defaults to /agents/agents/<id>). */
  primaryHref?: string;
}

function slugFor(name: string): string {
  return name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
}

function deterministicHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

function defaultAccent(name: string): string {
  const map: Record<string, string> = {
    // Default four — the ops stack.
    ben:   "#7B4FBF",   // Finance — violet
    max:   "#FFA500",   // Compliance & Risk — amber
    jade:  "#10B981",   // Agent Success — emerald
    kai:   "#0EA5E9",   // Revenue Intelligence — sky
    // Templates unlocked via "New agent".
    marco: "#15B8C9",
    sofia: "#FF6B9D",
    atlas: "#64748B",
    luna:  "#06B6D4",
    mia:   "#A855F7",
    leo:   "#8B5CF6",
    rex:   "#059669",
    vera:  "#F59E0B",
  };
  const slug = slugFor(name);
  if (map[slug]) return map[slug];
  const hue = deterministicHue(name);
  return `hsl(${hue} 65% 52%)`;
}

function money(n: number, currency = "CAD"): string {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function moneyShort(n: number, currency = "CAD"): string {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return `$${(n / 1000).toFixed(1)}k`;
  }
}

export function AgentCard({ data }: { data: AgentCardData }) {
  const accent = data.accent ?? defaultAccent(data.name);
  const slug = slugFor(data.name);
  const hasPhoto = KNOWN_AGENTS.has(slug);
  const currency = data.currency ?? "CAD";

  const hasLimit = typeof data.limit === "number" && data.limit > 0;
  const spent = data.spent ?? 0;
  const pct = hasLimit ? Math.min(100, Math.round((spent / (data.limit ?? 1)) * 100)) : 0;
  const overLimit = hasLimit && spent > (data.limit ?? 0);

  const chips: React.ReactNode[] = [];
  if (typeof data.txCount === "number") {
    chips.push(<Chip key="tx" accent={accent} label={`${data.txCount} tx`} />);
  }
  if (hasLimit) {
    chips.push(
      <Chip
        key="pct"
        accent={accent}
        label={`${pct}% of ${moneyShort(data.limit ?? 0, currency)}`}
        emphasize={overLimit}
      />,
    );
  }
  if (data.lastActivity) {
    chips.push(<Chip key="act" accent={accent} label={data.lastActivity} ghost />);
  }

  const isAlive = data.status === "active";
  const statusLabel =
    data.status === "active" ? "Live"
    : data.status === "idle" ? "Idle"
    : data.status === "paused" ? "Paused"
    : data.status === "revoked" ? "Revoked"
    : data.status;

  const statusColor =
    data.status === "active"  ? "#16A34A"
    : data.status === "idle"  ? "#D97706"
    : data.status === "paused"? "#64748B"
    : data.status === "revoked"? "#DC2626"
    : "#64748B";

  const Inner = (
    <article
      className="zp-agent-card"
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        display: "flex", flexDirection: "column",
        transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {/* Avatar block */}
      <div style={{
        position: "relative",
        aspectRatio: "1 / 1",
        background: `linear-gradient(135deg, ${accent}14 0%, ${accent}06 100%)`,
        overflow: "hidden",
      }}>
        {hasPhoto ? (
          <Image
            src={`/agents/${slug}.png`}
            alt={`${data.name} avatar`}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`,
            color: "#fff",
            fontFamily: DISPLAY,
            fontSize: "clamp(56px, 11vw, 88px)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}>
            {(data.name.trim()[0] || "?").toUpperCase()}
          </div>
        )}

        {/* Fade to white at the bottom */}
        <span aria-hidden style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 128,
          background: "linear-gradient(0deg, #fff 0%, rgba(255,255,255,0.82) 40%, transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Status pill (top-right) */}
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 800,
            padding: "5px 10px", borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            color: statusColor,
            border: "1px solid rgba(15,23,42,0.08)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
          }}>
            <span className={isAlive ? "zp-pulse-green" : undefined} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: statusColor,
            }} />
            {statusLabel}
          </span>
        </div>

        {/* Account-tail badge (top-left) */}
        {data.last4 && (
          <div style={{
            position: "absolute", top: 14, left: 14,
            fontSize: 10, fontWeight: 800,
            padding: "5px 10px", borderRadius: 999,
            background: "rgba(10,11,31,0.85)", color: "#fff",
            fontFamily: MONO, letterSpacing: "0.1em",
          }}>
            •• {data.last4}
          </div>
        )}
      </div>

      {/* Info panel — pulled up into the avatar block like Zeniva Travel */}
      <div style={{ padding: "0 20px 20px", marginTop: -32, position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{
            margin: 0, fontFamily: DISPLAY,
            fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: TEXT,
          }}>
            {data.name}
          </h3>
          <div style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: "0.04em", marginTop: 4 }}>
            {data.role}
          </div>
        </div>

        {/* Wallet balance — the hero number */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: MUTED,
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2,
          }}>
            Wallet balance
          </div>
          <div style={{
            fontFamily: MONO,
            fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
            color: accent, lineHeight: 1.05,
          }}>
            {money(data.balance, currency)}
          </div>
        </div>

        {chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {chips}
          </div>
        )}

        {hasLimit && (
          <div style={{ height: 4, background: "#F1F5F9", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: overLimit ? "#FF5A6C" : accent,
            }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 12px", borderRadius: 12,
            background: `${accent}12`, color: accent,
            border: `1px solid ${accent}26`,
            fontSize: 13, fontWeight: 800,
          }}>
            {data.primaryLabel ?? "Open agent"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
            </svg>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "10px 14px", borderRadius: 12,
            background: accent, color: "#fff",
            fontSize: 13, fontWeight: 800, letterSpacing: "0.02em",
            boxShadow: `0 6px 16px ${accent}4D`,
          }}>
            💳 Visa
          </div>
        </div>
      </div>

      <style>{`
        .zp-agent-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 50px rgba(15,23,42,0.14), 0 0 0 1px ${accent}40;
        }
      `}</style>
    </article>
  );

  // If we have an id or an explicit href, wrap the whole card in a Link.
  const href = data.primaryHref ?? (data.id ? `/agents/agents/${data.id}` : undefined);
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {Inner}
      </Link>
    );
  }
  return Inner;
}

function Chip({ label, accent, ghost, emphasize }: { label: string; accent: string; ghost?: boolean; emphasize?: boolean }) {
  if (ghost) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 600,
        padding: "3px 9px", borderRadius: 10,
        background: "#F1F5F9", color: MUTED,
        border: `1px solid ${BORDER}`,
      }}>
        {label}
      </span>
    );
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800,
      padding: "3px 9px", borderRadius: 10,
      background: emphasize ? "rgba(255,90,108,0.12)" : `${accent}12`,
      color: emphasize ? "#FF5A6C" : accent,
      border: `1px solid ${emphasize ? "#FF5A6C33" : `${accent}33`}`,
      fontFamily: MONO, letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

// Roster v2 — official ZeniPay financial agent fleet (12 specialists).
// DEMO_ROSTER = the 4 vitrine agents shown on the marketing landing
// (/agents/overview) and as the empty-state pre-roster on the
// /agents/dashboard demo. AVAILABLE_TEMPLATES holds the other 8 that
// merchants can self-install via the "New agent" picker.
//
// Net change vs v1: dropped Max, Jade, Luna; added Zara, Victor, Eva.
export const DEMO_ROSTER: AgentCardData[] = [
  { name: "Zara",   role: "Banker",            accent: "#15B8C9", balance: 2400.00, currency: "USD", status: "active", last4: "1042", limit: 8000,  spent: 4920, txCount: 38, lastActivity: "just now", primaryLabel: "Example" },
  { name: "Victor", role: "Accountant",        accent: "#7B4FBF", balance: 1800.00, currency: "USD", status: "active", last4: "8217", limit: 4000,  spent: 1610, txCount: 24, lastActivity: "8m ago",    primaryLabel: "Example" },
  { name: "Eva",    role: "Financial Advisor", accent: "#10B981", balance: 3100.00, currency: "USD", status: "active", last4: "3590", limit: 6000,  spent: 2240, txCount: 19, lastActivity: "22m ago",   primaryLabel: "Example" },
  { name: "Ben",    role: "Finance Agent",     accent: "#FFA500", balance: 4200.00, currency: "USD", status: "active", last4: "4821", limit: 10000, spent: 5800, txCount: 87, lastActivity: "1h ago",    primaryLabel: "Example" },
];

// Other 8 agent templates — available through the "New agent" picker.
// Combined with DEMO_ROSTER, a merchant can deploy up to 12 specialists.
export interface AgentTemplate {
  slug: string;                  // matches /public/agents/<slug>.png
  name: string;
  role: string;
  description: string;
  accent: string;
  defaultLimit: number;
}

export const AVAILABLE_TEMPLATES: AgentTemplate[] = [
  { slug: "marco", name: "Marco", role: "Lead Hunter",          description: "Scrapes inbound channels + qualifies B2B leads 24/7.",       accent: "#15B8C9", defaultLimit: 2000 },
  { slug: "sofia", name: "Sofia", role: "Email Marketing",      description: "Writes and sends unique AI emails per lead, every language.", accent: "#FF6B9D", defaultLimit: 1500 },
  { slug: "atlas", name: "Atlas", role: "Security Agent",       description: "Fraud detection + 24/7 service + cert watchdog.",            accent: "#64748B", defaultLimit: 1200 },
  { slug: "vera",  name: "Vera",  role: "Compliance & Risk",    description: "Regulatory checks + second-line compliance.",                accent: "#F59E0B", defaultLimit: 800  },
  { slug: "leo",   name: "Leo",   role: "Analytics",            description: "Conversion / pipeline / ROI insights that feed other agents.", accent: "#8B5CF6", defaultLimit: 600  },
  { slug: "rex",   name: "Rex",   role: "Platform Engineer",    description: "Bug detection, API monitoring, daily health reports.",        accent: "#059669", defaultLimit: 1500 },
  { slug: "mia",   name: "Mia",   role: "Social Media",         description: "5 AI posts a day across IG, TikTok, FB with approval flow.",  accent: "#A855F7", defaultLimit: 800  },
  { slug: "kai",   name: "Kai",   role: "Revenue Intelligence", description: "Sales forecasting + pipeline scoring + revenue ops.",        accent: "#0EA5E9", defaultLimit: 6000 },
];

/** Slugs already in the default roster. Used by the picker to hide them. */
export const DEFAULT_ROSTER_SLUGS = new Set(DEMO_ROSTER.map((a) => slugFor(a.name)));

export default AgentCard;
