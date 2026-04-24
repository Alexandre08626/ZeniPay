# PR 6 — Pillar 10: Issuing-as-a-Service (IaaS) Public API

> **Status: draft — uncommitted. Awaits Alex's GO.**
> Handoff notes: this plan is self-contained so whichever Claude picks it up next
> can execute without re-reading conversation history.

---

## Why this PR matters

Seven of ten pillars are in production. Pillar 10 is the one that transforms
ZeniPay Agents from a vertical product (dashboard + cards for a single org)
into **banking infrastructure** — a third-party company embeds our REST API
to issue cards for its own agents, runs its own treasury, and pays usage-based
fees. Margin on infra is 80%+; this is the feature that moves Series A conversation.

Current state:
- `zpk_live_` / `zpk_test_` API keys exist since Phase 1 (`lib/agents/api-keys.ts`).
- Keys are sha256-hashed, prefixed, scope-tagged (`agents:read`, `agents:write`,
  `payments:authorize`).
- Most `/api/v1/agents/*` routes already accept Bearer auth OR session header
  (see `app/api/v1/agents/_lib/auth.ts`).
- Unified error shape `{ error: { code, message, detail? } }` is applied to
  accounting + fraud + audit.
- One webhook exists (`/_webhooks/stripe-issuing`) with HMAC verification —
  template for outgoing signed webhooks.

PR 6 is the stability hardening + tenant-facing contract that productises what
Phase 1–2 built internally.

---

## Scope — what's in / out

### In

#### Migration 20260424_agents_iaas_public_api
- `agents.api_versions` — stable versioning registry. Columns:
  `version TEXT PK, status TEXT CHECK (status IN ('stable','deprecated','sunset')),
   released_at TIMESTAMPTZ, sunset_at TIMESTAMPTZ NULL`. Seed `'2026-04-01'`
  as the first stable version (current API).
- `agents.api_key_rate_limits` — per-key quotas. Columns:
  `api_key_id TEXT PK, rpm_limit INT, monthly_request_quota BIGINT, monthly_usage_reset_at TIMESTAMPTZ, created_by, created_at`.
  Default rpm=60, monthly=100K on new keys.
- `agents.api_request_log` — append-only usage ledger for billing + debugging.
  Columns: `id, api_key_id, organization_id, api_version, method, path, status_code, latency_ms, request_bytes, response_bytes, created_at, idempotency_key`.
  Partitioned by month? (too complex for PR 6 — defer). Plain table with a
  BRIN index on `created_at` is enough at MVP scale.
- `agents.webhook_endpoints` — per-org outbound webhook URLs.
  `id TEXT PK, organization_id, url TEXT, signing_secret_vault_id TEXT (agents.vault_create_secret-backed), subscribed_events TEXT[], status TEXT CHECK (status IN ('active','disabled','failed')), failure_count INT, last_delivered_at TIMESTAMPTZ, created_at`.
- `agents.webhook_deliveries` — per-attempt log for retry + debug.
  `id, endpoint_id, event_type, event_payload JSONB, status TEXT CHECK (status IN ('pending','delivered','failed','dead')), attempt_count INT, last_response_status INT, last_response_body TEXT, next_retry_at TIMESTAMPTZ, created_at`.

#### lib/agents/iaas/
- `versioning.ts` — `getApiVersion(req)` reads `X-ZeniPay-Version` header,
  falls back to the most recently stable. Attaches version to `AgentsAuth`
  so route handlers can branch behaviour.
- `rate-limiter.ts` — fixed-window counter per (api_key_id, minute_bucket).
  Stored in a small Redis-free table `agents.api_rate_window` with
  `(api_key_id, window_minute) PK, count INT`. Aggressive UPSERT + TTL sweep
  via a cheap cron (hourly). Decision here: using Postgres keeps stack simple.
  If latency budget is ever exceeded, swap to Upstash — the interface
  abstracts this.
- `usage-meter.ts` — writes `api_request_log` rows. Instruments every v1
  route via the shared `_lib/auth.ts` hook. Cheap: INSERT only, no SELECT.
- `webhook-signer.ts` — Stripe-style signing:
  `t=<unix_seconds>,v1=<hmac_sha256>`. Signing secret lives in Vault; we
  roll one per endpoint on creation, expose the plaintext ONCE at creation
  (same pattern as api-keys.ts).
- `webhook-dispatcher.ts` — synchronous delivery attempt with timeout
  (5s), exponential backoff (1m → 5m → 30m → 2h → 12h, max 5 attempts
  then `dead`). Called from domain write handlers (auth approved, card
  paused, expense report finalized, fraud alert raised).

