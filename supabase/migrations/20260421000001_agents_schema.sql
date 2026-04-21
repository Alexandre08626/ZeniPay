-- =============================================================================
-- ZeniPay Agents — Phase 1 schema (feature/agents-phase-1)
-- =============================================================================
-- Separate `agents` schema. Zero reads/writes against existing public.zenipay_*.
-- Tenant isolation: agent_organization_members maps auth.users.id → org.
-- RLS enabled on every table. Writes go through service_role only (no INSERT/
-- UPDATE policies for anon/authenticated). agent_audit_log is append-only,
-- enforced by a trigger that blocks UPDATE/DELETE for every role incl. service.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS agents;

-- -----------------------------------------------------------------------------
-- 1. Organizations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_organizations (
  id              TEXT PRIMARY KEY DEFAULT ('org_' || gen_random_uuid()::text),
  name            TEXT NOT NULL,
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_tier       TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan_tier IN ('free','startup','growth','enterprise')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_orgs_owner ON agents.agent_organizations(owner_user_id);

-- -----------------------------------------------------------------------------
-- 2. Organization members (maps auth users → orgs; RLS uses this for SELECT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_organization_members (
  id              TEXT PRIMARY KEY DEFAULT ('mem_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner','admin','member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_org_members_user ON agents.agent_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_org_members_org  ON agents.agent_organization_members(organization_id);

-- -----------------------------------------------------------------------------
-- 3. Agents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agents (
  id              TEXT PRIMARY KEY DEFAULT ('agt_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  agent_type      TEXT NOT NULL DEFAULT 'generic',  -- e.g. generic, shopping, devtools
  public_key      TEXT,                             -- Ed25519 public key (base64)
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_org    ON agents.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents.agents(status);

-- -----------------------------------------------------------------------------
-- 4. Wallets (one per agent, virtual USD in Phase 1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_wallets (
  id                TEXT PRIMARY KEY DEFAULT ('wlt_' || gen_random_uuid()::text),
  agent_id          TEXT NOT NULL UNIQUE REFERENCES agents.agents(id) ON DELETE CASCADE,
  organization_id   TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  balance_cents     BIGINT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  finix_balance_ref TEXT,                            -- reserved for Phase 2 settlement
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_wallets_org ON agents.agent_wallets(organization_id);

-- -----------------------------------------------------------------------------
-- 5. Policies (guardrails per wallet)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_policies (
  id                    TEXT PRIMARY KEY DEFAULT ('pol_' || gen_random_uuid()::text),
  wallet_id             TEXT NOT NULL UNIQUE REFERENCES agents.agent_wallets(id) ON DELETE CASCADE,
  organization_id       TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  monthly_budget_cents  BIGINT,
  daily_cap_cents       BIGINT,
  per_tx_cap_cents      BIGINT,
  merchant_whitelist    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- array of external merchant ids
  merchant_blacklist    JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_categories    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- empty = all categories allowed
  time_window_start     TIME,                                 -- UTC time of day; null = no restriction
  time_window_end       TIME,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_policies_org ON agents.agent_policies(organization_id);

-- -----------------------------------------------------------------------------
-- 6. Transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_transactions (
  id                    TEXT PRIMARY KEY DEFAULT ('txn_' || gen_random_uuid()::text),
  agent_id              TEXT NOT NULL REFERENCES agents.agents(id) ON DELETE RESTRICT,
  wallet_id             TEXT NOT NULL REFERENCES agents.agent_wallets(id) ON DELETE RESTRICT,
  organization_id       TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE RESTRICT,
  amount_cents          BIGINT NOT NULL CHECK (amount_cents > 0),
  currency              TEXT NOT NULL DEFAULT 'USD',
  merchant_id           TEXT,                                  -- external id from agent POV
  category              TEXT,
  status                TEXT NOT NULL DEFAULT 'authorized'
                          CHECK (status IN ('authorized','captured','denied','failed','reversed')),
  protocol_used         TEXT,                                  -- e.g. 'zenipay_v1','x402','ap2'
  policy_check_result   JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature             TEXT,                                  -- Ed25519 signature, base64
  idempotency_key       TEXT,
  settled_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_tx_org       ON agents.agent_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_agent     ON agents.agent_transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_wallet    ON agents.agent_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_status    ON agents.agent_transactions(status);

-- -----------------------------------------------------------------------------
-- 7. API keys (SDK auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_api_keys (
  id              TEXT PRIMARY KEY DEFAULT ('key_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,                        -- SHA-256 hex of the raw key
  key_prefix      TEXT NOT NULL,                               -- first 12 chars for display (zpk_live_xxxx)
  environment     TEXT NOT NULL DEFAULT 'test'
                    CHECK (environment IN ('test','live')),
  name            TEXT NOT NULL DEFAULT 'default',
  scopes          JSONB NOT NULL DEFAULT '["agents:read","agents:write","payments:authorize"]'::jsonb,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_org  ON agents.agent_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash ON agents.agent_api_keys(key_hash) WHERE revoked_at IS NULL;

-- -----------------------------------------------------------------------------
-- 8. Audit log (append-only, immutable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents.agent_audit_log (
  id              TEXT PRIMARY KEY DEFAULT ('aud_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE RESTRICT,
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('user','agent','system','api_key')),
  actor_id        TEXT,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_org   ON agents.agent_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_event ON agents.agent_audit_log(event_type);

-- Block UPDATE/DELETE on audit log for all roles (incl. service_role).
CREATE OR REPLACE FUNCTION agents.prevent_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'agent_audit_log is append-only; % not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_audit_no_update ON agents.agent_audit_log;
CREATE TRIGGER trg_agent_audit_no_update
  BEFORE UPDATE OR DELETE OR TRUNCATE ON agents.agent_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION agents.prevent_audit_mutation();

-- -----------------------------------------------------------------------------
-- 9. updated_at auto-touch trigger (applied to all mutable tables)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agents.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_organizations','agents','agent_wallets',
    'agent_policies','agent_transactions'
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
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Strategy:
--   * Enable RLS on every table.
--   * SELECT allowed to authenticated users who are members of the org.
--   * INSERT / UPDATE / DELETE have NO policies for anon/authenticated — only
--     service_role (which bypasses RLS) can write. The Next.js API routes use
--     service_role via getSupabaseAdmin().
--   * agent_audit_log additionally has a trigger that blocks UPDATE/DELETE for
--     every role, including service_role.
-- =============================================================================

ALTER TABLE agents.agent_organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_organization_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agents                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_wallets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_policies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_api_keys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_audit_log             ENABLE ROW LEVEL SECURITY;

-- Helper predicate inlined per policy (no SECURITY DEFINER function to keep it
-- transparent to auditors).

-- agent_organizations: member of the org
DROP POLICY IF EXISTS org_select_members ON agents.agent_organizations;
CREATE POLICY org_select_members ON agents.agent_organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents.agent_organization_members m
      WHERE m.organization_id = agent_organizations.id
        AND m.user_id = auth.uid()
    )
  );

-- agent_organization_members: see your own memberships
DROP POLICY IF EXISTS org_members_select_self ON agents.agent_organization_members;
CREATE POLICY org_members_select_self ON agents.agent_organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- All org-scoped tables: same shape
DROP POLICY IF EXISTS agents_select_by_org ON agents.agents;
CREATE POLICY agents_select_by_org ON agents.agents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agents.organization_id
              AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS wallets_select_by_org ON agents.agent_wallets;
CREATE POLICY wallets_select_by_org ON agents.agent_wallets
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agent_wallets.organization_id
              AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS policies_select_by_org ON agents.agent_policies;
CREATE POLICY policies_select_by_org ON agents.agent_policies
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agent_policies.organization_id
              AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS tx_select_by_org ON agents.agent_transactions;
CREATE POLICY tx_select_by_org ON agents.agent_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agent_transactions.organization_id
              AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS api_keys_select_by_org ON agents.agent_api_keys;
CREATE POLICY api_keys_select_by_org ON agents.agent_api_keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agent_api_keys.organization_id
              AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS audit_select_by_org ON agents.agent_audit_log;
CREATE POLICY audit_select_by_org ON agents.agent_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM agents.agent_organization_members m
            WHERE m.organization_id = agent_audit_log.organization_id
              AND m.user_id = auth.uid())
  );

-- Explicit grants: authenticated role can only SELECT through policies.
GRANT USAGE ON SCHEMA agents TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA agents TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA agents TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA agents TO authenticated, service_role;
