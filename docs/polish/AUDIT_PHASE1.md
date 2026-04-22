# Phase 1 Visual Audit — ZeniPay Agents Dashboard

> Pre-polish snapshot of `/agents/*` routes. Everything below is what the new
> design system has to make irrelevant. Cross-referenced against the Phase 1
> invariants spec.

**Scanned scope**: 25 pages under `app/agents/**/page.tsx` + shared shell at
`components/agents/Shell.tsx`.

**Tooling state at audit time**:
- No Tailwind.
- No next/font — body font set via inline `-apple-system, BlinkMacSystemFont, 'Segoe UI'` in `app/layout.tsx:228`.
- All dashboard pages render via inline `style={{…}}`.
- Shared tokens exist at `components/agents/theme.ts` (PAGE_BG, CARD_BG, BORDER, TEXT, MUTED, LIGHT, ZP_GREEN, ZP_CYAN, ZP_PURPLE, ZP_GRAD) — consumed by most pages, BYPASSED by many.

---

## 1. Quantitative scan

| Metric | Count | Notes |
|---|---|---|
| `#[0-9a-f]{3,6}` hardcoded hex in `app/agents/**` | 275 | Should all come from tokens. |
| `rgba(...)` hardcoded in `app/agents/**` | 108 | Same. |
| `@media` / breakpoint declarations in `app/agents/**` | **0** | Dashboard is desktop-only. Breaks below ~900px. |
| Inline `style={{…}}` in `app/agents/**/page.tsx` | >1000 | Every element. |
| Self-hosted fonts | 0 | System font only. |

## 2. Issues by category

### 2.1 Typography
- No web-font loaded. Body renders in whatever the user's OS picks up (San Francisco on macOS, Segoe UI on Windows, Roboto on Android). Headings have no tracking/leading opinion.
- No typography scale. H1/H2/body sizes set ad-hoc per page (`fontSize: 22`, `fontSize: 15`, `fontSize: 18`, etc.).
- No headline-vs-body distinction — everything single-family.
- Numeric-heavy UI (amounts, z-scores, currency) uses `fontFamily: "ui-monospace"` sporadically; inconsistent.

### 2.2 Color
- 275 hex literals. Most match the shared tokens but a lot drift to near-shades:
  - Success/CTA: `#2DBE60` (token) vs `#16A34A`, `#2D9D48`, `#10B981` appearing in various contexts.
  - Error: `#DC2626` consistent, but `rgba(220,38,38,*)` with 8 different alpha values (0.06, 0.08, 0.12, 0.2, etc.).
  - Warn: `#D97706` + `#F5A623` + `#F59E0B` all used interchangeably.
  - Muted text: `#64748b` (token MUTED) + `#525252` + `#94a3b8` (token LIGHT) + `#A3A3A3` — 4 shades where Stripe would have 1–2.
- Gradient overuse: `ZP_GRAD` appears as BORDERs, TEXT FILL, PILL BACKGROUND on multiple pages simultaneously. Spec allows max 1–2 per page.

### 2.3 Spacing
- Not 8pt. Values seen: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32. Half of them aren't 8pt multiples.
- Card padding: `18px 20px` in `components/agents/Shell.tsx:244`, `24px` in many pages, `20px 16px` elsewhere.
- Gap between cards: 10, 12, 14, 16, 20 — inconsistent across pages.

### 2.4 Radius
- `borderRadius: 10` dominant (Shell.Card, Metric, tiles). Spec says 8.
- Buttons: 8 in some places, 10 in others, 12 on big CTAs, 999 on pills. Pills are fine; buttons should be 6.
- Inputs: 10 everywhere. Spec says 4.

### 2.5 Shadows
- Shell.Card: `0 1px 3px rgba(15,23,42,0.04)` — close to spec's shadow-sm.
- Report detail modal uses `0 10px 30px rgba(15,23,42,0.2)` — too heavy vs spec's shadow-md (`0 4px 12px rgba(0,0,0,0.06)`).
- Multiple shadow scales in use; no shared token.

### 2.6 Transitions + hover
- Most interactive elements have NO transitions. Links change color instantly, cards don't respond to hover.
- Scattered `transition: "transform 80ms"` in `app/agents/accounting/page.tsx:147` — orphaned, no hover rule.
- No consistent `150ms ease-out` anywhere.

