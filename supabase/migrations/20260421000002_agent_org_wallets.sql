-- =============================================================================
-- Org-level master wallet + transfer ledger (Phase 1 · wallets page)
-- =============================================================================
-- One org_wallet per organization. Treasury funds flow:
--   treasury → org_wallet   (top_up; a real Finix charge in Phase 2)
--   org_wallet → agent      (distribute to an agent's wallet)
--   agent → org_wallet      (withdraw / reclaim; Phase 2)
-- Every movement writes to agent_wallet_transfers (append-only in practice —
-- no UPDATE endpoints exposed).
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents.agent_org_wallets (
  id              TEXT PRIMARY KEY DEFAULT ('owl_' || gen_random_uuid()::text),
  organization_id TEXT NOT NULL UNIQUE REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  balance_cents   BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency        TEXT   NOT NULL DEFAULT 'USD',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents.agent_wallet_transfers (
  id                TEXT PRIMARY KEY DEFAULT ('trf_' || gen_random_uuid()::text),
  organization_id   TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  from_wallet_type  TEXT NOT NULL CHECK (from_wallet_type IN ('org','agent','treasury')),
  from_wallet_id    TEXT,                                     -- null if treasury
  to_wallet_type    TEXT NOT NULL CHECK (to_wallet_type   IN ('org','agent','treasury')),
  to_wallet_id      TEXT,
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  currency          TEXT   NOT NULL DEFAULT 'USD',
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_org ON agents.agent_wallet_transfers(organization_id, created_at DESC);

-- Atomic transfer from org_wallet → agent wallet inside a single txn.
-- SECURITY INVOKER: caller must already be scoped via service_role.
CREATE OR REPLACE FUNCTION agents.transfer_org_to_agent(
  p_organization_id TEXT,
  p_agent_wallet_id TEXT,
  p_amount_cents    BIGINT,
  p_note            TEXT DEFAULT NULL
)
RETURNS TABLE (
  transfer_id         TEXT,
  org_balance_cents   BIGINT,
  agent_balance_cents BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
DECLARE
  v_org_wallet_id     TEXT;
  v_agent_org         TEXT;
  v_new_org_balance   BIGINT;
  v_new_agent_balance BIGINT;
  v_transfer_id       TEXT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be a positive integer' USING ERRCODE = '22023';
  END IF;

  -- Verify + lock the org's master wallet.
  SELECT id INTO v_org_wallet_id
  FROM agents.agent_org_wallets
  WHERE organization_id = p_organization_id
  FOR UPDATE;
  IF v_org_wallet_id IS NULL THEN
    RAISE EXCEPTION 'org wallet not found for %', p_organization_id USING ERRCODE = '23503';
  END IF;

  -- Verify the agent wallet is in the same org.
  SELECT organization_id INTO v_agent_org
  FROM agents.agent_wallets
  WHERE id = p_agent_wallet_id
  FOR UPDATE;
  IF v_agent_org IS NULL OR v_agent_org <> p_organization_id THEN
    RAISE EXCEPTION 'agent wallet % not in organization %', p_agent_wallet_id, p_organization_id
      USING ERRCODE = '23503';
  END IF;

  -- Debit org wallet (CHECK constraint enforces non-negative).
  UPDATE agents.agent_org_wallets
  SET balance_cents = balance_cents - p_amount_cents,
      updated_at    = NOW()
  WHERE id = v_org_wallet_id
  RETURNING balance_cents INTO v_new_org_balance;

  -- Credit agent wallet.
  UPDATE agents.agent_wallets
  SET balance_cents = balance_cents + p_amount_cents,
      updated_at    = NOW()
  WHERE id = p_agent_wallet_id
  RETURNING balance_cents INTO v_new_agent_balance;

  -- Write transfer record.
  INSERT INTO agents.agent_wallet_transfers (
    organization_id, from_wallet_type, from_wallet_id,
    to_wallet_type,  to_wallet_id, amount_cents, note
  ) VALUES (
    p_organization_id, 'org', v_org_wallet_id,
    'agent', p_agent_wallet_id, p_amount_cents, p_note
  )
  RETURNING id INTO v_transfer_id;

  transfer_id         := v_transfer_id;
  org_balance_cents   := v_new_org_balance;
  agent_balance_cents := v_new_agent_balance;
  RETURN NEXT;
END;
$fn$;

-- Atomic top-up: credits the org wallet and writes a treasury → org transfer.
-- Phase 2 replaces this with a real Finix charge; for Phase 1 it's a
-- dashboard-level add-funds used by the demo flow.
CREATE OR REPLACE FUNCTION agents.top_up_org_wallet(
  p_organization_id TEXT,
  p_amount_cents    BIGINT,
  p_note            TEXT DEFAULT NULL
)
RETURNS TABLE (
  transfer_id       TEXT,
  org_balance_cents BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $fn$
DECLARE
  v_org_wallet_id   TEXT;
  v_new_balance     BIGINT;
  v_transfer_id     TEXT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount_cents must be positive' USING ERRCODE = '22023';
  END IF;

  -- Get-or-create the org wallet, then lock.
  INSERT INTO agents.agent_org_wallets (organization_id)
  VALUES (p_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  SELECT id INTO v_org_wallet_id
  FROM agents.agent_org_wallets
  WHERE organization_id = p_organization_id
  FOR UPDATE;

  UPDATE agents.agent_org_wallets
  SET balance_cents = balance_cents + p_amount_cents,
      updated_at    = NOW()
  WHERE id = v_org_wallet_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO agents.agent_wallet_transfers (
    organization_id, from_wallet_type, from_wallet_id,
    to_wallet_type,  to_wallet_id, amount_cents, note
  ) VALUES (
    p_organization_id, 'treasury', NULL,
    'org', v_org_wallet_id, p_amount_cents, p_note
  )
  RETURNING id INTO v_transfer_id;

  transfer_id       := v_transfer_id;
  org_balance_cents := v_new_balance;
  RETURN NEXT;
END;
$fn$;

-- RLS
ALTER TABLE agents.agent_org_wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_wallet_transfers  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_wallet_select_by_org ON agents.agent_org_wallets;
CREATE POLICY org_wallet_select_by_org ON agents.agent_org_wallets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agents.agent_organization_members m
                 WHERE m.organization_id = agent_org_wallets.organization_id
                   AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS transfers_select_by_org ON agents.agent_wallet_transfers;
CREATE POLICY transfers_select_by_org ON agents.agent_wallet_transfers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM agents.agent_organization_members m
                 WHERE m.organization_id = agent_wallet_transfers.organization_id
                   AND m.user_id = auth.uid()));

GRANT SELECT ON agents.agent_org_wallets, agents.agent_wallet_transfers TO authenticated;
GRANT ALL    ON agents.agent_org_wallets, agents.agent_wallet_transfers TO service_role;
GRANT EXECUTE ON FUNCTION agents.transfer_org_to_agent(TEXT, TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION agents.top_up_org_wallet(TEXT, BIGINT, TEXT)            TO service_role;
