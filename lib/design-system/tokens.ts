// ZeniPay Design System — typed tokens (source of truth).
//
// Every visual value in the app MUST come from here. No hardcoded hex
// literals, no magic spacing numbers, no one-off shadows. This file is
// the single source of truth; `globals.css` mirrors the same values
// into CSS variables for consumers that can't import TS (Tailwind
// config, plain CSS files).
//
// Invariants (spec):
//   * 8pt grid — spacing scale jumps 8, 16, 24, 32, 40, 48, 64, 80, 96.
//   * Typography: Inter for UI + body, Fraunces for marketing headlines.
//   * Neutrals dominate; signature gradient used SPARINGLY (max 1–2 per page).
//   * Radius: 8 on cards, 6 on buttons, 4 on inputs.
//   * Shadows: shadow-sm for elevation hint, shadow-md for floating surfaces.
//   * Transitions: 150ms ease-out, max transform scale(1.01) on hover.

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export const color = {
  // Neutrals — the canvas. Keep narrow; Stripe uses 6 grays total, we use 5.
  white:          "#ffffff",
  surface:        "#f8f9fa",         // page background under cards
  border:         "#e2e8f0",         // 1px separators
  borderStrong:   "#cbd5e1",         // heavier dividers (hero section boundaries)

  // Text — ONLY two shades by design.
  textHeading:    "#0a0a0a",         // headlines, card titles, key numbers
  textBody:       "#525252",         // body copy, secondary
  textMuted:      "#737373",         // helpers, hints, timestamps
  textSubtle:     "#a3a3a3",         // disabled, watermarks

  // Brand gradient stops — used as color AND inside `gradientSignature` below.
  brandGreen:     "#2dbe60",
  brandCyan:      "#15b8c9",
  brandPurple:    "#7b4fbf",

  // Feedback states — one shade each; no tinted siblings.
  success:        "#16a34a",
  successBg:      "#dcfce7",
  warn:           "#d97706",
  warnBg:         "#fef3c7",
  danger:         "#dc2626",
  dangerBg:       "#fee2e2",
  info:           "#0891b2",
  infoBg:         "#cffafe",
} as const;

export const gradientSignature =
  `linear-gradient(135deg, ${color.brandGreen} 0%, ${color.brandCyan} 50%, ${color.brandPurple} 100%)`;

// ---------------------------------------------------------------------------
// Spacing — 8pt grid
// ---------------------------------------------------------------------------
// Keep the scale short. If you find yourself reaching for a value not here,
// the answer is almost always "snap to the nearest one" — NOT adding a new step.
export const spacing = {
  0:    "0",
  1:    "4px",      // half-step, used ONLY for icon gaps
  2:    "8px",
  3:    "12px",     // half-step, for dense controls (pill padding)
  4:    "16px",
  5:    "24px",
  6:    "32px",
  7:    "40px",
  8:    "48px",
  9:    "64px",
  10:   "80px",
  11:   "96px",
  12:   "128px",
} as const;
export type SpaceToken = keyof typeof spacing;

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------
export const radius = {
  xs:     "4px",    // inputs
  sm:     "6px",    // buttons
  md:     "8px",    // cards
  lg:     "12px",   // hero sections
  xl:     "16px",   // modals
  pill:   "999px",  // rounded pills / chips
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------
export const shadow = {
  none:   "none",
  sm:     "0 1px 2px rgba(0, 0, 0, 0.04)",
  md:     "0 4px 12px rgba(0, 0, 0, 0.06)",
  lg:     "0 10px 30px rgba(0, 0, 0, 0.08)",
  focus:  `0 0 0 3px ${color.brandCyan}33`,       // focus-ring — 20% opacity of brandCyan
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------
export const transition = {
  fast:   "all 120ms ease-out",
  base:   "all 150ms ease-out",
  slow:   "all 240ms ease-out",
  transform: "transform 150ms ease-out",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
// Font FAMILIES are loaded via `next/font` in `app/layout.tsx` as CSS
// variables `--font-inter` and `--font-fraunces`. Reference them here so
// TS-side consumers get the same identity.
export const font = {
  sans:         "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
  serif:        "var(--font-fraunces), 'Fraunces', Georgia, serif",
  mono:         "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

// Scale — modular, ratio ≈ 1.25. Size unit px (keeps math obvious vs rem).
export const fontSize = {
  // body scale
  xs:     { size: "12px", line: "16px", tracking: "0.01em" },
  sm:     { size: "14px", line: "20px", tracking: "0" },
  base:   { size: "16px", line: "24px", tracking: "0" },
  lg:     { size: "18px", line: "28px", tracking: "-0.01em" },
  // heading scale
  h6:     { size: "18px", line: "24px", tracking: "-0.01em" },
  h5:     { size: "22px", line: "28px", tracking: "-0.02em" },
  h4:     { size: "28px", line: "36px", tracking: "-0.02em" },
  h3:     { size: "36px", line: "44px", tracking: "-0.03em" },
  h2:     { size: "48px", line: "56px", tracking: "-0.03em" },
  h1:     { size: "64px", line: "72px", tracking: "-0.04em" },
  // marketing display (Fraunces territory)
  display: { size: "80px", line: "88px", tracking: "-0.04em" },
} as const;

export const fontWeight = {
  regular:   400,
  medium:    500,
  semibold:  600,
  bold:      700,
  black:     800,
} as const;

// ---------------------------------------------------------------------------
// Breakpoints — mobile-first
// ---------------------------------------------------------------------------
// Use in media queries: @media (min-width: ${breakpoint.md}) {...}
export const breakpoint = {
  sm:   "640px",
  md:   "768px",
  lg:   "1024px",
  xl:   "1280px",
  "2xl": "1536px",
} as const;

// ---------------------------------------------------------------------------
// Z-index scale — document every layer.
// ---------------------------------------------------------------------------
export const zIndex = {
  base:     0,
  sticky:   10,     // sticky topbar
  dropdown: 20,
  overlay:  40,     // modal backdrop
  modal:    50,     // modal body
  toast:    60,
  popover:  70,
} as const;

// ---------------------------------------------------------------------------
// Convenience export — flat map for consumers that want token-by-key access.
// ---------------------------------------------------------------------------
export const tokens = {
  color,
  gradientSignature,
  spacing,
  radius,
  shadow,
  transition,
  font,
  fontSize,
  fontWeight,
  breakpoint,
  zIndex,
} as const;

export default tokens;
