# PR 9 — ACH IN / Interac / Settlement audit

Branch ref: `00d45bb` (Merge PR 9 — ACH IN + Interac + Settlement manuel via Finix)
Audit date: 2026-04-24

## Routes shipped by PR 9

| Path | Verb | Real Finix call? | Notes |
|---|---|---|---|
| `app/api/v1/merchant/funding/ach/route.ts` | POST | YES | `createBankAccountInstrument` + `createACHDebit` (operation_key `SALE`). Validates routing 6-12 digits, account 4-20. Stores last-3 masked routing. |
| `app/api/v1/merchant/funding/ach/verify/[id]/route.ts` | GET | YES | `getACHDebit` against `/transfers/:id` |
| `app/api/v1/merchant/funding/interac/route.ts` | POST | YES | `createInteracRequest` — currently returns 422 INVALID_FIELD on sandbox (see CAPABILITIES) |
| `app/api/v1/merchant/finix-balance/route.ts` | GET | YES | `getMerchantBalance` against `/merchants/:id` |
| `app/api/v1/merchant/settlements/trigger/route.ts` | POST | YES | `createSettlement` against `/identities/:id/settlements` |
| `app/api/v1/merchant/settlements/route.ts` | GET | YES | `listSettlements` |
| `app/api/webhooks/finix-to-zenicore/route.ts` | POST | YES | HMAC-verified. Routes through `zc_ingest_finix_transfer` SQL wrapper. **Was 404 in prod until PR 16** — moved out of `_webhooks/` (private folder). |

## Real vs stub

Mostly real. Two important gaps:

1. **PR 15 payouts/request is a stub.** `app/api/v1/merchant/payouts/request/route.ts:117` checks `FINIX_PAYOUT_OPERATION_KEY` to decide between `pending` and `processing` — but the route never actually fires the Finix transfer. It debits `zenipay_accounts`, inserts `zenipay_payout_requests`, inserts a ledger row, then returns. No `/transfers` POST happens. The `finix-payout` webhook will therefore never receive a matching event.

2. **Interac call shape may be wrong.** Sandbox returns `{"code":"INVALID_FIELD","message":"One and only one of the fields { source, destination } should be sent"}` on the current payload. The client posts `payment_method: "INTERAC"` + `buyer_identity` but Finix wants either `source` (a payment instrument id) or `destination`. Likely the route should first POST a hosted instrument (or a checkout) and then create the transfer with `source: <instrument_id>`. Needs a Finix doc check or a Riaz ping to confirm the supported flow.

## Env vars referenced by PR 9 + PR 15 code

| Var | Where | Required for | Sandbox set? | Notes |
|---|---|---|---|---|
| `FINIX_API_USERNAME` | `lib/finix/config.ts` | All Finix calls | YES (`USb5pXpQU83DTBeECeHzwfnZ`) | |
| `FINIX_API_PASSWORD` | `lib/finix/config.ts` | All Finix calls | YES | |
| `FINIX_ENV` | `lib/finix/config.ts` | Picks sandbox vs live URL | YES (`sandbox`) | Set to `production` for live |
| `FINIX_APPLICATION_ID` | `lib/finix/config.ts` | Not used by PR 9 routes (only checkout) | YES | |
| `FINIX_MERCHANT_ID` | `lib/finix/config.ts` | ACH/Interac transfers | YES (sandbox `MUcTenaz...`) | **Needs prod value `MUk4zVL1MevHw3VkieE6nq81`** for live |
| `FINIX_MERCHANT_IDENTITY_ID` | `lib/finix/config.ts` | Settlement create + bank-account instrument | YES (sandbox `IDoCxHhKh8e...`) | **Needs prod value `IDS2xyDx1hn8PiGcYaWkjE6A`** |
| `FINIX_WEBHOOK_SECRET` | `webhooks/finix-to-zenicore`, `webhooks/finix-payout` | HMAC verify | YES | |
| `FINIX_PAYOUT_OPERATION_KEY` | `payouts/request` | Switches status pending → processing (does NOT actually fire transfer — see stub note above) | — | Even if set, payout still won't move money |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | many | DB writes | YES | |

No new env vars are technically required to run PR 9 in prod. To switch to prod Finix, only `FINIX_ENV=production`, `FINIX_API_USERNAME` (prod), `FINIX_API_PASSWORD` (prod), `FINIX_MERCHANT_ID` (prod), `FINIX_MERCHANT_IDENTITY_ID` (prod), `FINIX_WEBHOOK_SECRET` (prod) need to be flipped.

## Known fixed-since-PR9

- `_webhooks/` private-folder routing bug → moved to `webhooks/` in PR 16. Finix dashboard webhook URL must be updated to `https://zenipay.ca/api/webhooks/finix-to-zenicore`.
