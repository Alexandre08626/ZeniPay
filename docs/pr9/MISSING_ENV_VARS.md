# PR 9 — env var gap before live activation

## Required to switch from sandbox → prod

These exist in Vercel today (sandbox values per `.env.production.local`); they need to be **rotated** to the prod values Riaz provides.

| Var | Current (sandbox) | Required for prod |
|---|---|---|
| `FINIX_ENV` | `sandbox` | `production` |
| `FINIX_API_USERNAME` | `USb5pXpQU83DTBeECeHzwfnZ` | (prod username from Riaz) |
| `FINIX_API_PASSWORD` | `2465471f-0d60-473f-847f-61f46141e346` | (prod password from Riaz) |
| `FINIX_MERCHANT_ID` | `MUcTenaz57m9JrwwRZwpSfDc` | `MUk4zVL1MevHw3VkieE6nq81` |
| `FINIX_MERCHANT_IDENTITY_ID` | `IDoCxHhKh8e1M1MjeW3RDoKD` | `IDS2xyDx1hn8PiGcYaWkjE6A` |
| `FINIX_APPLICATION_ID` | `APtwKWGqFSEfsecvWcphUgbR\n` (note trailing `\n`!) | `APhu13fXtZxMVSCL3F4iSDTZ` |
| `FINIX_WEBHOOK_SECRET` | `Zeniva2605220729!` | (likely a different prod secret) |

**Note:** `FINIX_APPLICATION_ID` currently has a trailing `\n` literal in `.env.production.local` line 10. That's a bug from the Vercel CLI import — should be cleaned up when the prod value is set.

## Optional (only matters if turned on)

| Var | Set today? | What it does |
|---|---|---|
| `FINIX_PAYOUT_OPERATION_KEY` | not set | Toggles PR 15 payout status from `pending` → `processing`. **Note: even if set, the payout route does not actually fire a Finix transfer** — see AUDIT.md "Real vs stub". Setting this without fixing the route will display a misleading `processing` state for payouts that never move money. |

## Not currently used / not required

- `STRIPE_ISSUING_*` — only matters for PR 16 (merchant virtual cards). Off by default.
- `FINIX_CARD_ISSUING_ENABLED` — only matters for PR 16. Off by default.

## Procedure (Alex runs)

```bash
# Sandbox preview unchanged; rotate prod values one at a time:
vercel env rm  FINIX_ENV production
vercel env add FINIX_ENV production         # → production

vercel env rm  FINIX_API_USERNAME production
vercel env add FINIX_API_USERNAME production # → prod username

vercel env rm  FINIX_API_PASSWORD production
vercel env add FINIX_API_PASSWORD production # → prod password

vercel env rm  FINIX_MERCHANT_ID production
vercel env add FINIX_MERCHANT_ID production  # → MUk4zVL1MevHw3VkieE6nq81

vercel env rm  FINIX_MERCHANT_IDENTITY_ID production
vercel env add FINIX_MERCHANT_IDENTITY_ID production # → IDS2xyDx1hn8PiGcYaWkjE6A

vercel env rm  FINIX_APPLICATION_ID production
vercel env add FINIX_APPLICATION_ID production  # → APhu13fXtZxMVSCL3F4iSDTZ (no trailing \n)

vercel env rm  FINIX_WEBHOOK_SECRET production
vercel env add FINIX_WEBHOOK_SECRET production  # → prod secret from Finix

# Then trigger a redeploy (any push to main, or:)
vercel --prod
```

I (Claude) am not running these — they affect prod and you should pick the moment + double-check the values yourself.