### 2.7 Empty states
- `/agents/approvals`: good — has icon + headline + explanatory text + link to settings.
- `/agents/accounting/reports`: good — icon + CTA.
- `/agents/accounting`: partial — uses emojis (📒, 🔀, 📊) as icons; not SVG.
- `/agents/fraud`: partial — uses emoji 🛡️, no SVG; copy changes per tab but no real visual design.
- `/agents/audit`: NO empty state — past-exports section just says "No exports yet." with no illustration or call-to-action.
- `/agents/transactions`, `/agents/api-keys`: need re-verification; likely plain.

### 2.8 Loading states
- Every page uses plain text `<p>Loading…</p>` on every load. Zero skeleton loaders. Jars when data arrives.

### 2.9 Error handling
- Errors surface via `<Card>` with red border + red text. OK but inline-only.
- No toast system. Actions that succeed silently (no feedback).
- `alert(...)` calls exist in `app/agents/accounting/chart-of-accounts/page.tsx:70` (browser-native "Delete GL account?" confirm) and reports detail page (finalize confirm). Cheap; should be replaced with styled confirm dialogs.

### 2.10 Mobile / breakpoints
- **ZERO `@media` declarations** across `app/agents/**` and `components/agents/**`.
- Shell sidebar is fixed 232px wide regardless of viewport. On narrow viewports the main content gets squeezed to unusable widths.
- Tables (reports, alerts, transactions) overflow horizontally; no responsive collapse.
- Modals (RecatModal on report detail, Resolve modal on fraud detail) take `100%` width up to 440/460 — OK at tablet width, but other layouts don't adapt.

### 2.11 Placeholder / lorem ipsum content
- No literal "Lorem ipsum" found.
- `TODO` / placeholder text search: none in `/agents`.
- BUT: the main public landing (`app/page.tsx`) serves the merchant Finix product, NOT a marketing landing. Investors hitting zenipay.ca see the merchant dashboard login/onboarding, not a product pitch. **Phase 2 fixes this.**

### 2.12 Data viz
- Fraud detail uses an inline SVG sparkline (`app/agents/fraud/[id]/page.tsx:101`). Good approach, not themed.
- Report detail "by GL" breakdown is a plain `<div>` list with percentages, no bar or donut. Legible but not "screenshots-ready" for an investor meeting.
- No charting library installed. Fine — keep inline SVG or add `recharts` only if Phase 3 needs it.

### 2.13 Tables
- Patterns consistent: `<table>` + `<thead>` with uppercase MUTED tiny labels + `<tbody>` with `borderTop: 1px solid ROW_SEP` per row. OK baseline.
- No sticky header on long tables.
- No row hover highlight except on the reports list (uses `onClick={router.push(...)}` + `cursor: pointer`).
- No pagination UI (some pages load 100/200 rows; cursor pagination exists on report detail only).

### 2.14 Navigation
- `components/agents/Shell.tsx` — sidebar with 10 items. All fit, but they're icon+label without section headers. Spec wants "Banking / Accounting / Security" groupings.
- Top bar is thin (64px), title + one "● AGENTS · PREVIEW" pill. No search, no notifications dropdown (approval + fraud badges live on the nav item itself).

### 2.15 Components directory hygiene
- Only `components/agents/Shell.tsx` + `components/agents/theme.ts`. Every page rolls its own Card/Pill/Button markup inline — 25 pages × multiple widget copies.
- Phase 3 should extract: `Card`, `Button` (primary/secondary/danger), `Input`, `Select`, `Pill`, `Toast`, `Skeleton`, `EmptyState`, `Modal` into `components/agents/ui/*`.

## 3. Merchant product (out of /agents scope but visible)
- `/app/*`, `/dashboard/*`, `/payments`, `/pay`, `/payouts`, `/login`, `/register` serve the Finix merchant product.
- Root `/` currently redirects or serves the merchant landing. **Phase 2's hardest task**: put a public marketing page at `/` without breaking merchant flows. Existing merchant users must land on `/app` or a named subpath.

## 4. What Phase 1 delivers (this commit)
1. Typed design tokens at `lib/design-system/tokens.ts`.
2. `lib/design-system/globals.css` with `:root` CSS variables + a minimal, merchant-safe reset.
3. Self-hosted Inter + Fraunces via `next/font/google`, wired through `app/layout.tsx`.
4. Tailwind 3 with **preflight DISABLED** (additive only — doesn't touch existing inline-style pages) + `tailwind.config.ts` reading from our CSS vars.
5. `lib/design-system/README.md` documenting the tokens + the "don't hardcode a value" rule.

Nothing is re-styled. Phase 2 consumes these primitives for the marketing pages; Phase 3 migrates the `/agents/*` dashboard off the inline-style hardcoded-color patterns listed above.
