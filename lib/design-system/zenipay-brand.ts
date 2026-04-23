// ZeniPay brand — official tokens for the dark-mode product dashboard.
//
// Source of truth for every visual value consumed inside /app/* and
// /agents/*. The marketing surfaces (landing page, /checkout, /merchant)
// continue to use `tokens.ts` as before; this file is a PRODUCT-surface
// sibling, not a replacement.
//
// Direction: Ramp / Rho data density + Linear minimalism + ZeniPay's
// signature green→cyan→violet gradient as brand signifier.

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

// Brand — extracted from the official ZeniPay wallet logo.
export const brand = {
  green:      "#10B981",
  greenSoft:  "#5FD068",
  cyan:       "#15B8C9",
  cyanSoft:   "#5CB3FF",
  violet:     "#7B4FBF",
  violetSoft: "#9B59F6",
  pink:       "#FF6B9D",
  orange:     "#FFA500",
} as const;

// Signature gradients. Use sparingly — hero balances, primary CTAs,
// logo text; not as a default background.
export const gradient = {
  main:     `linear-gradient(90deg, ${brand.green} 0%, ${brand.cyan} 50%, ${brand.violet} 100%)`,
  logoText: `linear-gradient(90deg, ${brand.green} 0%, ${brand.cyan} 35%, ${brand.violet} 100%)`,
  radial:   `radial-gradient(circle, ${brand.cyan} 0%, ${brand.violet} 100%)`,
  // Dark hero cards — dramatic fills for balance/ledger blocks sitting
  // on the white page.
  card:         "linear-gradient(135deg, #0F1735 0%, #1A1B3A 100%)",
  heroMerchant: `linear-gradient(135deg, #0A0B1F 0%, #13213A 50%, ${brand.cyan} 220%)`,
  heroAgents:   `linear-gradient(135deg, #0A0B1F 0%, #1A1238 50%, ${brand.violet} 220%)`,
  heroLedger:   `linear-gradient(135deg, #0A0B1F 0%, #0E1F30 50%, ${brand.cyan} 220%)`,
  // Subtle brand tints used on light cards (sidebar active row, etc).
  tintCyan:   "linear-gradient(135deg, rgba(21,184,201,0.10) 0%, rgba(21,184,201,0.02) 100%)",
  tintViolet: "linear-gradient(135deg, rgba(123,79,191,0.10) 0%, rgba(123,79,191,0.02) 100%)",
  tintGreen:  "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.02) 100%)",
} as const;

// Surfaces — light-mode first (white page with a dark gradient used on
// hero balance cards for contrast and brand presence).
export const surface = {
  bg0:         "#FFFFFF",                // page background (white)
  bg1:         "#FFFFFF",                // elevated card
  bg2:         "#F8FAFC",                // hover / inset / striped rows
  bg3:         "#F1F5F9",                // pills, inputs, chip backgrounds
  border:      "#E2E8F0",
  borderHover: "#CBD5E1",
  borderBrand: "rgba(21,184,201,0.42)",  // cyan brand border for interactive elements
  overlay:     "rgba(15,23,42,0.42)",    // modal backdrop
  // Dark hero card — used for BalanceHero and other showcase blocks that
  // need drama on a white page.
  heroInk:     "#0A0B1F",
  heroInkSoft: "#12132E",
} as const;

// Text — dark-first for white surfaces, inverse used on hero ink cards.
export const text = {
  primary: "#0A0B1F",
  muted:   "#475569",
  dim:     "#94A3B8",
  inverse: "#F4F4F8",                    // text on hero ink cards
  inverseMuted: "#9CA3C8",
} as const;

