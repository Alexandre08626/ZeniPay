# PR 5 — Pillars 7 + 9: Fraud ML (anomaly signals) + SOC2 audit export

> **Status: draft — do not push. Waiting on Alex to validate PR 4 in production.**
> Handoff notes: this plan is self-contained so whichever Claude picks it up next
> can execute without re-reading conversation history.

---

## Why this PR matters

`lib/agents/issuing/authorize.ts:209-244` has been reading `agents.anomaly_signals`
since PR 2, with a `signals_not_ready` fallback that lets *every* authorization
pass when the table is empty. **Phase 2 shipped with that fallback permanently
active** because the signal-computation side was never wired up.

PR 5 makes the fallback finally do its job:
1. Populate `anomaly_signals` on a cadence (hourly cron).
2. Raise `fraud_alerts` when anomalies cross thresholds.
3. Give the CFO a UI to triage alerts + acknowledge them.
4. Expose a SOC2-grade audit export endpoint (signed + tamper-evident) so
   auditors can pull the full audit trail on demand.

Schema is already in place — no migration needed for the anomaly / fraud path.
We only need two tiny additions for SOC2:
- `agents.audit_export_runs` (tracks what was exported, by whom, for what window)
- Ed25519 signing keypair in Vault (one per org, or one global — see §4).

---

## Scope — what's in / out

### In