#### API routes
All under `/api/v1/agents/*` — existing path, Bearer auth already works.

**Meta**
- `GET /api/v1/versions` — list api_versions rows (public, no auth required).
  Lets integrators self-service discovery.
- `GET /api/v1/agents/usage/current` — rpm_limit, rpm_used_window,
  monthly_quota, monthly_used (DB-sourced).

**Webhook endpoints**
- `GET    /api/v1/agents/webhook-endpoints`
- `POST   /api/v1/agents/webhook-endpoints` — returns plaintext signing secret ONCE.
- `PATCH  /api/v1/agents/webhook-endpoints/[id]` — url, subscribed_events, status.
- `DELETE /api/v1/agents/webhook-endpoints/[id]`
- `POST   /api/v1/agents/webhook-endpoints/[id]/test` — synthetic event,
  fires immediately so integrators can validate their endpoint.

**Deliveries (read-only debug)**
- `GET    /api/v1/agents/webhook-deliveries?endpoint_id=&status=` — paginated.

#### Middleware
- `app/api/v1/agents/_middleware.ts` (or wrapper applied in every route's
  try/catch) — the stable path:
  1. Rate-limit check (skip for session auth — dashboard users use a
     different budget).
  2. Version resolution → attach to auth context.
  3. Usage-meter INSERT deferred to the background (fire-and-forget).
  4. Audit-log routes that mutate state.

Because Next.js App Router middleware is limited for complex DB work, the
cleanest pattern is a helper `withApiContract(req, handler)` that wraps
`authenticate()` + rate-limit + usage meter. Existing accounting routes
adopt it incrementally — non-breaking.

#### Cron
- `/api/v1/agents/_internal/prune-rate-window-tick` — hourly DELETE
  WHERE window_minute < NOW() - '90 min'. Keeps the table tiny.
- `/api/v1/agents/_internal/retry-failed-webhooks-tick` — every 5 min,
  picks `status='failed' AND next_retry_at <= NOW()`, retries, bumps
  attempt_count, marks `dead` if max reached.

Both protected by dedicated env vars (`AGENTS_IAAS_CRON_SECRET`,
distinct from the existing three).

#### UI
- `/agents/api` — new top-level section in the sidebar (between API Keys
  and any future). Tabs:
  - **Keys**: existing page promoted. Add rate-limit + monthly-quota display.
  - **Webhooks**: endpoints CRUD + test button + delivery logs.
  - **Usage**: spend chart, requests-over-time, top endpoints, 429 counts.
  - **Versions**: public version table + "Pin to version" per-key toggle.

No drastic re-theme. White palette, ZeniPay gradient accents.

#### Tests
- `versioning.test.ts` — header parsing, fallback to latest stable, reject
  sunset versions.
- `rate-limiter.test.ts` — concurrent bucket increments, window rollover.
- `webhook-signer.test.ts` — Stripe-format roundtrip, 5-minute replay window
  rejection.
- `iaas-integration.test.ts` (gated AGENTS_IAAS_E2E=1): full lifecycle —
  create api key → create webhook endpoint → trigger a fraud_alert from
  Pillar 7's flow → assert webhook delivered + signed → retry on failure.

#### Docs
- `docs/agents/API_REFERENCE.md` — Stripe-style API reference.
- `docs/agents/WEBHOOK_GUIDE.md` — signing format, retry schedule, event catalog.
- `docs/agents/PRICING.md` — usage-based billing reference
  (request count × tier + per-card monthly fee + FX spread).

### Out (deferred to PR 7+)

- **OAuth / PKCE for third-party user consent** — public IaaS for PR 6
  assumes the integrator is the tenant. Agent-as-a-service for *third-party
  end users* is a separate product layer.
- **SDKs** (Node, Python, Go) — hand-written clients are out of scope.
  Publish a well-designed REST contract; the SDKs fall out.
- **Sandbox-mode billing** — test keys don't generate real usage charges.
  Only `zpk_live_` writes to `api_request_log.billed_amount_cents`.
- **GraphQL / RPC** — REST only. Webhooks optional.
- **Stripe-ish dashboard events log UI** — the raw `api_request_log` +
  `webhook_deliveries` tables are debug enough for MVP.

---

## Architectural non-negotiables

- **Zero regression on merchant Finix product.**
- **Zero changes to authorize.ts hot path** — the IaaS middleware wraps
  auth, not the core decision engine.
