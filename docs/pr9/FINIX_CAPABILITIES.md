# Finix capability probe — sandbox

Probed: 2026-04-24
Merchant: `MUcTenaz57m9JrwwRZwpSfDc` (sandbox)
Identity: `IDoCxHhKh8e1M1MjeW3RDoKD` (sandbox)
API: `https://finix.sandbox-payments-api.com`, `Finix-Version: 2022-02-01`
Auth: HTTP Basic with `FINIX_API_USERNAME` / `FINIX_API_PASSWORD`

## Merchant flags relevant to PR 9 / PR 15

| Field | Value | Implication |
|---|---|---|
| `country` | USA | Not Canadian — Interac will not work against this merchant |
| `currencies` | `["USD"]` | No CAD support; Interac request must be CAD |
| `disbursements_ach_pull_enabled` | **false** | ACH IN (debit a customer's bank) — currently disabled |
| `disbursements_ach_push_enabled` | **false** | ACH OUT (third-party payouts) — currently disabled |
| `disbursements_card_pull_enabled` | false | Card pull disbursement — disabled |
| `disbursements_card_push_enabled` | false | Card push to recipient card — disabled |
| `instant_payouts_card_push_enabled` | false | Instant card push — disabled |
| `disbursements_same_day_ach_*_enabled` | false | Same-day ACH — disabled |
| `gross_settlement_enabled` | false | — |
| `processing_enabled` | true | Card sales work |
| `ready_to_settle_upon` | `PROCESSOR_WINDOW` | Auto-settle on processor schedule (manual `POST /settlements` may conflict — needs Riaz to confirm) |
| `processor` | `DUMMY_V1` | Sandbox dummy — does not move real money |
| `onboarding_state` | APPROVED | |

## Empirical sandbox transfer history (5 most recent)

```
TRv2EbXY... SUCCEEDED 970.40 USD op=STANDARD_MERCHANT_FUNDING_PUSH_TO_ACH type=CREDIT
TR3qyCvu... SUCCEEDED  29.60 USD op=None                                  type=CREDIT
TRmnmC7s... SUCCEEDED 500.00 USD op=CARD_NOT_PRESENT_SALE                 type=DEBIT
TRhp94pR... SUCCEEDED 500.00 USD op=CARD_NOT_PRESENT_SALE                 type=DEBIT
TRwj7D6x... SUCCEEDED 485.87 USD op=STANDARD_MERCHANT_FUNDING_PUSH_TO_ACH type=CREDIT
```

What this tells us:

- Card sales work on the sandbox merchant (operation `CARD_NOT_PRESENT_SALE`).
- The sandbox HAS executed `STANDARD_MERCHANT_FUNDING_PUSH_TO_ACH` transfers — these are the merchant→bank settlement leg, fired by Finix on the processor window. They are NOT the disbursements that the `disbursements_ach_*_enabled` flags gate.
- No `SALE` operation_key transfer of `type=DEBIT` is in history — i.e., **no ACH IN (PR 9 funding) has ever succeeded against this merchant**. The capability flag `disbursements_ach_pull_enabled=false` matches.
- No third-party `STANDARD_MERCHANT_FUNDING_PUSH_TO_ACH` to a non-merchant identity (i.e., a payout to an external recipient) is in history.

## Settlement listing

Five historical settlements present, including refunded/negative-total entries. `state=null` on all of them — manual settlement create may not be the right shape, or the field is hidden in this listing format. Investigated separately.

```
ST...SrW   total=$1,000.00 USD
ST...bnaM  total=$501.00   USD
ST...RQ6x  total=$500.00   USD
ST...q1mj  total=$1,500.00 USD
ST...zXWPf total=−$35,555.52 USD  (reversed/refunded)
```

## Probe: ACH bank-account instrument

`POST /payment_instruments` with our shape:

```json
{ "type": "BANK_ACCOUNT", "identity": "...", "account_type": "CHECKING",
  "account_number": "123456789", "bank_code": "021000021",
  "name": "PR9 Capability Probe", "country": "USA" }
```

Result: **success**, instrument `PI9HAFzKwyU7yQUtbgzByajV` returned, masked `XXXXX6789`. So the instrument-create leg of PR 9 is correctly shaped.

Next step (firing the SALE transfer with that instrument as `source`) was NOT executed in the audit because it would actually try to debit a fake bank — the sandbox would 422 (capability disabled) or simulate a successful debit, neither of which is useful without confirming the production capability state.

## Probe: Interac

`POST /transfers` with our current shape (no `source` field):

```json
{ "merchant": "...", "amount": 100, "currency": "CAD",
  "operation_key": "SALE", "payment_method": "INTERAC",
  "buyer_identity": {...} }
```

Result: 400 `INVALID_FIELD` — `"One and only one of the fields { source, destination } should be sent"`.

This suggests `lib/finix/interac-client.ts` is **missing a step**: the Interac flow likely needs us to first create a hosted-checkout / token-issuing call that yields an instrument id, then create the transfer with `source: <instrument_id>`. The current shape is incorrect on the SALE side.

## Required for prod activation

1. **Confirm with Riaz** (Finix) that prod merchant `MUk4zVL1MevHw3VkieE6nq81` has:
   - `disbursements_ach_pull_enabled: true` for ACH IN (funding)
   - `disbursements_ach_push_enabled: true` for ACH OUT (payouts)
   - CAD support + Interac entitlement on the prod identity
2. **Confirm Interac flow shape** with Riaz — we suspect a hosted-instrument step is missing.
3. **Update env vars on Vercel** to switch from sandbox to prod (see MISSING_ENV_VARS.md).
4. **Update Finix dashboard webhook URLs** to:
   - `https://zenipay.ca/api/webhooks/finix-to-zenicore` (was `_webhooks/...` which 404s)
   - `https://zenipay.ca/api/webhooks/finix-payout`
