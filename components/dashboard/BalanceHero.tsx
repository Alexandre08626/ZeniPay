// BalanceHero — the signature showcase block.
//
// Dark ink card (deep-blue gradient) sitting on the white dashboard page,
// hosting the big balance, a sparkline, and primary CTAs. Use once per
// top-level page (/app/overview, /agents/overview, /agents/ledger).

"use client";

import React from "react";
import zp from "@/lib/design-system/zenipay-brand";
import CosmicBackground from "./CosmicBackground";
import SparklineChart from "./SparklineChart";
import CountUp from "./CountUp";
import GradientButton from "./GradientButton";

export interface BalanceHeroAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}

export type BalanceHeroAccent = "cyan" | "violet";

export interface BalanceHeroProps {
  eyebrow?: React.ReactNode;
  label: string;
  amount: number;
  currency?: string;
  subtitle?: React.ReactNode;
  sparklineData?: number[];
  actions?: BalanceHeroAction[];
  accent?: BalanceHeroAccent;          // cyan for merchant, violet for agents
  cosmic?: boolean;                    // particles on/off — default true
  seed?: number;                       // particle seed for visual variety
}

export function BalanceHero({
  eyebrow,
  label,
  amount,
  currency = "CAD",
  subtitle,
  sparklineData = [],
  actions = [],
  accent = "cyan",
  cosmic = true,
  seed = 11,
}: BalanceHeroProps) {
  const bg = accent === "cyan" ? zp.gradient.heroMerchant : zp.gradient.heroAgents;
  const strokeFrom = accent === "cyan" ? zp.brand.green : zp.brand.cyan;
  const strokeTo = accent === "cyan" ? zp.brand.violet : zp.brand.violet;

  return (
    <section
      aria-label={label}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: zp.radius.lg,
        background: bg,
        color: zp.text.inverse,
        padding: "28px 32px",
        minHeight: 220,
        boxShadow: zp.elevation.heroInk,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.3fr) minmax(280px, 1fr)",
        gap: 28,
        alignItems: "center",
      }}
      className="pr20-hero"
    >
      {cosmic && <CosmicBackground count={14} seed={seed} opacity={0.35} />}

      {/* Radial glow for depth */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: -120,
          top: -120,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent === "cyan" ? zp.brand.cyan : zp.brand.violet}33 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        {eyebrow && (
          <div style={{ marginBottom: 10 }}>
            {typeof eyebrow === "string" ? (
              <span style={{
                fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
                fontWeight: zp.weight.semibold, color: zp.text.inverseMuted,
              }}>{eyebrow}</span>
            ) : eyebrow}
          </div>
        )}

        <div style={{
          fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: zp.text.inverseMuted, fontWeight: zp.weight.semibold,
        }}>
          {label}
        </div>

        <div style={{
          ...zp.amountStyle.hero,
          color: "#fff",
          marginTop: 8,
          fontSize: 64,
        }}>
          <CountUp
            value={amount}
            duration={800}
            format={(n) => zp.fmtCurrency(n, currency)}
          />
        </div>

        {subtitle && (
          <div style={{ marginTop: 10, fontSize: 13, color: zp.text.inverseMuted, maxWidth: 560 }}>
            {subtitle}
          </div>
        )}

        {actions.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            {actions.map((a, i) => {
              const isPrimary = i === 0 && a.variant !== "secondary" && a.variant !== "ghost";
              return (
                <GradientButton
                  key={a.label}
                  href={a.href}
                  onClick={a.onClick}
                  variant={a.variant ?? (isPrimary ? "primary" : "secondary")}
                  size="md"
                  icon={a.icon}
                  style={
                    // On the ink card, the "secondary" variant needs a lighter surface to be legible.
                    a.variant === "secondary" || (!isPrimary && !a.variant)
                      ? {
                          background: "rgba(255,255,255,0.1)",
                          color: "#fff",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                        }
                      : undefined
                  }
                >
                  {a.label}
                </GradientButton>
              );
            })}
          </div>
        )}
      </div>

      {/* Sparkline panel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: zp.radius.md,
          padding: "16px 18px",
          minHeight: 140,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          justifyContent: "center",
        }}
        className="pr20-hero-spark"
      >
        <div style={{
          fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
          color: zp.text.inverseMuted, fontWeight: zp.weight.semibold,
        }}>
          Trend · last {sparklineData.length || 30} days
        </div>
        <SparklineChart
          data={sparklineData.length ? sparklineData : Array.from({ length: 30 }, (_, i) => Math.max(0, Math.sin(i / 4) * 50 + 60 + Math.random() * 20))}
          height={84}
          onInk
          strokeFrom={strokeFrom}
          strokeTo={strokeTo}
        />
      </div>

      <style>{heroCss}</style>
    </section>
  );
}

const heroCss = `
@media (max-width: 820px) {
  .pr20-hero {
    grid-template-columns: 1fr !important;
  }
  .pr20-hero-spark { min-height: 120px !important; }
}
`;

export default BalanceHero;
