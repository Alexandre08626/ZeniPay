# ZeniPay Design System

Source-of-truth tokens for every visual decision. One rule:
**if you're reaching for a value that's not here, you're wrong.** Snap to the nearest
token. If the nearest token feels meaningfully off, open the design-tokens discussion
in #design-system BEFORE adding a new step.

## File map

| File | Use |
|---|---|
| `tokens.ts` | TS/JSX consumers. Typed. Import `color`, `spacing`, `radius`, `shadow`, `font`, `fontSize` etc. |
| `globals.css` | CSS variables on `:root` mirroring `tokens.ts`. Also carries the scope-bounded reset for the `.zp-root` wrapper used by marketing pages. |
| `README.md` | This. |

## Consumption patterns

### Inside a React component

```tsx
import { color, spacing, radius, shadow, font, fontSize } from "@/lib/design-system/tokens";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: color.white,
        border: `1px solid ${color.border}`,
        borderRadius: radius.md,
        boxShadow: shadow.sm,
        padding: `${spacing[5]} ${spacing[5]}`,
        fontFamily: font.sans,
        fontSize: fontSize.sm.size,
        lineHeight: fontSize.sm.line,
      }}
    >
      {children}
    </div>
  );
}
```

### Inside plain CSS / Tailwind / styled-components

```css
.card {
  background: var(--zp-white);
  border: 1px solid var(--zp-border);
  border-radius: var(--zp-radius-md);
  box-shadow: var(--zp-shadow-sm);
  padding: var(--zp-space-5);
  font-family: var(--zp-font-sans);
}
```

Tailwind's theme is wired to these vars — `bg-white`, `border-border`,
`rounded-md`, `shadow-sm`, `p-5` etc. all resolve via `var(--zp-*)`.

## Non-negotiables

### Color
- **Two text colors dominate**: `color.textHeading` (#0a0a0a) for titles and key numbers,
  `color.textBody` (#525252) for paragraphs. Use `textMuted` and `textSubtle` only for
  hints/timestamps/disabled.
- **Signature gradient = accent, not decoration.** Max ONE gradient CTA + ONE gradient
  headline word per page. Never on borders, never on large surfaces, never on pills
  (use solid brand colors for pills).
- **Feedback states stay literal** — `color.danger` for errors, `color.success` for OK,
  `color.warn` for attention, `color.info` for neutral notices. No siblings, no tints.

### Spacing
- Strict 8pt grid. `spacing[1]` (4px) and `spacing[3]` (12px) are half-steps
  allowed ONLY for icon gaps and pill padding — never for layout.
- Between cards / sections: `spacing[5]` (24px) minimum.
- Around hero sections: `spacing[8]` (48px) minimum vertical.

### Radius
- `radius.xs` (4px) → text inputs, selects, file uploads
- `radius.sm` (6px) → buttons
- `radius.md` (8px) → cards, table rows, list items
- `radius.lg` (12px) → hero sections, pricing cards
- `radius.xl` (16px) → modals only
- `radius.pill` (999px) → tags, status badges, segmented controls

### Shadow
- `shadow.sm` → flat cards sitting on `color.surface`
- `shadow.md` → cards sitting on `color.white` that need to read as elevated
  (dropdowns, command menus, tooltips)
- `shadow.lg` → modals
- `shadow.focus` → focus-visible rings only

### Typography
- **Inter for everything UI-side** (`font.sans`). Dashboard, buttons, inputs, tables, data viz.
- **Fraunces for marketing headlines** (`font.serif`). Landing page, pricing page, security page hero. NEVER inside the dashboard.
- **Monospace for numeric emphasis only** (`font.mono`). Card numbers, IDs, hashes.
- Headings always get `letter-spacing: -0.02em` or tighter (see `fontSize[hN].tracking`).
- Body copy NEVER below 14px. Supporting text NEVER below 12px.

### Transitions
- Default: 150ms ease-out.
- Fast interactions (hover color changes): 120ms.
- State transitions (open/close modal, toast in/out): 240ms.
- **Transform hover effect max**: `scale(1.01)` or `translateY(-1px)`. Nothing bouncier.

## What this file does NOT own (yet)

- **Dark mode**: not in scope for the investor-meeting push. `:root` holds light-mode values; a future `.zp-dark` selector can override.
- **Component library**: `components/agents/ui/*` lives separately. This file owns the raw primitives those components consume.
- **Motion system**: beyond the 3 timings above, future Framer Motion presets are out of scope.
- **Print styles**: not needed.

## When adding a new value

1. Check the existing scale FIRST. 95% of the time the nearest step is what you actually want.
2. If you really need a new value, add it to `tokens.ts` AND `globals.css` in the same commit.
3. Document the use case in this file's changelog below.
4. Bump nothing — these tokens are additive-only; removing or renaming breaks consumers.

## Changelog

- **2026-04-22** — initial tokens for the Stripe-level polish (Phase 1). Established 8pt
  spacing grid, 5-step radius scale, 3-shadow elevation, Inter + Fraunces typography,
  brand gradient signature.
