-- ============================================================================
-- 20260421000003_agents_bank_foundation.sql
-- Phase 2 — The Bank for AI Agents
-- ============================================================================
-- Introduces multi-currency treasuries, card issuing, approvals,
-- fraud signals, credit lines, and expense categorization.
--
-- Backwards compatible with Phase 1:
--   * agent_org_wallets + its REST endpoints stay live; a sync trigger with a
--     pg_advisory_lock guard keeps it in lock-step with treasury_balances.
--     DEPRECATED — remove in Phase 3 once clients move to /v1/treasury.
--   * agent_wallet_transfers gains idempotency_key + deleted_at without
--     breaking existing inserts (both nullable).
--   * top_up_org_wallet + transfer_org_to_agent become thin wrappers over
--     the new generic book_transfer fn.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extensions (pgcrypto already present in Supabase; vault ships enabled)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. System user reference (NO auth.users INSERT in this migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- auth.users' NOT NULL set varies between Supabase versions (encrypted_password
-- hashing, instance_id, etc.). Inserting here would break future upgrades. The
-- worker account is provisioned out-of-band by scripts/bootstrap-system-user.ts
-- which calls supabase.auth.admin.createUser({ id, email, email_confirm }) —
-- idempotent, runs once before PR 1 merge.
--
-- Expected UUID: a9e75c0c-0000-4000-a000-000000000001
--               (value of AGENTS_SYSTEM_USER_ID env var)
-- Every created_by / updated_by column in this file is a nullable FK to
-- auth.users(id). Worker writes use the UUID above; user writes use
-- auth.uid(); un-attributed writes remain NULL.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FX rates + fx_convert() — fed by /_internal/fx-refresh-tick daily
-- ─────────────────────────────────────────────────────────────────────────────
-- Historical FX rates (7-year retention for compliance). One row per
-- base/quote per validity window; the "current" row is the one with
-- valid_to IS NULL. Cron inserts a new row and closes the previous with
-- valid_to = NOW() rather than updating in place.
CREATE TABLE IF NOT EXISTS agents.fx_rates (
  id               TEXT NOT NULL DEFAULT ('fx_' || gen_random_uuid()::text) PRIMARY KEY,
  base_currency    TEXT NOT NULL,
  quote_currency   TEXT NOT NULL,
  rate             NUMERIC(20,10) NOT NULL CHECK (rate > 0),
  source           TEXT NOT NULL DEFAULT 'seed',           -- 'seed' | 'exchangerate.host' | 'openexchangerates' | 'manual'
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to         TIMESTAMPTZ,                             -- NULL = currently active
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Only one "active" (valid_to IS NULL) row per pair at any time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fx_rates_active_pair
  ON agents.fx_rates (base_currency, quote_currency)
  WHERE valid_to IS NULL;
-- Time-travel lookup index.
CREATE INDEX IF NOT EXISTS idx_fx_rates_pair_time
  ON agents.fx_rates (base_currency, quote_currency, valid_from DESC);

-- Seed rates (2026-04-21 placeholders — scripts/refresh-fx.ts replaces them
-- with real exchangerate.host values before PR 1 merge. Cron keeps them
-- fresh daily from there on).
INSERT INTO agents.fx_rates (base_currency, quote_currency, rate, source, valid_from) VALUES
  ('USD','USD',  1.00, 'seed', NOW()),
  ('USD','CAD',  1.39, 'seed', NOW()),  -- 1 / 0.72
  ('USD','EUR',  0.93, 'seed', NOW()),  -- 1 / 1.08
  ('USD','USDC', 1.00, 'seed', NOW()),
  ('CAD','USD',  0.72, 'seed', NOW()),
  ('EUR','USD',  1.08, 'seed', NOW()),
  ('USDC','USD', 1.00, 'seed', NOW())
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION agents.fx_convert(
  p_amount_cents BIGINT,
  p_from         TEXT,
  p_to           TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_rate NUMERIC(20,10);
BEGIN
  IF p_from = p_to THEN RETURN p_amount_cents; END IF;
  SELECT rate INTO v_rate
  FROM agents.fx_rates
  WHERE base_currency = p_from AND quote_currency = p_to
    AND valid_to IS NULL;
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'no active fx_rate for % -> %', p_from, p_to USING ERRCODE = '22023';
  END IF;
  RETURN (p_amount_cents::NUMERIC * v_rate)::BIGINT;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Multi-currency treasury
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.org_treasuries (
  id                        TEXT PRIMARY KEY DEFAULT ('trs_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL UNIQUE REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  default_currency          TEXT NOT NULL DEFAULT 'USD' CHECK (default_currency IN ('USD','CAD','EUR','USDC')),
  credit_limit_cents        BIGINT NOT NULL DEFAULT 0 CHECK (credit_limit_cents >= 0),
  credit_used_cents         BIGINT NOT NULL DEFAULT 0 CHECK (credit_used_cents >= 0),
  status                    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents.treasury_balances (
  id                        TEXT PRIMARY KEY DEFAULT ('bal_' || gen_random_uuid()::text),
  treasury_id               TEXT NOT NULL REFERENCES agents.org_treasuries(id) ON DELETE CASCADE,
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  currency                  TEXT NOT NULL CHECK (currency IN ('USD','CAD','EUR','USDC')),
  balance_cents             BIGINT NOT NULL DEFAULT 0,
  pending_cents             BIGINT NOT NULL DEFAULT 0,
  usd_equivalent_cents      BIGINT NOT NULL DEFAULT 0,     -- stored; refreshed by trigger on own rows
  external_ref              TEXT,                          -- e.g. stripe balance id / USDC deposit address
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (treasury_id, currency)
);
CREATE INDEX IF NOT EXISTS idx_treasury_balances_org ON agents.treasury_balances(organization_id);

-- Per-org USD total: normal VIEW (SUM of stored usd_equivalent_cents). No
-- recursive triggers; the underlying column is recomputed once per row update.
CREATE OR REPLACE VIEW agents.org_treasury_totals AS
  SELECT
    tb.organization_id,
    t.id                                          AS treasury_id,
    COALESCE(SUM(tb.usd_equivalent_cents), 0)::BIGINT AS total_balance_cents_usd,
    t.credit_limit_cents,
    t.credit_used_cents,
    (t.credit_limit_cents - t.credit_used_cents)  AS credit_available_cents,
    MAX(tb.updated_at)                            AS last_updated_at
  FROM agents.treasury_balances tb
  JOIN agents.org_treasuries t ON t.id = tb.treasury_id
  GROUP BY tb.organization_id, t.id, t.credit_limit_cents, t.credit_used_cents;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Funding sources + topup intents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.funding_sources (
  id                        TEXT PRIMARY KEY DEFAULT ('fnd_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  type                      TEXT NOT NULL CHECK (type IN (
    'finix_card','zenipay_merchant_wallet','wire_ach','sepa','usdc_wallet','ramp_credit'
  )),
  nickname                  TEXT NOT NULL,
  details                   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- never store PAN / full account nums
  external_ref              TEXT,
  verified_at               TIMESTAMPTZ,
  status                    TEXT NOT NULL DEFAULT 'pending_verification'
                              CHECK (status IN ('pending_verification','verified','disabled','failed_verification')),
  is_default                BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at                TIMESTAMPTZ,  -- compliance 7y retention
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funding_sources_org ON agents.funding_sources(organization_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_funding_sources_default_per_org
  ON agents.funding_sources(organization_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

-- Retry-safe webhook landing table for inbound top-ups.
CREATE TABLE IF NOT EXISTS agents.topup_intents (
  id                  TEXT PRIMARY KEY DEFAULT ('tpi_' || gen_random_uuid()::text),
  organization_id     TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  funding_source_id   TEXT REFERENCES agents.funding_sources(id) ON DELETE SET NULL,
  amount_cents        BIGINT NOT NULL CHECK (amount_cents > 0),
  currency            TEXT NOT NULL,
  provider            TEXT NOT NULL,                  -- 'finix','circle','wire','sepa'
  external_ref        TEXT,                           -- provider-side id
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','settled','failed','reversed')),
  idempotency_key     TEXT,
  settled_transfer_id TEXT,                           -- FK to agent_wallet_transfers after settlement
  raw_webhook_payload JSONB,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_topup_intents_idempotency
  ON agents.topup_intents(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topup_intents_org ON agents.topup_intents(organization_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Card issuing
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.issued_cards (
  id                        TEXT PRIMARY KEY DEFAULT ('crd_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  agent_id                  TEXT REFERENCES agents.agents(id) ON DELETE SET NULL,
  cardholder_type           TEXT NOT NULL CHECK (cardholder_type IN ('agent','human_employee','org_generic')),
  cardholder_ref            TEXT NOT NULL,                 -- UUID for human (auth.users.id) or agent.id or org.id
  issuer_provider           TEXT NOT NULL CHECK (issuer_provider IN ('stripe_issuing','marqeta','lithic','highnote','unit','mock')),
  external_card_id          TEXT,
  external_cardholder_id    TEXT,
  network                   TEXT CHECK (network IN ('visa','mastercard')),
  card_type                 TEXT NOT NULL CHECK (card_type IN ('virtual','physical')),
  currency                  TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested','active','paused','canceled','expired')),
  spending_controls         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ledger_wallet_id          TEXT REFERENCES agents.agent_wallets(id) ON DELETE SET NULL,
  last4                     TEXT,
  expiry_month              INT,
  expiry_year               INT,
  deleted_at                TIMESTAMPTZ,
  activated_at              TIMESTAMPTZ,
  canceled_at               TIMESTAMPTZ,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issued_cards_org    ON agents.issued_cards(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issued_cards_agent  ON agents.issued_cards(agent_id)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issued_cards_status ON agents.issued_cards(status)          WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS agents.card_authorizations (
  id                        TEXT PRIMARY KEY DEFAULT ('auth_' || gen_random_uuid()::text),
  card_id                   TEXT NOT NULL REFERENCES agents.issued_cards(id) ON DELETE RESTRICT,
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE RESTRICT,
  amount_cents              BIGINT NOT NULL CHECK (amount_cents > 0),
  currency                  TEXT NOT NULL,
  merchant_name             TEXT,
  merchant_category         TEXT,
  merchant_network_id       TEXT,
  merchant_country          TEXT,
  external_auth_id          TEXT,
  decision                  TEXT NOT NULL CHECK (decision IN (
    'approved','declined_policy','declined_balance','declined_merchant',
    'declined_velocity','declined_fraud','pending_approval'
  )),
  decision_reason           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { approved, reason, checks[], latency_ms, pending_approval, approval_request_id }
  approval_request_id       TEXT,                                -- FK added after approval_requests exists
  transaction_id            TEXT REFERENCES agents.agent_transactions(id) ON DELETE SET NULL,
  idempotency_key           TEXT,
  deleted_at                TIMESTAMPTZ,
  occurred_at               TIMESTAMPTZ,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_card_auths_card_time  ON agents.card_authorizations(card_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_card_auths_org_time   ON agents.card_authorizations(organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_card_auths_idempotency
  ON agents.card_authorizations(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Expense categorization
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.gl_accounts (
  id                        TEXT PRIMARY KEY DEFAULT ('gla_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  code                      TEXT NOT NULL,
  name                      TEXT NOT NULL,
  parent_id                 TEXT REFERENCES agents.gl_accounts(id) ON DELETE SET NULL,
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE IF NOT EXISTS agents.mcc_gl_mapping (
  id                        TEXT PRIMARY KEY DEFAULT ('mcc_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  mcc                       TEXT NOT NULL,
  gl_account_id             TEXT NOT NULL REFERENCES agents.gl_accounts(id) ON DELETE RESTRICT,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, mcc)
);

CREATE TABLE IF NOT EXISTS agents.expense_reports (
  id                        TEXT PRIMARY KEY DEFAULT ('exr_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL CHECK (period_end >= period_start),
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized','exported')),
  finalized_at              TIMESTAMPTZ,
  finalized_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  export_format             TEXT CHECK (export_format IN ('quickbooks','xero','netsuite','csv')),
  export_ref                TEXT,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents.expense_report_lines (
  id                        TEXT PRIMARY KEY DEFAULT ('exl_' || gen_random_uuid()::text),
  report_id                 TEXT NOT NULL REFERENCES agents.expense_reports(id) ON DELETE CASCADE,
  transaction_id            TEXT REFERENCES agents.agent_transactions(id)     ON DELETE SET NULL,
  card_auth_id              TEXT REFERENCES agents.card_authorizations(id)    ON DELETE SET NULL,
  gl_account_id             TEXT REFERENCES agents.gl_accounts(id)            ON DELETE SET NULL,
  memo                      TEXT,
  amount_cents              BIGINT NOT NULL,
  currency                  TEXT NOT NULL,
  converted_usd_cents       BIGINT NOT NULL,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exp_line_has_source CHECK (transaction_id IS NOT NULL OR card_auth_id IS NOT NULL)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Approvals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.approval_policies (
  id                        TEXT PRIMARY KEY DEFAULT ('apo_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  trigger_type              TEXT NOT NULL CHECK (trigger_type IN (
    'amount_threshold','merchant_category','new_merchant','off_hours','anomaly_score'
  )),
  trigger_config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  approver_type             TEXT NOT NULL CHECK (approver_type IN ('specific_user','any_admin','owner_only','multi_sig')),
  approver_config           JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeout_seconds           INT NOT NULL DEFAULT 3600 CHECK (timeout_seconds > 0),
  default_action            TEXT NOT NULL DEFAULT 'deny' CHECK (default_action IN ('approve','deny')),
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  priority                  INT NOT NULL DEFAULT 100,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_policies_org_priority
  ON agents.approval_policies(organization_id, priority) WHERE active;

CREATE TABLE IF NOT EXISTS agents.approval_requests (
  id                        TEXT PRIMARY KEY DEFAULT ('apr_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  policy_id                 TEXT NOT NULL REFERENCES agents.approval_policies(id) ON DELETE RESTRICT,
  subject_type              TEXT NOT NULL CHECK (subject_type IN ('card_authorization','transaction','rule_creation','credential_write')),
  subject_ref               TEXT NOT NULL,
  requested_by_agent_id     TEXT REFERENCES agents.agents(id) ON DELETE SET NULL,
  requested_amount_cents    BIGINT,
  requested_currency        TEXT,
  context                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','expired','canceled')),
  expires_at                TIMESTAMPTZ NOT NULL,
  resolved_at               TIMESTAMPTZ,
  resolved_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes          TEXT,
  notifications_sent        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status ON agents.approval_requests(organization_id, status, expires_at);

-- Wire the deferred FK from card_authorizations now that approval_requests exists.
ALTER TABLE agents.card_authorizations
  ADD CONSTRAINT fk_card_auth_approval_req
  FOREIGN KEY (approval_request_id) REFERENCES agents.approval_requests(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS agents.approval_signatures (
  id                        TEXT PRIMARY KEY DEFAULT ('asg_' || gen_random_uuid()::text),
  request_id                TEXT NOT NULL REFERENCES agents.approval_requests(id) ON DELETE CASCADE,
  approver_user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision                  TEXT NOT NULL CHECK (decision IN ('approved','denied')),
  signature                 TEXT NOT NULL,      -- HMAC-SHA256 hex over canonical(request_id, decision, signed_at, approver_user_id)
  signed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- ip, user_agent
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, approver_user_id)
);

-- HMAC secrets live in supabase_vault. This row only stores the vault
-- secret id; the actual key bytes are AES-encrypted at rest by Vault.
CREATE TABLE IF NOT EXISTS agents.user_approval_secrets (
  user_id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vault_secret_id           UUID NOT NULL,      -- references vault.secrets(id); FK not allowed cross-schema reliably
  rotated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Fraud / anomaly signals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.anomaly_signals (
  id                        TEXT PRIMARY KEY DEFAULT ('asig_' || gen_random_uuid()::text),
  scope_type                TEXT NOT NULL CHECK (scope_type IN ('agent','card','org')),
  scope_ref                 TEXT NOT NULL,
  metric                    TEXT NOT NULL,
  -- `window` is a Postgres reserved word (window functions); use `time_window`.
  time_window               TEXT NOT NULL CHECK (time_window IN ('1h','24h','7d','30d')),
  value                     NUMERIC NOT NULL,
  baseline                  NUMERIC,
  z_score                   NUMERIC,
  computed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- B-tree composite: lookups are by scope → not BRIN.
CREATE INDEX IF NOT EXISTS idx_anomaly_scope_metric_time
  ON agents.anomaly_signals (scope_type, scope_ref, metric, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_time ON agents.anomaly_signals (computed_at DESC);

CREATE TABLE IF NOT EXISTS agents.fraud_alerts (
  id                        TEXT PRIMARY KEY DEFAULT ('flg_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  scope_type                TEXT NOT NULL CHECK (scope_type IN ('agent','card','org')),
  scope_ref                 TEXT NOT NULL,
  alert_type                TEXT NOT NULL CHECK (alert_type IN (
    'velocity_spike','new_merchant_burst','off_hours_spend','unusual_amount',
    'geographic_anomaly','policy_boundary_probe'
  )),
  severity                  TEXT NOT NULL CHECK (severity IN ('info','warn','critical')),
  details                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                    TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','dismissed','confirmed_fraud')),
  auto_action_taken         TEXT NOT NULL DEFAULT 'none' CHECK (auto_action_taken IN ('none','paused_card','paused_agent','required_approval')),
  resolved_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at               TIMESTAMPTZ,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_org_status
  ON agents.fraud_alerts(organization_id, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Credit lines (Pillar 6 — schema only; logic in later PR)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.credit_lines (
  id                        TEXT PRIMARY KEY DEFAULT ('crl_' || gen_random_uuid()::text),
  organization_id           TEXT NOT NULL UNIQUE REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  provider                  TEXT NOT NULL CHECK (provider IN ('zenipay_internal','ramp_partner','third_party')),
  limit_cents               BIGINT NOT NULL DEFAULT 0 CHECK (limit_cents >= 0),
  used_cents                BIGINT NOT NULL DEFAULT 0 CHECK (used_cents >= 0),
  apr_bps                   INT NOT NULL DEFAULT 0 CHECK (apr_bps >= 0),
  billing_cycle_day         INT CHECK (billing_cycle_day BETWEEN 1 AND 28),
  next_billing_at           TIMESTAMPTZ,
  status                    TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','frozen','defaulted')),
  underwriting_data         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Extend existing Phase 1 tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotency + soft-delete on agent_wallet_transfers (existing table).
ALTER TABLE agents.agent_wallet_transfers
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transfers_idempotency
  ON agents.agent_wallet_transfers(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Soft-delete on agent_transactions (already has idempotency from Phase 1).
ALTER TABLE agents.agent_transactions
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Timezone on agent_policies (heure d'été bug).
-- agent_partner_rules ne existe pas encore (Issuing-as-a-Service — Pillar 10);
-- la même colonne sera ajoutée dans la migration qui crée cette table.
ALTER TABLE agents.agent_policies
  ADD COLUMN IF NOT EXISTS time_window_timezone TEXT NOT NULL DEFAULT 'UTC';

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- 11a. Recompute usd_equivalent_cents on every balance write (no cascade — the
--      column lives on the same row, so the trigger is strictly one-hop).
CREATE OR REPLACE FUNCTION agents.treasury_balance_refresh_usd_eq()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_rate NUMERIC(20,10);
BEGIN
  IF NEW.currency = 'USD' THEN
    NEW.usd_equivalent_cents := NEW.balance_cents;
  ELSE
    SELECT rate INTO v_rate FROM agents.fx_rates
    WHERE base_currency = NEW.currency AND quote_currency = 'USD'
      AND valid_to IS NULL;
    NEW.usd_equivalent_cents := COALESCE((NEW.balance_cents::NUMERIC * v_rate)::BIGINT, NEW.balance_cents);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_treasury_balances_refresh_usd ON agents.treasury_balances;
CREATE TRIGGER trg_treasury_balances_refresh_usd
  BEFORE INSERT OR UPDATE OF balance_cents, currency ON agents.treasury_balances
  FOR EACH ROW EXECUTE FUNCTION agents.treasury_balance_refresh_usd_eq();

-- 11b. Enforce balance + pending >= 0 OR credit line covers the deficit.
--      Credit_used_cents is NOT touched here — that's book_credit_draw()'s job.
CREATE OR REPLACE FUNCTION agents.enforce_balance_nonneg_or_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_deficit         BIGINT;
  v_credit_limit    BIGINT := 0;
  v_credit_used     BIGINT := 0;
  v_credit_avail    BIGINT := 0;
  v_credit_status   TEXT;
BEGIN
  IF NEW.balance_cents + COALESCE(NEW.pending_cents, 0) >= 0 THEN
    RETURN NEW;
  END IF;
  v_deficit := -(NEW.balance_cents + COALESCE(NEW.pending_cents, 0));

  SELECT cl.limit_cents, cl.used_cents, cl.status
    INTO v_credit_limit, v_credit_used, v_credit_status
  FROM agents.credit_lines cl
  WHERE cl.organization_id = NEW.organization_id;

  IF v_credit_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'balance would go negative (deficit=%) with no active credit line', v_deficit
      USING ERRCODE = '22023';
  END IF;

  v_credit_avail := GREATEST(v_credit_limit - v_credit_used, 0);
  IF v_credit_avail < v_deficit THEN
    RAISE EXCEPTION 'balance would go negative (deficit=%) beyond credit capacity (avail=%)',
      v_deficit, v_credit_avail USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_treasury_balances_enforce ON agents.treasury_balances;
CREATE TRIGGER trg_treasury_balances_enforce
  BEFORE INSERT OR UPDATE OF balance_cents, pending_cents ON agents.treasury_balances
  FOR EACH ROW EXECUTE FUNCTION agents.enforce_balance_nonneg_or_credit();

-- 11c. Bi-directional sync between legacy agent_org_wallets and
--      treasury_balances(currency='USD'). Guarded by advisory lock (same lock
--      id 0x0ABE77 = "agent_org_wallets") so a cascade from one trigger to the
--      other cannot re-enter. When the lock is already held by this backend,
--      the trigger returns early — the original mutation already applied the
--      intended change on both tables.
-- Non-reentrant guard: transaction-local GUC. Advisory locks are re-entrant
-- in the same session — they don't prevent trigger A → trigger B → trigger A
-- cascades. A GUC flag set with `set_config(..., true)` (the third arg makes
-- it transaction-local) resets at tx end and cannot be "acquired twice" so
-- the second trigger invocation sees it and bails.
CREATE OR REPLACE FUNCTION agents.sync_legacy_owl_to_treasury()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_treasury_id TEXT;
BEGIN
  IF COALESCE(current_setting('agents.owl_sync', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  PERFORM set_config('agents.owl_sync', 'on', true);

  SELECT id INTO v_treasury_id FROM agents.org_treasuries
   WHERE organization_id = NEW.organization_id;
  IF v_treasury_id IS NULL THEN
    INSERT INTO agents.org_treasuries(organization_id) VALUES (NEW.organization_id)
    RETURNING id INTO v_treasury_id;
  END IF;

  INSERT INTO agents.treasury_balances (treasury_id, organization_id, currency, balance_cents)
       VALUES (v_treasury_id, NEW.organization_id, 'USD', NEW.balance_cents)
  ON CONFLICT (treasury_id, currency) DO UPDATE
    SET balance_cents = EXCLUDED.balance_cents;

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION agents.sync_treasury_to_legacy_owl()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
BEGIN
  IF NEW.currency <> 'USD' THEN RETURN NEW; END IF;
  IF COALESCE(current_setting('agents.owl_sync', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  PERFORM set_config('agents.owl_sync', 'on', true);

  INSERT INTO agents.agent_org_wallets (organization_id, balance_cents)
       VALUES (NEW.organization_id, NEW.balance_cents)
  ON CONFLICT (organization_id) DO UPDATE
    SET balance_cents = EXCLUDED.balance_cents, updated_at = NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_legacy_owl_sync ON agents.agent_org_wallets;
CREATE TRIGGER trg_legacy_owl_sync
  AFTER INSERT OR UPDATE OF balance_cents ON agents.agent_org_wallets
  FOR EACH ROW EXECUTE FUNCTION agents.sync_legacy_owl_to_treasury();

DROP TRIGGER IF EXISTS trg_treasury_legacy_sync ON agents.treasury_balances;
CREATE TRIGGER trg_treasury_legacy_sync
  AFTER INSERT OR UPDATE OF balance_cents, currency ON agents.treasury_balances
  FOR EACH ROW EXECUTE FUNCTION agents.sync_treasury_to_legacy_owl();

-- 11d. updated_at auto-touch for all new mutable tables.
DO $mig$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'org_treasuries','treasury_balances','funding_sources','topup_intents',
    'issued_cards','gl_accounts','mcc_gl_mapping','expense_reports',
    'approval_policies','approval_requests','fraud_alerts','credit_lines','fx_rates'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_touch ON agents.%I;
       CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON agents.%I
       FOR EACH ROW EXECUTE FUNCTION agents.touch_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$mig$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Generic book_transfer() — the single source of truth for money moves
-- ─────────────────────────────────────────────────────────────────────────────
-- Allowed directions in Phase 2:
--   from \ to     | treasury | org | agent
--   treasury      |          |  X  |   X   (top_up / direct agent seed)
--   org           |          |     |   X   (distribute to agent)
--   agent         |          |  X  |       (reclaim to org)
-- Idempotent via (organization_id, idempotency_key) UNIQUE on agent_wallet_transfers.

CREATE OR REPLACE FUNCTION agents.book_transfer(
  p_organization_id  TEXT,
  p_from_type        TEXT,
  p_from_id          TEXT,      -- treasury ⇒ org_wallet_id ; agent ⇒ wallet_id ; treasury ⇒ NULL
  p_to_type          TEXT,
  p_to_id            TEXT,      -- same shape as p_from_id
  p_amount_cents     BIGINT,
  p_currency         TEXT DEFAULT 'USD',
  p_note             TEXT DEFAULT NULL,
  p_idempotency_key  TEXT DEFAULT NULL,
  p_actor            UUID DEFAULT NULL
)
RETURNS TABLE (
  transfer_id         TEXT,
  from_new_balance    BIGINT,
  to_new_balance      BIGINT,
  replayed            BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_existing        TEXT;
  v_org_wallet_id   TEXT;
  v_new_from        BIGINT;
  v_new_to          BIGINT;
  v_transfer_id     TEXT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be a positive integer' USING ERRCODE = '22023';
  END IF;

  -- Idempotency replay.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM agents.agent_wallet_transfers
     WHERE organization_id = p_organization_id
       AND idempotency_key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN
      transfer_id      := v_existing;
      from_new_balance := NULL;
      to_new_balance   := NULL;
      replayed         := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- Phase 2 routes three directions: treasury→agent, org→agent, agent→org.
  IF p_from_type = 'treasury' AND p_to_type = 'agent' THEN
    -- Debit org wallet (the legacy USD wallet; sync trigger mirrors into treasury).
    SELECT id INTO v_org_wallet_id
      FROM agents.agent_org_wallets
     WHERE organization_id = p_organization_id FOR UPDATE;
    IF v_org_wallet_id IS NULL THEN
      RAISE EXCEPTION 'org wallet missing for %', p_organization_id USING ERRCODE = '23503';
    END IF;
    UPDATE agents.agent_org_wallets
       SET balance_cents = balance_cents - p_amount_cents,
           updated_at    = NOW()
     WHERE id = v_org_wallet_id
     RETURNING balance_cents INTO v_new_from;

    UPDATE agents.agent_wallets
       SET balance_cents = balance_cents + p_amount_cents,
           updated_at    = NOW()
     WHERE id = p_to_id AND organization_id = p_organization_id
     RETURNING balance_cents INTO v_new_to;
    IF v_new_to IS NULL THEN
      RAISE EXCEPTION 'agent wallet % not in organization %', p_to_id, p_organization_id
        USING ERRCODE = '23503';
    END IF;

    INSERT INTO agents.agent_wallet_transfers
      (organization_id, from_wallet_type, from_wallet_id, to_wallet_type, to_wallet_id,
       amount_cents, currency, note, idempotency_key, created_by)
    VALUES
      (p_organization_id, 'org', v_org_wallet_id, 'agent', p_to_id,
       p_amount_cents, p_currency, p_note, p_idempotency_key, p_actor)
    RETURNING id INTO v_transfer_id;

  ELSIF p_from_type = 'treasury' AND p_to_type = 'org' THEN
    -- Credit org wallet (top-up from external funding source).
    INSERT INTO agents.agent_org_wallets (organization_id) VALUES (p_organization_id)
    ON CONFLICT (organization_id) DO NOTHING;
    SELECT id INTO v_org_wallet_id FROM agents.agent_org_wallets
     WHERE organization_id = p_organization_id FOR UPDATE;
    UPDATE agents.agent_org_wallets
       SET balance_cents = balance_cents + p_amount_cents,
           updated_at    = NOW()
     WHERE id = v_org_wallet_id
     RETURNING balance_cents INTO v_new_to;
    v_new_from := NULL;

    INSERT INTO agents.agent_wallet_transfers
      (organization_id, from_wallet_type, from_wallet_id, to_wallet_type, to_wallet_id,
       amount_cents, currency, note, idempotency_key, created_by)
    VALUES
      (p_organization_id, 'treasury', NULL, 'org', v_org_wallet_id,
       p_amount_cents, p_currency, p_note, p_idempotency_key, p_actor)
    RETURNING id INTO v_transfer_id;

  ELSIF p_from_type = 'agent' AND p_to_type = 'org' THEN
    -- Reclaim from agent to org.
    UPDATE agents.agent_wallets
       SET balance_cents = balance_cents - p_amount_cents,
           updated_at    = NOW()
     WHERE id = p_from_id AND organization_id = p_organization_id
           AND balance_cents >= p_amount_cents
     RETURNING balance_cents INTO v_new_from;
    IF v_new_from IS NULL THEN
      RAISE EXCEPTION 'insufficient agent balance or scope mismatch' USING ERRCODE = '23514';
    END IF;
    INSERT INTO agents.agent_org_wallets (organization_id) VALUES (p_organization_id)
    ON CONFLICT (organization_id) DO NOTHING;
    UPDATE agents.agent_org_wallets
       SET balance_cents = balance_cents + p_amount_cents,
           updated_at    = NOW()
     WHERE organization_id = p_organization_id
     RETURNING id, balance_cents INTO v_org_wallet_id, v_new_to;

    INSERT INTO agents.agent_wallet_transfers
      (organization_id, from_wallet_type, from_wallet_id, to_wallet_type, to_wallet_id,
       amount_cents, currency, note, idempotency_key, created_by)
    VALUES
      (p_organization_id, 'agent', p_from_id, 'org', v_org_wallet_id,
       p_amount_cents, p_currency, p_note, p_idempotency_key, p_actor)
    RETURNING id INTO v_transfer_id;

  ELSE
    RAISE EXCEPTION 'book_transfer direction %→% not supported in Phase 2', p_from_type, p_to_type
      USING ERRCODE = '22023';
  END IF;

  transfer_id      := v_transfer_id;
  from_new_balance := v_new_from;
  to_new_balance   := v_new_to;
  replayed         := FALSE;
  RETURN NEXT;
END;
$fn$;

-- Phase 1 wrappers now delegate to book_transfer — no breaking change.
CREATE OR REPLACE FUNCTION agents.top_up_org_wallet(
  p_organization_id TEXT,
  p_amount_cents    BIGINT,
  p_note            TEXT DEFAULT NULL
)
RETURNS TABLE (transfer_id TEXT, org_balance_cents BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM agents.book_transfer(
      p_organization_id, 'treasury', NULL, 'org', NULL,
      p_amount_cents, 'USD', p_note, NULL, NULL
    )
  LOOP
    transfer_id        := r.transfer_id;
    org_balance_cents  := r.to_new_balance;
    RETURN NEXT;
  END LOOP;
END;
$fn$;

CREATE OR REPLACE FUNCTION agents.transfer_org_to_agent(
  p_organization_id TEXT,
  p_agent_wallet_id TEXT,
  p_amount_cents    BIGINT,
  p_note            TEXT DEFAULT NULL
)
RETURNS TABLE (transfer_id TEXT, org_balance_cents BIGINT, agent_balance_cents BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM agents.book_transfer(
      p_organization_id, 'treasury', NULL, 'agent', p_agent_wallet_id,
      p_amount_cents, 'USD', p_note, NULL, NULL
    )
  LOOP
    transfer_id          := r.transfer_id;
    org_balance_cents    := r.from_new_balance;
    agent_balance_cents  := r.to_new_balance;
    RETURN NEXT;
  END LOOP;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Row Level Security — same pattern as Phase 1
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE agents.org_treasuries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.treasury_balances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.funding_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.topup_intents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.issued_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.card_authorizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.gl_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.mcc_gl_mapping         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.expense_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.expense_report_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.approval_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.approval_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.approval_signatures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.user_approval_secrets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.anomaly_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.fraud_alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.credit_lines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.fx_rates               ENABLE ROW LEVEL SECURITY;

-- Helper: "is member of org X" — already used in Phase 1 policies; replicated inline.
-- fx_rates: readable by any authenticated user (not tenant-scoped).
DROP POLICY IF EXISTS fx_rates_select_all ON agents.fx_rates;
CREATE POLICY fx_rates_select_all ON agents.fx_rates FOR SELECT TO authenticated USING (TRUE);

-- Soft-delete aware policies: deleted_at IS NULL filter where applicable.
DROP POLICY IF EXISTS treasury_select_by_org ON agents.org_treasuries;
CREATE POLICY treasury_select_by_org ON agents.org_treasuries
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = org_treasuries.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS treasury_balances_select_by_org ON agents.treasury_balances;
CREATE POLICY treasury_balances_select_by_org ON agents.treasury_balances
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = treasury_balances.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS funding_sources_select_by_org ON agents.funding_sources;
CREATE POLICY funding_sources_select_by_org ON agents.funding_sources
  FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = funding_sources.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS topup_intents_select_by_org ON agents.topup_intents;
CREATE POLICY topup_intents_select_by_org ON agents.topup_intents
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = topup_intents.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS issued_cards_select_by_org ON agents.issued_cards;
CREATE POLICY issued_cards_select_by_org ON agents.issued_cards
  FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = issued_cards.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS card_auths_select_by_org ON agents.card_authorizations;
CREATE POLICY card_auths_select_by_org ON agents.card_authorizations
  FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = card_authorizations.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS gl_accounts_select_by_org ON agents.gl_accounts;
CREATE POLICY gl_accounts_select_by_org ON agents.gl_accounts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = gl_accounts.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS mcc_gl_mapping_select_by_org ON agents.mcc_gl_mapping;
CREATE POLICY mcc_gl_mapping_select_by_org ON agents.mcc_gl_mapping
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = mcc_gl_mapping.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS expense_reports_select_by_org ON agents.expense_reports;
CREATE POLICY expense_reports_select_by_org ON agents.expense_reports
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = expense_reports.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS expense_report_lines_select_by_org ON agents.expense_report_lines;
CREATE POLICY expense_report_lines_select_by_org ON agents.expense_report_lines
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.expense_reports r
     JOIN agents.agent_organization_members m ON m.organization_id = r.organization_id
     WHERE r.id = expense_report_lines.report_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS approval_policies_select_by_org ON agents.approval_policies;
CREATE POLICY approval_policies_select_by_org ON agents.approval_policies
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = approval_policies.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS approval_requests_select_by_org ON agents.approval_requests;
CREATE POLICY approval_requests_select_by_org ON agents.approval_requests
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = approval_requests.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS approval_signatures_select_by_org ON agents.approval_signatures;
CREATE POLICY approval_signatures_select_by_org ON agents.approval_signatures
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.approval_requests r
     JOIN agents.agent_organization_members m ON m.organization_id = r.organization_id
     WHERE r.id = approval_signatures.request_id AND m.user_id = auth.uid()
  ));

-- user_approval_secrets is NOT readable by the owner. Only service_role
-- (which bypasses RLS) can see vault_secret_id. No SELECT policy exists.

DROP POLICY IF EXISTS anomaly_signals_select_by_org ON agents.anomaly_signals;
CREATE POLICY anomaly_signals_select_by_org ON agents.anomaly_signals
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = anomaly_signals.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS fraud_alerts_select_by_org ON agents.fraud_alerts;
CREATE POLICY fraud_alerts_select_by_org ON agents.fraud_alerts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = fraud_alerts.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS credit_lines_select_by_org ON agents.credit_lines;
CREATE POLICY credit_lines_select_by_org ON agents.credit_lines
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = credit_lines.organization_id AND m.user_id = auth.uid()
  ));

-- Update Phase 1 policies that should now filter soft-deleted rows.
DROP POLICY IF EXISTS tx_select_by_org ON agents.agent_transactions;
CREATE POLICY tx_select_by_org ON agents.agent_transactions
  FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = agent_transactions.organization_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS transfers_select_by_org ON agents.agent_wallet_transfers;
CREATE POLICY transfers_select_by_org ON agents.agent_wallet_transfers
  FOR SELECT TO authenticated USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = agent_wallet_transfers.organization_id AND m.user_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Grants
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA agents TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA agents TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA agents TO service_role;

GRANT SELECT ON agents.org_treasury_totals TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  agents.fx_convert(BIGINT, TEXT, TEXT),
  agents.book_transfer(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, UUID),
  agents.top_up_org_wallet(TEXT, BIGINT, TEXT),
  agents.transfer_org_to_agent(TEXT, TEXT, BIGINT, TEXT)
TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Backfill existing orgs
-- ─────────────────────────────────────────────────────────────────────────────
-- Create one org_treasuries + treasury_balances(USD) row per existing org with
-- a USD wallet. Copy the current USD balance into treasury_balances. The sync
-- triggers keep them aligned from this point forward.
INSERT INTO agents.org_treasuries (organization_id, default_currency)
SELECT owl.organization_id, 'USD'
  FROM agents.agent_org_wallets owl
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO agents.treasury_balances (treasury_id, organization_id, currency, balance_cents)
SELECT t.id, t.organization_id, 'USD', owl.balance_cents
  FROM agents.org_treasuries t
  JOIN agents.agent_org_wallets owl ON owl.organization_id = t.organization_id
ON CONFLICT (treasury_id, currency) DO UPDATE
  SET balance_cents = EXCLUDED.balance_cents;

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PostgREST cache bust
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
