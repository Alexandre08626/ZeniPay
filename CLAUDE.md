# ZeniPay — Repo conventions for Claude sessions

## Pre-push validation (non-negotiable)

Before every `git push`, run:

```bash
rm -rf .next && npm run build
```

**`vitest` and `tsc --noEmit` are NOT substitutes.** They use the
incremental cache and skip `scripts/`, `.next/types/`, and Next.js
route-collection. A deploy can fail on Vercel while all three pass locally.

Only `next build` (clean cache) reproduces what Vercel runs:
- TypeScript with Next.js' own includes (`**/*.ts`)
- Route metadata collection
- Static page generation
- Client/server boundary validation
- Bundle tree-shaking

## Common build-only errors

| Symptom on Vercel | Fix |
|---|---|
| `Duplicate function implementation` in `scripts/*.ts` | `scripts/**` is excluded from `tsconfig.json` — keep it that way. Dev scripts use their own tool. |
| `Module not found` in a client component | Import chain is pulling a server-only module (service_role Supabase, node:crypto) into a `"use client"` file. Split the file or move the server logic behind a fetch. |
| `Cannot find module '@/lib/...'` | Paths alias only works inside `**/*.{ts,tsx}`. Scripts outside tsconfig.include don't get the alias. |
| Works in `vitest` but fails build | Vitest uses `vitest.config.ts` which has its own `include`. Don't trust it for build readiness. |

## Agents module layout (Phase 1 + 2)

- `agents.*` Postgres schema (see `supabase/migrations/20260421*.sql`)
- `lib/agents/*` — pure logic + service-role DB client
- `app/api/v1/agents/*` — REST routes
- `app/agents/*` — dashboard UI (client components)
- `components/agents/*` — shared UI atoms
- `scripts/bootstrap-system-user.ts`, `scripts/refresh-fx.ts` — one-shot, not part of the Next.js build

Never modify `app/app/*` (ZenivaComplete), `app/api/zenipay/*`, `app/api/finix/*`,
`modules/zenipay/*`, or `public.zenipay_*` tables from agents code.
Read-only imports of `modules/zenipay/gateways/finix.ts` are OK when we need
to charge a card for a treasury top-up.