// Semantic feedback. Reuses brand where natural, but semantic ≠ brand.
export const semantic = {
  success:   brand.green,
  successBg: "rgba(16,185,129,0.12)",
  warning:   brand.orange,
  warningBg: "rgba(255,165,0,0.12)",
  danger:    "#FF5A6C",
  dangerBg:  "rgba(255,90,108,0.12)",
  info:      brand.cyan,
  infoBg:    "rgba(21,184,201,0.12)",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const font = {
  // CSS vars are wired in app/layout.tsx via next/font. The fallback chain
  // is there so tests and non-Next consumers still render cleanly.
  sans:    "var(--font-inter), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  display: "var(--font-fraunces), 'Fraunces', Georgia, serif",
  mono:    "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

// Weight: regular 400, medium 500, semibold 600, bold 700.
export const weight = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;

// Tabular-nums for every financial number. Apply via bankingAmount.* styles.
export const amountStyle = {
  base: {
    fontFamily: font.sans,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "ss01" 1' as const,
    letterSpacing: "-0.01em",
    fontWeight: weight.medium,
  },
  large: {
    fontFamily: font.sans,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "ss01" 1' as const,
    letterSpacing: "-0.02em",
    fontWeight: weight.semibold,
  },
  hero: {
    fontFamily: font.display,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1, "lnum" 1' as const,
    letterSpacing: "-0.035em",
    fontSize: 72,
    lineHeight: 1,
    fontWeight: weight.semibold,
  },
  mono: {
    fontFamily: font.mono,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1' as const,
    fontWeight: weight.medium,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing (4pt grid)
// ---------------------------------------------------------------------------

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96 } as const;

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------

export const radius = {
  xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 999,
} as const;

// ---------------------------------------------------------------------------
// Elevation / shadows / glows
// ---------------------------------------------------------------------------

export const elevation = {
  none: "none",
  sm:   "0 1px 2px rgba(15,23,42,0.06)",
  md:   `0 4px 16px rgba(15,23,42,0.08), 0 0 0 1px ${surface.border}`,
  lg:   `0 18px 48px rgba(15,23,42,0.12), 0 0 0 1px ${surface.border}`,
  // Hero ink cards sit on a dark fill so their shadow can be deeper.
  heroInk: "0 24px 60px rgba(10,11,31,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
  glowCyan:   "0 0 32px rgba(21,184,201,0.18)",
  glowViolet: "0 0 32px rgba(123,79,191,0.18)",
  glowGreen:  "0 0 32px rgba(16,185,129,0.18)",
  focus:      "0 0 0 3px rgba(21,184,201,0.32)",
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const motion = {
  fast:      "120ms cubic-bezier(0.16, 1, 0.3, 1)",
  base:      "200ms cubic-bezier(0.16, 1, 0.3, 1)",
  slow:      "320ms cubic-bezier(0.16, 1, 0.3, 1)",
  pageFade:  { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  listStagger: 0.05,
} as const;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export const breakpoint = {
  sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536,
} as const;

// ---------------------------------------------------------------------------
// Z-index
// ---------------------------------------------------------------------------

export const zIndex = {
  base: 0, sticky: 10, dropdown: 20, fixed: 30, overlay: 40, modal: 50,
  toast: 60, popover: 70, tooltip: 80,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAD_LOCALES: Record<string, string> = {
  CAD: "en-CA", USD: "en-US", EUR: "de-DE", GBP: "en-GB", USDC: "en-US",
};

export function fmtCurrency(amount: number, currency: string = "CAD", locale?: string): string {
  const loc = locale ?? CAD_LOCALES[currency] ?? "en-CA";
  try {
    const formatted = new Intl.NumberFormat(loc, {
      style: "currency",
      currency: currency === "USDC" ? "USD" : currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return currency === "USDC" ? formatted.replace("$", "") + " USDC" : formatted;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function fmtCurrencyShort(amount: number, currency: string = "CAD"): string {
  const loc = CAD_LOCALES[currency] ?? "en-CA";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency", currency: currency === "USDC" ? "USD" : currency,
      notation: "compact", maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${(amount / 1000).toFixed(1)}k ${currency}`;
  }
}

export function fmtDate(iso: string | Date | null | undefined, locale = "en-CA"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function fmtDateTime(iso: string | Date | null | undefined, locale = "en-CA"): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function greeting(firstName?: string | null, now = new Date()): string {
  const h = now.getHours();
  const part = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return firstName ? `${part}, ${firstName}` : part;
}

// ---------------------------------------------------------------------------
// Convenience export
// ---------------------------------------------------------------------------

export const zp = {
  brand, gradient, surface, text, semantic,
  font, weight, amountStyle,
  space, radius, elevation, motion, breakpoint, zIndex,
  fmtCurrency, fmtCurrencyShort, fmtDate, fmtDateTime, greeting,
} as const;

export default zp;
