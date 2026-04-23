# Card rail — treasury funding guide

How Money IN works on the `card` rail (Finix SALE) for the ZeniPay Agents
product. Shipped in PR 8.

## Architecture

```
┌───────────────────┐   TK         ┌───────────────────┐
│  /agents/treasury │ ───────────> │  /agents/treasury │
│  /fund (Finix.js) │              │  /fund-sources    │ → POST
└───────────────────┘              │  POST             │   finix_token
                                   └────────┬──────────┘
                                            │ TK → PI
                                            ▼
                                   Finix /payment_instruments
                                            │
                                            │ PI, identity, last4
                                            ▼
                                   zc_register_funding_source()
                                            │
                                            ▼
                                   zenicore.funding_sources
                                   (status: pending_verification
                                             → verified via
                                       zc_verify_funding_source)

┌───────────────────────────────────────────────────────────────┐
│  /agents/treasury/fund/card — hot path                        │
│                                                               │
│  1. Resolve source — rail='card', status='verified', org,     │
│     currency match.                                           │
│  2. Finix POST /transfers SALE                                │
│     tags: { zenipay_organization_id, zenipay_funding_source_id │
│             zenipay_purpose='agents_treasury_fund' }          │
│     idempotency_id: request Idempotency-Key header.           │
│  3. Finix → SUCCEEDED: route calls zc_ingest_funding_event    │
│     synchronously. Returns {tx_group, event_id}.              │
│     Finix → PENDING: route returns pending=true. Webhook      │
│     will credit once the final SUCCEEDED event arrives.       │
│     Finix → FAILED / throw: write a 'failed' funding_event    │
│     and return 402.                                           │
└───────────────────────────────────────────────────────────────┘

                        Finix webhook: transfer.succeeded / transfer.updated
                                            │
                                            ▼
                        /api/zenipay/webhooks/finix/route.ts
                                            │
                                            │ tags.zenipay_purpose === "agents_treasury_fund"?
                                            ▼
                                    tryRouteTreasuryFund()
                                            │
                                            ▼
                                zc_ingest_funding_event()
                                            │
                                            ▼
                          zenicore.funding_events state='credited'
                          + journal entries (debit external_inbound,
                            credit org_treasury) in one tx_group
```

## Tokenization (Finix.js)

The merchant page loads `https://js.finix.com/v/1/finix.js` and instantiates
a `Finix.CardTokenForm` bound to our `NEXT_PUBLIC_FINIX_APPLICATION_ID`.
The user enters card data in Finix-hosted iframes; we never see the PAN.

On submit Finix.js returns a TK token (`TK_...`). We POST this token to
`/api/v1/agents/treasury/fund-sources`, which exchanges it for a persistent
`PI_...` via Finix `/payment_instruments` using the platform identity
(`FINIX_MERCHANT_IDENTITY_ID`). The PI + identity + last4 are stored in
`zenicore.funding_sources`.

TK tokens expire 30 minutes after creation — run the tokenize → register
→ verify sequence in one go.

## Finix tags contract

Every `/transfers` SALE issued from `/agents/treasury/fund/card` must carry:

```jsonc
{
  "tags": {
    "zenipay_organization_id": "org_...",
    "zenipay_funding_source_id": "fs_...",
    "zenipay_purpose": "agents_treasury_fund"
  },
  "idempotency_id": "fund-<timestamp>-<rand>"
}
```

The webhook handler uses `zenipay_purpose` to decide whether to route the
transfer to the funding ingestor or the legacy merchant invoice flow.
Without these tags, the SUCCEEDED event is treated as a merchant payment
(existing behavior, not changed by PR 8).

## Debugging funding_events.state = 'failed'

1. Pull the row from `zenicore.funding_events` via
   `zc_list_funding_events(p_organization_id, 500)`.
2. Read `raw_payload.finix_error` — Finix returns a human-readable message
   like `Card declined: insufficient_funds`.
3. Cross-check `finix_payment_logs` for the matching `payment_id` — the
   webhook logs one row per terminal state.
4. If the hop was never logged, Finix didn't reach our webhook URL: check
   `FINIX_WEBHOOK_SECRET` is configured for the environment and the signature
   header matches.

## Common Finix error codes

| Finix reason              | Surface to user as        |
|---------------------------|---------------------------|
| `insufficient_funds`      | Card declined — insufficient funds |
| `invalid_card`            | Card number invalid or expired |
| `card_blocked`            | Card blocked by issuer |
| `fraud_suspected`         | Declined for fraud review |
| `3ds_authentication_required` | 3D Secure required — we'll surface `three_d_secure_redirect_url` and rely on Finix's redirect flow (not yet wired in PR 8) |
| `pickup_card`             | Card reported lost/stolen — contact issuer |

All other decline reasons surface verbatim as the `reason` column on the
history page.

## Environment variables

| Name                                  | Purpose                                   |
|---------------------------------------|-------------------------------------------|
| `NEXT_PUBLIC_FINIX_APPLICATION_ID`    | Finix.js CardTokenForm application id     |
| `NEXT_PUBLIC_FINIX_ENV`               | `production` or empty (defaults to sandbox) |
| `FINIX_MERCHANT_ID`                   | Processor merchant id for SALE transfers  |
| `FINIX_MERCHANT_IDENTITY_ID`          | Identity used for TK → PI exchange        |
| `FINIX_API_USERNAME` / `FINIX_API_PASSWORD` | Basic auth for Finix API            |
| `FINIX_WEBHOOK_SECRET`                | HMAC secret for webhook signature         |

## Running the E2E test

```bash
AGENTS_FUNDING_E2E=1 \
BASE_URL=https://<preview>.vercel.app \
E2E_ORG_ID=org_... \
E2E_USER_ID=<uuid> \
E2E_FINIX_SANDBOX_SUCCESS_PI=PI_... \
E2E_FINIX_SANDBOX_DECLINE_PI=PI_... \
E2E_FINIX_IDENTITY_ID=ID_... \
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npx vitest run tests/funding-card-e2e.test.ts
```

Without `AGENTS_FUNDING_E2E=1` the whole file is `describe.skip`, so it's
safe to leave in the default vitest include path.
