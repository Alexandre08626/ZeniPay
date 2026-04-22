// ZeniPay Tailwind config.
//
// IMPORTANT: `corePlugins.preflight` is DISABLED. The existing merchant product
// (/app, /dashboard, /pay, /payouts, /register, /login …) is built on 1000+
// inline styles that assume no global reset. Enabling Tailwind's preflight
// would collapse h1-h6 margins to 0, remove list bullets, reset tables — all
// things merchant pages depend on. Every marketing page that wants the modern
// reset wraps itself in a `.zp-root` div (see lib/design-system/globals.css).
//
// Colors + spacing + radius + shadow all resolve to CSS vars from
// globals.css — we never hardcode hex in this file.

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/design-system/**/*.{ts,tsx,css}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    // Replace Tailwind's default color palette — we don't want amber / rose /
    // indigo in autocomplete. Only our tokens.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "var(--zp-white)",
      surface: "var(--zp-surface)",
      border: "var(--zp-border)",
      "border-strong": "var(--zp-border-strong)",
      heading: "var(--zp-text-heading)",
      body: "var(--zp-text-body)",
      muted: "var(--zp-text-muted)",
      subtle: "var(--zp-text-subtle)",
      brand: {
        green:  "var(--zp-brand-green)",
        cyan:   "var(--zp-brand-cyan)",
        purple: "var(--zp-brand-purple)",
      },
      success: "var(--zp-success)",
      "success-bg": "var(--zp-success-bg)",
      warn: "var(--zp-warn)",
      "warn-bg": "var(--zp-warn-bg)",
      danger: "var(--zp-danger)",
      "danger-bg": "var(--zp-danger-bg)",
      info: "var(--zp-info)",
      "info-bg": "var(--zp-info-bg)",
    },
    extend: {
      spacing: {
        0:  "var(--zp-space-0)",
        1:  "var(--zp-space-1)",
        2:  "var(--zp-space-2)",
        3:  "var(--zp-space-3)",
        4:  "var(--zp-space-4)",
        5:  "var(--zp-space-5)",
        6:  "var(--zp-space-6)",
        7:  "var(--zp-space-7)",
        8:  "var(--zp-space-8)",
        9:  "var(--zp-space-9)",
        10: "var(--zp-space-10)",
        11: "var(--zp-space-11)",
        12: "var(--zp-space-12)",
      },
      borderRadius: {
        xs:    "var(--zp-radius-xs)",
        sm:    "var(--zp-radius-sm)",
        md:    "var(--zp-radius-md)",
        lg:    "var(--zp-radius-lg)",
        xl:    "var(--zp-radius-xl)",
        pill:  "var(--zp-radius-pill)",
      },
      boxShadow: {
        none:   "var(--zp-shadow-none)",
        sm:     "var(--zp-shadow-sm)",
        md:     "var(--zp-shadow-md)",
        lg:     "var(--zp-shadow-lg)",
        focus:  "var(--zp-shadow-focus)",
      },
      fontFamily: {
        sans:  ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        mono:  ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xs:      ["12px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        sm:      ["14px", { lineHeight: "20px" }],
        base:    ["16px", { lineHeight: "24px" }],
        lg:      ["18px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        h6:      ["18px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        h5:      ["22px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        h4:      ["28px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        h3:      ["36px", { lineHeight: "44px", letterSpacing: "-0.03em" }],
        h2:      ["48px", { lineHeight: "56px", letterSpacing: "-0.03em" }],
        h1:      ["64px", { lineHeight: "72px", letterSpacing: "-0.04em" }],
        display: ["80px", { lineHeight: "88px", letterSpacing: "-0.04em" }],
      },
      transitionDuration: {
        fast: "120ms",
        base: "150ms",
        slow: "240ms",
      },
      transitionTimingFunction: {
        out: "ease-out",
      },
      backgroundImage: {
        "gradient-signature": "var(--zp-gradient-signature)",
      },
      screens: {
        sm:   "640px",
        md:   "768px",
        lg:   "1024px",
        xl:   "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
