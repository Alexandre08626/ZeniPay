-- ZeniPay Agents — Public schema migration
-- Run in Supabase Dashboard SQL Editor or via:
--   supabase db query --db-url "postgresql://postgres...." -f scripts/migrate-agents-public.sql

-- 1. Organizations
CREATE TABLE IF NOT EXISTS agent_organizations (
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
CREATE INDEX IF NOT EXISTS idx_agent_orgs_owner ON agent_organizations(owner_user_id);

-- 2. Organization members
CREATE TABLE IF NOT EXISTS agent_organization_members (
  id              TEXT PRIMARY KEY DEFAULT ('mem_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner','admin','member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_org_members_user ON agent_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_org_members_org  ON agent_organization_members(organization_id);

-- 3. Agents
CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY DEFAULT ('agt_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  agent_type      TEXT NOT NULL DEFAULT 'generic',
  public_key      TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_org    ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 4. Wallets
CREATE TABLE IF NOT EXISTS agent_wallets (
  id                TEXT PRIMARY KEY DEFAULT ('wlt_' || gen_random_uuid()::text),
  agent_id          TEXT NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
  organization_id   TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  balance_cents     BIGINT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  finix_balance_ref TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_wallets_org ON agent_wallets(organization_id);

-- 5. Policies
CREATE TABLE IF NOT EXISTS agent_policies (
  id                    TEXT PRIMARY KEY DEFAULT ('pol_' || gen_random_uuid()::text),
  wallet_id             TEXT NOT NULL UNIQUE REFERENCES agent_wallets(id) ON DELETE CASCADE,
  organization_id       TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  monthly_budget_cents  BIGINT,
  daily_cap_cents       BIGINT,
  per_tx_cap_cents      BIGINT,
  merchant_whitelist    JSONB NOT NULL DEFAULT '[]'::jsonb,
  merchant_blacklist    JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_categories    JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_window_start     TIME,
  time_window_end       TIME,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_policies_org ON agent_policies(organization_id);

-- 6. Transactions
CREATE TABLE IF NOT EXISTS agent_transactions (
  id                    TEXT PRIMARY KEY DEFAULT ('txn_' || gen_random_uuid()::text),
  agent_id              TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  wallet_id             TEXT NOT NULL REFERENCES agent_wallets(id) ON DELETE RESTRICT,
  organization_id       TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE RESTRICT,
  amount_cents          BIGINT NOT NULL CHECK (amount_cents > 0),
  currency              TEXT NOT NULL DEFAULT 'USD',
  merchant_id           TEXT,
  category              TEXT,
  status                TEXT NOT NULL DEFAULT 'authorized'
                          CHECK (status IN ('authorized','captured','denied','failed','reversed')),
  protocol_used         TEXT,
  policy_check_result   JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature             TEXT,
  idempotency_key       TEXT,
  settled_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_agent_tx_org       ON agent_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_agent     ON agent_transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_wallet    ON agent_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tx_status    ON agent_transactions(status);

-- 7. API keys
CREATE TABLE IF NOT EXISTS agent_api_keys (
  id              TEXT PRIMARY KEY DEFAULT ('key_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  key_hash        TEXT NOT NULL UNIQUE,
  key_prefix      TEXT NOT NULL,
  environment     TEXT NOT NULL DEFAULT 'test'
                    CHECK (environment IN ('test','live')),
  name            TEXT NOT NULL DEFAULT 'default',
  scopes          JSONB NOT NULL DEFAULT '["agents:read","agents:write","payments:authorize"]'::jsonb,
  last_used_at    TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_org  ON agent_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash ON agent_api_keys(key_hash) WHERE revoked_at IS NULL;

-- 8. Audit log (append-only)
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id              TEXT PRIMARY KEY DEFAULT ('aud_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE RESTRICT,
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('user','agent','system','api_key')),
  actor_id        TEXT,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_audit_org   ON agent_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_event ON agent_audit_log(event_type);

-- 9. Audit trigger function (defined early, applied in step 14)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'agent_audit_log is append-only; % not allowed', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$;
DROP TRIGGER IF EXISTS trg_agent_audit_no_update ON agent_audit_log;
CREATE TRIGGER trg_agent_audit_no_update
  BEFORE UPDATE OR DELETE OR TRUNCATE ON agent_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

-- touch_updated_at function — triggers applied after all tables exist (step 14)
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

-- 10. RLS
ALTER TABLE agent_organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_organization_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_policies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_api_keys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_log             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select_members ON agent_organizations;
CREATE POLICY org_select_members ON agent_organizations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_organizations.id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS org_members_select_self ON agent_organization_members;
CREATE POLICY org_members_select_self ON agent_organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS agents_select_by_org ON agents;
CREATE POLICY agents_select_by_org ON agents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agents.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS wallets_select_by_org ON agent_wallets;
CREATE POLICY wallets_select_by_org ON agent_wallets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_wallets.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS policies_select_by_org ON agent_policies;
CREATE POLICY policies_select_by_org ON agent_policies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_policies.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS tx_select_by_org ON agent_transactions;
CREATE POLICY tx_select_by_org ON agent_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_transactions.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS api_keys_select_by_org ON agent_api_keys;
CREATE POLICY api_keys_select_by_org ON agent_api_keys FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_api_keys.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS audit_select_by_org ON agent_audit_log;
CREATE POLICY audit_select_by_org ON agent_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_audit_log.organization_id AND m.user_id = auth.uid()));

-- 11. Org wallets & transfers
CREATE TABLE IF NOT EXISTS agent_org_wallets (
  id              TEXT PRIMARY KEY DEFAULT ('owl_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL UNIQUE REFERENCES agent_organizations(id) ON DELETE CASCADE,
  balance_cents   BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency        TEXT   NOT NULL DEFAULT 'USD',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agent_wallet_transfers (
  id                TEXT PRIMARY KEY DEFAULT ('trf_' || gen_random_uuid()::text),
  organization_id   TEXT NOT NULL REFERENCES agent_organizations(id) ON DELETE CASCADE,
  from_wallet_type  TEXT NOT NULL CHECK (from_wallet_type IN ('org','agent','treasury')),
  from_wallet_id    TEXT,
  to_wallet_type    TEXT NOT NULL CHECK (to_wallet_type   IN ('org','agent','treasury')),
  to_wallet_id      TEXT,
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  currency          TEXT   NOT NULL DEFAULT 'USD',
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_org ON agent_wallet_transfers(organization_id, created_at DESC);

ALTER TABLE agent_org_wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_wallet_transfers  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_wallet_select_by_org ON agent_org_wallets;
CREATE POLICY org_wallet_select_by_org ON agent_org_wallets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_org_wallets.organization_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS transfers_select_by_org ON agent_wallet_transfers;
CREATE POLICY transfers_select_by_org ON agent_wallet_transfers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agent_organization_members m WHERE m.organization_id = agent_wallet_transfers.organization_id AND m.user_id = auth.uid()));

-- 12. Transfer functions
CREATE OR REPLACE FUNCTION transfer_org_to_agent(
  p_organization_id TEXT, p_agent_wallet_id TEXT, p_amount_cents BIGINT, p_note TEXT DEFAULT NULL
) RETURNS TABLE (transfer_id TEXT, org_balance_cents BIGINT, agent_balance_cents BIGINT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_org_wallet_id TEXT; v_agent_org TEXT; v_new_org_balance BIGINT; v_new_agent_balance BIGINT; v_transfer_id TEXT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount_cents must be a positive integer' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_org_wallet_id FROM agent_org_wallets WHERE organization_id = p_organization_id FOR UPDATE;
  IF v_org_wallet_id IS NULL THEN RAISE EXCEPTION 'org wallet not found for %', p_organization_id USING ERRCODE = '23503'; END IF;
  SELECT organization_id INTO v_agent_org FROM agent_wallets WHERE id = p_agent_wallet_id FOR UPDATE;
  IF v_agent_org IS NULL OR v_agent_org <> p_organization_id THEN RAISE EXCEPTION 'agent wallet % not in organization %', p_agent_wallet_id, p_organization_id USING ERRCODE = '23503'; END IF;
  UPDATE agent_org_wallets SET balance_cents = balance_cents - p_amount_cents, updated_at = NOW() WHERE id = v_org_wallet_id RETURNING balance_cents INTO v_new_org_balance;
  UPDATE agent_wallets SET balance_cents = balance_cents + p_amount_cents, updated_at = NOW() WHERE id = p_agent_wallet_id RETURNING balance_cents INTO v_new_agent_balance;
  INSERT INTO agent_wallet_transfers (organization_id, from_wallet_type, from_wallet_id, to_wallet_type, to_wallet_id, amount_cents, note) VALUES (p_organization_id, 'org', v_org_wallet_id, 'agent', p_agent_wallet_id, p_amount_cents, p_note) RETURNING id INTO v_transfer_id;
  transfer_id := v_transfer_id; org_balance_cents := v_new_org_balance; agent_balance_cents := v_new_agent_balance; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION top_up_org_wallet(
  p_organization_id TEXT, p_amount_cents BIGINT, p_note TEXT DEFAULT NULL
) RETURNS TABLE (transfer_id TEXT, org_balance_cents BIGINT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_org_wallet_id TEXT; v_new_balance BIGINT; v_transfer_id TEXT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'amount_cents must be positive' USING ERRCODE = '22023'; END IF;
  INSERT INTO agent_org_wallets (organization_id) VALUES (p_organization_id) ON CONFLICT (organization_id) DO NOTHING;
  SELECT id INTO v_org_wallet_id FROM agent_org_wallets WHERE organization_id = p_organization_id FOR UPDATE;
  UPDATE agent_org_wallets SET balance_cents = balance_cents + p_amount_cents, updated_at = NOW() WHERE id = v_org_wallet_id RETURNING balance_cents INTO v_new_balance;
  INSERT INTO agent_wallet_transfers (organization_id, from_wallet_type, from_wallet_id, to_wallet_type, to_wallet_id, amount_cents, note) VALUES (p_organization_id, 'treasury', NULL, 'org', v_org_wallet_id, p_amount_cents, p_note) RETURNING id INTO v_transfer_id;
  transfer_id := v_transfer_id; org_balance_cents := v_new_balance; RETURN NEXT;
END;
$$;

-- 13. Grants
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION transfer_org_to_agent(TEXT, TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION top_up_org_wallet(TEXT, BIGINT, TEXT)            TO service_role;

-- 14a. Apply updated_at triggers for tables created before step 11
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_organizations','agents','agent_wallets','agent_policies','agent_transactions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON %I; CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at();', t, t, t, t);
  END LOOP;
END;
$$;

-- 14b. Apply updated_at trigger for agent_org_wallets (created in step 11)
DROP TRIGGER IF EXISTS trg_agent_org_wallets_touch ON agent_org_wallets;
CREATE TRIGGER trg_agent_org_wallets_touch BEFORE UPDATE ON agent_org_wallets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
