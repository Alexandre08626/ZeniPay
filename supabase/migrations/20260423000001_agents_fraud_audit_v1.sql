-- =============================================================================
-- PR 5 — Pillars 7 + 9: Fraud ML + SOC2 audit export
-- =============================================================================
-- Design notes:
--
-- 1. agents.zp_audit_keys tracks the global Ed25519 signing keypair history
--    used for audit-export manifest signatures. Only one active row at a
--    time (retired_at IS NULL). Rotation = insert new row + set retired_at
--    on the prior one. The private half lives in Supabase Vault, pointed at
--    by vault_secret_id. The public PEM is stored both here (for runtime
--    convenience) and committed to public/.well-known/audit-signing-key.pub
--    (for auditors who prefer to verify without hitting the app).
--
-- 2. card_authorizations.signals_snapshot JSONB is additive — it captures
--    the anomaly_signals values that were used (or would have been used)
--    at decision time, so a post-mortem analyst can reconstruct why a given
--    auth passed or declined without racing the cron. NOT populated by
--    authorize.ts in this PR (non-negotiable: zero changes to authorize.ts);
--    a future PR wires it in. Default NULL.
--
-- 3. fraud_alerts.card_id is populated when a resolve action triggers a
--    card pause (DECISION 4). Lets UI render a direct link from the alert
--    card back to /agents/cards/[card_id].
--
-- 4. idx_anomaly_freshness is the hot-path index. authorize.ts currently
--    reads "most recent signal for (scope, metric)" — a descending index on
--    computed_at makes that a single-row look-up instead of a scan.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Signing-key registry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.zp_audit_keys (
  key_id                    TEXT PRIMARY KEY,                        -- e.g. "zp_audit_v1"
  public_key_pem            TEXT NOT NULL,
  vault_secret_id           TEXT NOT NULL,                           -- UUID string from vault.secrets
  algorithm                 TEXT NOT NULL DEFAULT 'ed25519' CHECK (algorithm = 'ed25519'),
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at                TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_zp_audit_keys_active
  ON agents.zp_audit_keys (created_at DESC)
  WHERE retired_at IS NULL;

ALTER TABLE agents.zp_audit_keys ENABLE ROW LEVEL SECURITY;
-- service_role only; no user-facing policies.

COMMENT ON TABLE  agents.zp_audit_keys IS 'Global Ed25519 signing keys for audit-export manifests. Active row (retired_at IS NULL) signs new exports; retired rows retained for historical verification.';
COMMENT ON COLUMN agents.zp_audit_keys.vault_secret_id IS 'UUID of the vault.secrets row holding the 32-byte raw Ed25519 seed (base64).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Audit-export run history (meta-audit trail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.audit_export_runs (
  id                        TEXT PRIMARY KEY DEFAULT ('aer_' || gen_random_uuid()::text),
  organization_id           TEXT REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,  -- NULL when scope='all'
  scope                     TEXT NOT NULL CHECK (scope IN ('all','organization','agent','card')),
  scope_ref                 TEXT,
  window_start              TIMESTAMPTZ NOT NULL,
  window_end                TIMESTAMPTZ NOT NULL CHECK (window_end >= window_start),
  row_count                 INTEGER NOT NULL CHECK (row_count >= 0),
  bytes_written             BIGINT NOT NULL CHECK (bytes_written >= 0),
  merkle_root_hex           TEXT NOT NULL,
  key_id                    TEXT NOT NULL REFERENCES agents.zp_audit_keys(key_id) ON DELETE RESTRICT,
  signature_b64             TEXT NOT NULL,
  include_merkle_proofs     BOOLEAN NOT NULL DEFAULT FALSE,
  requested_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_export_runs_org_time
  ON agents.audit_export_runs (organization_id, created_at DESC);

ALTER TABLE agents.audit_export_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_export_runs_select_by_org ON agents.audit_export_runs;
CREATE POLICY audit_export_runs_select_by_org ON agents.audit_export_runs
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM agents.agent_organization_members m
     WHERE m.organization_id = audit_export_runs.organization_id AND m.user_id = auth.uid()
  ));

COMMENT ON TABLE  agents.audit_export_runs IS 'One row per audit export produced. Enables "audit of audits" — CFO can review what was exported, by whom, for which window.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Additive columns on existing tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE agents.card_authorizations
  ADD COLUMN IF NOT EXISTS signals_snapshot JSONB;

COMMENT ON COLUMN agents.card_authorizations.signals_snapshot IS 'Snapshot of anomaly_signals used (or considered) at decision time. NULL by default — populated by a future PR that extends authorize.ts.';

ALTER TABLE agents.fraud_alerts
  ADD COLUMN IF NOT EXISTS card_id TEXT REFERENCES agents.issued_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_card ON agents.fraud_alerts(card_id) WHERE card_id IS NOT NULL;

COMMENT ON COLUMN agents.fraud_alerts.card_id IS 'Populated when a confirmed_fraud resolve triggers a card pause (DECISION 4). Lets UI link back to the card.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Hot-path freshness index on anomaly_signals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_anomaly_freshness
  ON agents.anomaly_signals (organization_id, scope_type, scope_ref, computed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Idempotency helper: insert a signing key row only if no active one.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.register_audit_signing_key(
  p_key_id         TEXT,
  p_public_key_pem TEXT,
  p_vault_secret_id TEXT,
  p_actor          UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing_key_id TEXT;
BEGIN
  SELECT key_id INTO existing_key_id
    FROM agents.zp_audit_keys
   WHERE retired_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;
  IF existing_key_id IS NOT NULL THEN
    RETURN existing_key_id;                   -- already bootstrapped
  END IF;
  INSERT INTO agents.zp_audit_keys (key_id, public_key_pem, vault_secret_id, created_by)
    VALUES (p_key_id, p_public_key_pem, p_vault_secret_id, p_actor);
  RETURN p_key_id;
END;
$$;