- **API versioning is a one-way door** — once a version is `stable`,
  breaking changes require a new version number, not a mutation. Add
  fields additively; `X-ZeniPay-Version` is the only versioning signal.
- **Webhook signing is Stripe-compatible format** — integrators who have
  Stripe webhook verification code can port with minimal rewrites.
- **Rate limits are conservative by default, bump on request** — 60 rpm
  / 100K monthly covers every legitimate integration pattern we've seen
  in Phase 1–2. Integrators asking for more get CFO review first.
- **Every route emits unified `{ error: { code, message, detail? } }`** —
  promote `app/api/v1/agents/_lib/errors.ts` helpers to be the global standard.
- **Append-only `api_request_log`** — never UPDATE/DELETE. Use the same
  trigger pattern as `agent_audit_log`.
- **Idempotency-Key header is respected on all POST** — returns the prior
  response body if key matches. New table: `api_idempotency_keys(api_key_id,
  key TEXT, first_seen_at, response_snapshot JSONB, PRIMARY KEY
  (api_key_id, key))` with 24h TTL sweep.

---

## Open questions (flag these to Alex before starting)

1. **Rate-limit table in Postgres vs Redis?** — Postgres keeps stack simple;
   Redis is faster but adds dependency. Propose: start Postgres, instrument
   latency, escalate to Upstash only if p99 middleware latency > 20ms.

2. **Usage billing unit of measurement**: per request, per card-month, or
   hybrid? — most competitors (Unit, Synctera) go hybrid. Propose: free
   tier 10K requests/month, then $0.001/request; active card = $3/month;
   FX 50bps spread on non-USD authorizations.

3. **Sandbox behaviour** — do sandbox keys get their own `api_request_log`
   entries for testing metrics, or do we null them? Propose: write them
   with `environment='test'` column, exclude from billing aggregations.

4. **Webhook event catalog** — which domain events fire webhooks?
   Proposed initial set:
   - `card.created`, `card.paused`, `card.resumed`, `card.canceled`
   - `authorization.approved`, `authorization.declined`,
     `authorization.pending_approval`
   - `approval.requested`, `approval.resolved` (approved / denied / expired)
   - `expense_report.finalized`
   - `fraud_alert.raised`, `fraud_alert.resolved`

5. **Public discoverability of `/api/v1/versions`** — expose without auth?
   Propose yes; it's metadata, not PII. Lets curl-curious integrators
   sanity-check before onboarding.

---

## Phased delivery (mirror PR 4/PR 5 structure)

- **Part 1** — Migration + lib/agents/iaas/* + unit tests.
- **Part 2** — API routes (webhook endpoints CRUD, versions, usage, deliveries).
- **Part 3** — Middleware wrapper `withApiContract` + backfill on accounting,
  fraud, audit, cards, payments/authorize routes.
- **Part 4** — Cron routes (rate-window prune + webhook retry) +
  webhook-dispatcher call sites wired into domain events.
- **Part 5** — UI (/agents/api with Keys/Webhooks/Usage/Versions tabs)
  + docs (API_REFERENCE, WEBHOOK_GUIDE, PRICING).
- **Part 6** — E2E gated test + env var provisioning + polish + merge.

Each part: build gate (`rm -rf .next && npm run build`), commit, push,
preview-READY validation before proceeding. Merge only after Alex
validates preview.

---

## Env vars (to provision on Production + Preview before merge)

- `AGENTS_IAAS_CRON_SECRET` — 96-char hex, distinct from the three existing
  cron secrets. Protects both new crons.
- `AGENTS_WEBHOOK_MAX_CONCURRENCY` — int, default 10. Caps simultaneous
  outbound webhook POSTs to avoid head-of-line blocking if an integrator's
  endpoint is slow.

No new Vault secrets besides per-endpoint signing keys, which are
auto-created by the webhook-endpoints POST route.

---

## Known risks to call out with Alex

1. **Backfilling `withApiContract` on existing routes touches a lot of files.**
   Recommend an opt-in flag: `X-ZeniPay-Enforce-Contract: 1` header makes
   rate-limit + usage-meter strict; without it, the middleware logs but
   doesn't block. Flip to strict after first integrator ships.

2. **Webhook failures at the integrator side will generate support load.**
   Need a dashboard surface for "recent failed deliveries" — that's in the
   UI Part 5 scope, but if we skip it, CFO has no visibility.

3. **Usage-metering adds one INSERT per API call.** At expected Phase-2
   volume (single-digit QPS) it's negligible. At 100+ QPS we'll want
   batching — defer to when it becomes a real problem; the schema accepts
   batched inserts trivially.