- **lib/agents/fraud/** — pure detection logic
  - `zscore.ts` — per-scope baseline (mean + stddev over last 30 days of settled
    spend, excluding outliers > 3σ from the baseline itself). Incremental
    update: each tick reads last 30d only, so cost is O(tx_count_recent).
  - `novelty.ts` — first-seen merchant per agent. Uses a **persistent bloom
    filter** stored in `agents.anomaly_signals` as `metric='merchant_bloom',
    value=(bit_count), details={bloom: base64}`. One row per agent per 30d window.
  - `geo-outlier.ts` — BIN + merchant_country divergence from baseline countries
    seen for this card in the last 30d. Uses the existing
    `card_authorizations.merchant_country` column.
  - `off-hours.ts` — flag charges outside the agent's declared operating window
    (if the policy has `time_window_start_utc` / `time_window_end_utc`).
  - `compute.ts` — orchestrator: runs all detectors for one scope in sequence,
    writes one `anomaly_signals` row per metric, raises `fraud_alerts` when
    `z_score > 4` (warn) or `> 6` (critical + auto_action).

- **lib/agents/audit/** — export logic
  - `merkle.ts` — build Merkle tree over audit_log entries in window; returns
    root hash + proof-per-entry. Used for tamper-evidence: auditor re-hashes
    the exported JSON, verifies against root, signature covers root.
  - `signer.ts` — Ed25519 sign(root) → base64url. Reads key from Vault via
    new ZP_AUDIT_EXPORT_SIGNING_KEY env var (the *name* of the Vault secret,
    not the secret itself).
  - `export-builder.ts` — query `agent_audit_log` + `card_authorizations` +
    `approval_requests` + `expense_reports` in one transaction snapshot
    (SET TRANSACTION ISOLATION LEVEL REPEATABLE READ) so the export is
    point-in-time consistent.

- **API routes**
  - `POST /api/v1/agents/_internal/compute-anomaly-signals-tick` — hourly cron.
    Batches by org, 5-min budget per batch, observability logs with per-scope
    timing. AGENTS_FRAUD_CRON_SECRET (new, distinct from accounting cron).
  - `GET  /api/v1/agents/fraud/alerts` — list + filter by severity/status.
  - `POST /api/v1/agents/fraud/alerts/[id]/ack` — status='investigating'.
  - `POST /api/v1/agents/fraud/alerts/[id]/resolve` — status='dismissed' or
    'confirmed_fraud' + note. If 'confirmed_fraud' on a card scope, the route
    auto-pauses the card via the existing issuing provider `pauseCard()`.
  - `POST /api/v1/agents/audit/export` — creates an `audit_export_runs` row,
    generates the signed ZIP (entries.json + merkle_proofs.json + signature.bin),
    returns a signed single-use URL (same HMAC pattern as PR 4 exports, 5-min TTL
    since the payload is larger).
  - `GET  /.well-known/audit-signing-key.pub` — publishes the Ed25519 public key
    as a standalone endpoint so auditors can verify signatures without
    coordinating out-of-band.

- **UI**
  - `/agents/fraud` — alerts inbox (tabbed: open / investigating / resolved).
    Each row: severity pill, alert_type, scope (agent/card link), created_at,
    details summary. Click → `/agents/fraud/[id]` detail with full details JSON,
    recent auths timeline, ack/resolve buttons.
  - `/agents/fraud/risk-scores` — risk heatmap per agent (current z_score across
    all metrics), sorted desc. Drill-down links to the agent detail.
  - `/agents/audit` — SOC2 export wizard:
    1. Pick window (last 7d / 30d / 90d / custom)
    2. Pick scope (all / specific agent / specific card)
    3. Preview row count + estimated file size
    4. Generate — serves signed-URL download of ZIP
    5. Shows the public key for auditor verification
  - Shell NAV: add "Fraud" (icon 🚨, badge for open critical alerts) between
    Approvals and Agents.

- **Tests**
  - `lib/agents/__tests__/zscore.test.ts` — baseline stability, outlier
    rejection, stddev=0 edge case (no variance → z_score=null, not ±∞).
  - `lib/agents/__tests__/novelty.test.ts` — bloom filter false-positive rate at
    expected load (goal: <1% at 10K merchants per agent per 30d).
  - `lib/agents/__tests__/merkle.test.ts` — tree construction + proof
    verification, 1/100/10K entry cases, odd-count handling.
  - `lib/agents/__tests__/audit-export.integration.test.ts` — gated (AGENTS_AUDIT_E2E=1):
    end-to-end — create a few audit_log entries, export, verify signature
    against the public key, re-hash + validate Merkle proofs.

- **Env vars (to provision on Production + Preview before merge)**
  - `AGENTS_FRAUD_CRON_SECRET` — 96-char hex, distinct from existing cron secrets
  - `ZP_AUDIT_EXPORT_SIGNING_VAULT_NAME` — the Vault secret name holding the
    Ed25519 keypair (generated on first use via a Postgres function that writes
    to vault.secrets). Default: `agents_audit_signing_global`.

- **New cron in `vercel.json`**
  ```json
  { "path": "/api/v1/agents/_internal/compute-anomaly-signals-tick", "schedule": "0 * * * *" }
  ```

### Out (explicitly deferred)

- **Graph-based fraud** (collusion detection across multiple cards) — needs a
  dedicated ML model; defer to PR 6+.
- **PII minimization in audit exports** — auditors get full rows; redaction
  policy is a separate compliance-team decision.
- **Real-time push notifications** (Slack/email) for critical alerts — the
  data model supports it, but the channel layer is a separate product decision.
- **Agent self-service fraud dashboard** — CFO-only for now.

---

## Migration (single file)

```
supabase/migrations/20260423000001_agents_fraud_audit.sql
```

1. `agents.audit_export_runs`:
   ```sql
   id TEXT PK DEFAULT ('aer_' || gen_random_uuid())
   organization_id TEXT NOT NULL REFS agent_organizations
   window_start    TIMESTAMPTZ NOT NULL
   window_end      TIMESTAMPTZ NOT NULL
   scope_type      TEXT CHECK (scope_type IN ('all','agent','card'))
   scope_ref       TEXT
   row_count       INTEGER NOT NULL
   bytes           BIGINT NOT NULL
   merkle_root_hex TEXT NOT NULL
   signature_b64   TEXT NOT NULL
   requested_by    UUID REFS auth.users
   created_at      TIMESTAMPTZ DEFAULT NOW()
   ```
   RLS: org-scoped SELECT; service_role INSERT.

2. Function `agents.generate_audit_signing_key()` — one-shot bootstrapper.
   Checks if `vault.secrets` has row named `agents_audit_signing_global`; if
   not, creates a fresh Ed25519 keypair via `pgcrypto` (already enabled) and
   stores it. Idempotent. Called from the export route the first time.

3. RLS + policy for `audit_export_runs`.

No changes needed to `anomaly_signals` / `fraud_alerts` — the schema already
supports everything we need from PR 1.

---

## Open questions (flag these to Alex before starting)

1. **Ed25519 key per org vs global?** Global is simpler (one public key,
   auditors verify universally) but any compromise affects all tenants. Per-org
   is stricter but adds a `/.well-known/<orgId>/audit-signing-key.pub` route
   pattern. Current plan: **global**, documented in §4 of audit/signer.ts.

2. **z_score threshold calibration** — currently 4 (warn) and 6 (critical).
   We need at least a few weeks of real spend data per org before we can
   validate these; ship conservative and iterate. Same pattern as merchant
   Finix fraud scores.

3. **Cron cadence** — hourly is enough for flagging, but pre-auth checks in
   `authorize.ts` want fresher data. Current SIGNALS_MAX_AGE_S is configurable;
   hourly + 2h tolerance is the proposed target, giving the cron one full
   retry window before authorizations start declining.

4. **`confirmed_fraud` auto-action** — currently only pauses the card. Should
   it also:
   - Pause the agent itself?
   - Freeze the entire org's treasury?
   - Page on-call?
   Conservative default: pause card only. Pause agent if
   `scope_type='agent'`. Never freeze treasury from an automated action.

---

## Phased delivery (mirror PR 4 structure)

- **Part 1**: Migration + lib/agents/fraud/* + lib/agents/audit/* + unit tests.
  No API wiring yet. Ship to main behind `NEXT_PUBLIC_AGENTS_FRAUD_ENABLED` flag (off by default).
- **Part 2**: Compute-anomaly-signals cron + fraud_alerts raising logic.
  Verify in production (behind flag) that the cron runs cleanly and produces
  expected signal counts.
- **Part 3**: Fraud alerts API + UI.
- **Part 4**: Audit export API + UI + `/.well-known/` public key endpoint.
- **Part 5**: E2E gated test + polish + env var provisioning.

Each part: build gate (`rm -rf .next && npm run build`), commit, push, preview
READY validation before proceeding.

---

## Hard requirements carried over from PR 4

- Zero regression on merchant Finix product.
- White ZeniPay palette.
- Vault for secrets (never plaintext in columns).
- Idempotency via Idempotency-Key header on any money-adjacent write.
- Travel MCCs auto-blocked (existing rule — nothing to change).
- RLS always-on.
- `latency_ms` in decision_reason JSONB for all fraud-raised authorizations.
- Unified error shape `{ error: { code, message, detail? } }` — reuse the
  accounting helper at `app/api/v1/agents/accounting/_lib/errors.ts` or promote
  it to `app/api/v1/agents/_lib/errors.ts` if PR 5 introduces many more routes.
