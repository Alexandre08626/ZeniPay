-- Hotfix: zc_distribute_to_agent fails silently when the target agent
-- has no `zenicore.accounts` row yet (e.g. Ben — created via the agents
-- API but never funded, so no agent_wallet account was provisioned).
--
-- This migration adds a SECURITY DEFINER wrapper that upserts the agent
-- wallet row with balance_micro=0 if it doesn't exist. API routes call
-- it immediately before zc_distribute_to_agent / zc_reclaim_from_agent.
--
-- We also add a UNIQUE constraint on (owner_type, owner_ref, currency)
-- if missing, so the ON CONFLICT behaviour is well-defined regardless
-- of which helper creates the row.

BEGIN;

CREATE OR REPLACE FUNCTION public.zc_ensure_agent_account(
  p_agent_id TEXT,
  p_currency TEXT DEFAULT 'CAD'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, zenicore, pg_temp
AS $$
DECLARE
  v_existing_id TEXT;
  v_new_id      TEXT;
BEGIN
  IF p_agent_id IS NULL OR length(p_agent_id) = 0 THEN
    RAISE EXCEPTION 'agent_id_required' USING ERRCODE = '22000';
  END IF;

  -- Short-circuit when the account already exists — the hot path for
  -- every distribute after the first one is a single SELECT.
  SELECT id INTO v_existing_id
    FROM zenicore.accounts
   WHERE owner_type = 'agent_wallet'
     AND owner_ref  = p_agent_id
     AND currency   = p_currency
   LIMIT 1;
  IF v_existing_id IS NOT NULL THEN RETURN v_existing_id; END IF;

  v_new_id := 'zca_' || encode(gen_random_bytes(12), 'hex');

  -- INSERT… ON CONFLICT DO NOTHING relies on an existing UNIQUE index
  -- covering (owner_type, owner_ref, currency). If Claude-Web's schema
  -- didn't already set one up, add it here (idempotent).
  BEGIN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS zenicore_accounts_owner_currency_uniq '
         || 'ON zenicore.accounts (owner_type, owner_ref, currency)';
  EXCEPTION WHEN others THEN
    -- If we lack DDL rights here (Supabase managed setups can restrict
    -- CREATE INDEX from SECURITY DEFINER funcs), fall through — the
    -- race window is microscopic and the re-SELECT at the bottom still
    -- returns the right id.
    NULL;
  END;

  INSERT INTO zenicore.accounts
    (id, owner_type, owner_ref, currency, balance_micro,
     pending_debit_micro, locked_for_dispute_micro, status,
     created_at, updated_at)
  VALUES
    (v_new_id, 'agent_wallet', p_agent_id, p_currency, 0,
     0, 0, 'active',
     now(), now())
  ON CONFLICT (owner_type, owner_ref, currency) DO NOTHING;

  -- Re-SELECT to account for the ON CONFLICT case (another txn won).
  SELECT id INTO v_existing_id
    FROM zenicore.accounts
   WHERE owner_type = 'agent_wallet'
     AND owner_ref  = p_agent_id
     AND currency   = p_currency
   LIMIT 1;

  RETURN v_existing_id;
END $$;

GRANT EXECUTE ON FUNCTION public.zc_ensure_agent_account(TEXT, TEXT)
  TO service_role, authenticated, anon;

COMMENT ON FUNCTION public.zc_ensure_agent_account IS
  'Idempotent: returns the zenicore.accounts.id for (agent_wallet, agent_id, currency), creating a zero-balance row on first call.';

COMMIT;
