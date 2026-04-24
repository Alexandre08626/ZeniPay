// BankingCard — elevated content container with optional brand accent.
//
// The accent prop adds a left border matching the brand stops; `elevated`
// swaps the card shadow to the larger tier; `interactive` adds a hover
// transition (lift + border brighten) used for clickable cards.

"use client";

import React from "react";
import zp from "@/lib/design-system/zenipay-brand";

export type CardAccent = "cyan" | "violet" | "green" | "pink" | "neutral" | "gradient";

export interface BankingCardProps {
  accent?: CardAccent;
  elevated?: boolean;
  interactive?: boolean;
  padding?: number | "none";
  style?: React.CSSProperties;
  children: React.ReactNode;
}

function accentStripe(accent: CardAccent): string | null {
  switch (accent) {
    case "cyan": return zp.brand.cyan;
    case "violet": return zp.brand.violet;
    case "green": return zp.brand.green;
    case "pink": return zp.brand.pink;
    case "gradient": return zp.gradient.main;
    default: return null;
  }
}

export function BankingCard({
  accent = "neutral",
  elevated,
  interactive,
  padding = 20,
  style,
  children,
}: BankingCardProps) {
  const stripe = accentStripe(accent);
  const p = padding === "none" ? 0 : padding;

  return (
    <div
      style={{
        background: zp.surface.bg1,
        border: `1px solid ${zp.surface.border}`,
        borderRadius: zp.radius.md,
        borderLeft: stripe ? `3px solid transparent` : `1px solid ${zp.surface.border}`,
        backgroundImage: stripe
          ? `linear-gradient(${zp.surface.bg1}, ${zp.surface.bg1}), linear-gradient(180deg, ${stripe} 0%, ${stripe} 100%)`
          : undefined,
        backgroundOrigin: stripe ? "border-box" : undefined,
        backgroundClip: stripe ? "padding-box, border-box" : undefined,
        padding: typeof p === "number" ? `${p}px ${p + 2}px` : 0,
        boxShadow: elevated ? zp.elevation.md : zp.elevation.sm,
        cursor: interactive ? "pointer" : undefined,
        transition: interactive ? zp.motion.base : undefined,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.boxShadow = zp.elevation.md;
        e.currentTarget.style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.boxShadow = elevated ? zp.elevation.md : zp.elevation.sm;
        e.currentTarget.style.transform = "translateY(0)";
      } : undefined}
    >
      {children}
    </div>
  );
}

export default BankingCard;
