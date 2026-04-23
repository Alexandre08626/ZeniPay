// Banking tokens — extends the base design system for /app/*.
//
// Scope: ONLY /app/* (merchant business banking). Do not import these
// into the landing page or /agents/*. The intent is to make /app feel
// like Mercury/Brex/Relay — a real neobank — by narrowing the palette
// further (deep forest primary, emerald accent, neutral everything
// else) and locking typography into Inter with tabular-nums for
// amounts. The base tokens stay untouched so the rest of the app is
// unaffected.

import { color, radius, shadow, spacing, fontWeight, breakpoint, zIndex, transition } from "./tokens";

// ---------------------------------------------------------------------------
// Banking color palette
// ---------------------------------------------------------------------------
// deep forest (accountPrimary) conveys vault / stability. emerald (accent)
// is used for primary CTAs + positive movement. cyan (accountSecondary) is
// reserved for savings / passive accounts so the eye can separate balance
// types at a glance.
export const bankingColor = {
  ...color,

  // Surfaces
  surface:           "#F8FAFC",           // page background
  surfaceElevated:   "#FFFFFF",           // card background
  surfaceInset:      "#F1F5F9",           // inset panels, hover rows
  borderSoft:        "#E2E8F0",
  borderMedium:      "#CBD5E1",
  borderStrong:      "#94A3B8",

  // Brand — banking
  accountPrimary:    "#0F4F3F",           // deep forest — hero blocks, primary account
  accountPrimaryInk: "#072B22",           // darker shade for hover / active states
  accountSecondary:  "#15B8C9",           // cyan — savings / secondary accounts
  accent:            "#10B981",           // emerald — primary CTAs
  accentHover:       "#059669",           // emerald hover
  accentSoft:        "#D1FAE5",           // positive background tint

  // Semantic
  incomePositive:    "#059669",           // $ credit color
  incomePositiveBg:  "#ECFDF5",
  spendNegative:     "#0F172A",           // $ debit color — neutral ink, not red
  pending:           "#D97706",
  pendingBg:         "#FEF3C7",
  disputed:          "#DC2626",
  disputedBg:        "#FEE2E2",

  // Text — slightly warmer than the default neutrals
  textPrimary:       "#0F172A",
  textSecondary:     "#475569",
  textMuted:         "#64748B",
  textSubtle:        "#94A3B8",
  textInverse:       "#FFFFFF",
} as const;

// Gradient used at most once per screen — the overview hero balance block.
export const bankingGradient = {
  primary: `linear-gradient(135deg, ${bankingColor.accountPrimary} 0%, #0B3F33 45%, #072B22 100%)`,
  accent:  `linear-gradient(135deg, ${bankingColor.accent} 0%, #047857 100%)`,
} as const;

// ---------------------------------------------------------------------------
// Chart palette — 8 colors for balances / cash-flow / account breakdowns.
// Keep saturation even across all stops so no single series dominates.
// ---------------------------------------------------------------------------
export const chartColors = [
  "#0F4F3F",   // forest (primary account)
  "#10B981",   // emerald (income)
  "#15B8C9",   // cyan (savings / secondary)
  "#6366F1",   // indigo (reserved)
  "#A855F7",   // violet (partner accounts)
  "#F59E0B",   // amber (pending / warning)
  "#EF4444",   // rose (disputed / negative)
  "#64748B",   // slate (fees / misc)
] as const;

// ---------------------------------------------------------------------------
// Typography — banking amounts use tabular-nums so digits line up.
// ---------------------------------------------------------------------------
export const bankingFont = {
  sans:          "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, 'Segoe UI', sans-serif",
  mono:          "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
} as const;

export const bankingAmount = {
  // One place to set every $ amount in the app. Apply via `style={bankingAmount.base}`.
  base: {
    fontFamily:      bankingFont.sans,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "cv11" 1' as const,
    letterSpacing:   "-0.01em",
    fontWeight:      fontWeight.medium,   // 500
  },
  large: {
    fontFamily:      bankingFont.sans,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "cv11" 1' as const,
    letterSpacing:   "-0.03em",
    fontWeight:      fontWeight.bold,     // 700 — headline amounts
  },
  hero: {
    fontFamily:      bankingFont.sans,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "cv11" 1' as const,
    letterSpacing:   "-0.04em",
    fontSize:        "48px",
    lineHeight:      1,
    fontWeight:      fontWeight.bold,
  },
} as const;

// ---------------------------------------------------------------------------
// Intl formatters — reuse across the app so numbers stay consistent.
// ---------------------------------------------------------------------------
export function fmtCurrency(amount: number, currency = "CAD", locale = "en-CA"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function fmtCurrencyShort(amount: number, currency = "CAD", locale = "en-CA"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${(amount / 1000).toFixed(1)}k ${currency}`;
  }
}

export function fmtDate(iso: string | Date | null | undefined, locale = "en-CA"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function fmtDateTime(iso: string | Date | null | undefined, locale = "en-CA"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Build a friendly greeting dependent on local time.
export function greeting(firstName: string | null | undefined, now: Date = new Date()): string {
  const h = now.getHours();
  const part = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  if (!firstName) return `${part}`;
  return `${part}, ${firstName}`;
}

// ---------------------------------------------------------------------------
// Re-export commonly used base tokens so consumers only import from here.
// ---------------------------------------------------------------------------
export const banking = {
  color: bankingColor,
  gradient: bankingGradient,
  chart: chartColors,
  font: bankingFont,
  amount: bankingAmount,
  radius,
  shadow,
  spacing,
  fontWeight,
  breakpoint,
  zIndex,
  transition,
} as const;

export default banking;
