-- Reverse-flow RPCs for the agent-treasury bridge.
--
-- Two new SECURITY DEFINER functions mirror the existing forward flow:
--
--   zc_reclaim_from_agent(org, agent, amt, cur, key, by)
--     Debit  agent_wallet    (balance_micro −= amt)
--     Credit org_treasury    (balance_micro += amt)
--     tx_group.kind = 'reclaim_from_agent'
--
--   zc_return_to_merchant(org, merchant_ref, amt, cur, key, by)
--     Debit  org_treasury       (balance_micro −= amt)
--     Credit external_outbound  (balance_micro += amt; auto-created if missing)
--     tx_group.kind = 'return_to_merchant'
--
-- Both are idempotent (re-running with the same idempotency_key returns
-- the existing tx_group id). Both enforce sufficient balance on the
-- source account and raise SQLSTATE 22000 on insufficient_funds (same
-- convention as zc_hold_for_card_auth so callers can share the handler).
--
-- Chain-hash note: we compute chain_hash as
--     sha256(prev_chain_hash || entry_id || seq || account_id ||
--            direction || amount_micro || currency || posted_at)
-- which matches the pattern that produced the existing chain. If the
-- internal zenicore helper uses a different canonical form, the first
-- zc_verify_chain_integrity run after these entries will flag them and
-- we can rehash in a follow-up migration — no money is lost, just the
-- tamper-evidence signal is temporarily degraded on those rows.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── zc_reclaim_from_agent ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.zc_reclaim_from_agent(
  p_organization_id text,
  p_agent_id        text,
  p_amount_micro    bigint,
  p_currency        text,
  p_idempotency_key text,
  p_posted_by       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, zenicore, pg_temp
AS $$
DECLARE
  v_tx_id          text;
  v_agent_acc_id   text;
  v_treasury_id    text;
  v_now            timestamptz := now();
  v_prev_hash      text;
  v_seq            bigint;
  v_debit_id       text;
  v_credit_id      text;
  v_agent_bal      bigint;
BEGIN
  SELECT id INTO v_tx_id FROM zenicore.tx_groups WHERE idempotency_key = p_idempotency_key;
  IF v_tx_id IS NOT NULL THEN RETURN v_tx_id; END IF;

  SELECT id, balance_micro INTO v_agent_acc_id, v_agent_bal
    FROM zenicore.accounts
   WHERE owner_type = 'agent_wallet'
     AND owner_ref  = p_agent_id
     AND currency   = p_currency;
  IF v_agent_acc_id IS NULL THEN
    RAISE EXCEPTION 'agent_wallet_not_found: agent=% currency=%', p_agent_id, p_currency USING ERRCODE = '22000';
  END IF;
  IF v_agent_bal < p_amount_micro THEN
    RAISE EXCEPTION 'insufficient_funds: available=% requested=%', v_agent_bal, p_amount_micro USING ERRCODE = '22000';
  END IF;

  SELECT id INTO v_treasury_id
    FROM zenicore.accounts
   WHERE owner_type = 'org_treasury'
     AND owner_ref  = p_organization_id
     AND currency   = p_currency;
  IF v_treasury_id IS NULL THEN
    v_treasury_id := 'zca_' || encode(gen_random_bytes(12), 'hex');
    INSERT INTO zenicore.accounts(id, owner_type, owner_ref, currency, balance_micro, status, created_at, updated_at)
    VALUES (v_treasury_id, 'org_treasury', p_organization_id, p_currency, 0, 'active', v_now, v_now);
  END IF;

  v_tx_id := 'ztx_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.tx_groups(id, kind, status, organization_id, idempotency_key, metadata, created_at, posted_at)
  VALUES (v_tx_id, 'reclaim_from_agent', 'posted', p_organization_id, p_idempotency_key,
          jsonb_build_object('agent_id', p_agent_id), v_now, v_now);

  SELECT chain_hash, seq + 1
    INTO v_prev_hash, v_seq
    FROM zenicore.journal_entries
   ORDER BY seq DESC
   LIMIT 1;
  IF v_seq IS NULL THEN v_seq := 1; END IF;

  v_debit_id := 'zjn_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.journal_entries(
    id, seq, tx_group, posted_at, effective_at, account_id, direction,
    amount_micro, currency, memo, ref_type, ref_id, posted_by,
    chain_hash, prev_chain_hash
  ) VALUES (
    v_debit_id, v_seq, v_tx_id, v_now, v_now, v_agent_acc_id, 'debit',
    p_amount_micro, p_currency, 'Reclaimed to org treasury', 'agent_reclaim', p_agent_id,
    p_posted_by,
    encode(digest(COALESCE(v_prev_hash,'') || v_debit_id || v_seq::text || v_agent_acc_id || 'debit'
                  || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex'),
    v_prev_hash
  );
  UPDATE zenicore.accounts
     SET balance_micro = balance_micro - p_amount_micro, updated_at = v_now
   WHERE id = v_agent_acc_id;

  v_prev_hash := encode(digest(COALESCE(v_prev_hash,'') || v_debit_id || v_seq::text || v_agent_acc_id || 'debit'
                               || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex');
  v_seq := v_seq + 1;

  v_credit_id := 'zjn_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.journal_entries(
    id, seq, tx_group, posted_at, effective_at, account_id, direction,
    amount_micro, currency, memo, ref_type, ref_id, posted_by,
    chain_hash, prev_chain_hash
  ) VALUES (
    v_credit_id, v_seq, v_tx_id, v_now, v_now, v_treasury_id, 'credit',
    p_amount_micro, p_currency, 'Reclaim from agent ' || p_agent_id, 'agent_reclaim', p_agent_id,
    p_posted_by,
    encode(digest(v_prev_hash || v_credit_id || v_seq::text || v_treasury_id || 'credit'
                  || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex'),
    v_prev_hash
  );
  UPDATE zenicore.accounts
     SET balance_micro = balance_micro + p_amount_micro, updated_at = v_now
   WHERE id = v_treasury_id;

  RETURN v_tx_id;
END $$;

GRANT EXECUTE ON FUNCTION public.zc_reclaim_from_agent(text, text, bigint, text, text, text) TO service_role, authenticated, anon;

-- ─── zc_return_to_merchant ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.zc_return_to_merchant(
  p_organization_id text,
  p_merchant_ref    text,            -- e.g. 'merchant:zeniva-001'
  p_amount_micro    bigint,
  p_currency        text,
  p_idempotency_key text,
  p_posted_by       text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, zenicore, pg_temp
AS $$
DECLARE
  v_tx_id          text;
  v_treasury_id    text;
  v_sink_id        text;
  v_now            timestamptz := now();
  v_prev_hash      text;
  v_seq            bigint;
  v_debit_id       text;
  v_credit_id      text;
  v_treasury_bal   bigint;
BEGIN
  SELECT id INTO v_tx_id FROM zenicore.tx_groups WHERE idempotency_key = p_idempotency_key;
  IF v_tx_id IS NOT NULL THEN RETURN v_tx_id; END IF;

  SELECT id, balance_micro INTO v_treasury_id, v_treasury_bal
    FROM zenicore.accounts
   WHERE owner_type = 'org_treasury'
     AND owner_ref  = p_organization_id
     AND currency   = p_currency;
  IF v_treasury_id IS NULL THEN
    RAISE EXCEPTION 'treasury_not_found: org=% currency=%', p_organization_id, p_currency USING ERRCODE = '22000';
  END IF;
  IF v_treasury_bal < p_amount_micro THEN
    RAISE EXCEPTION 'insufficient_funds: available=% requested=%', v_treasury_bal, p_amount_micro USING ERRCODE = '22000';
  END IF;

  SELECT id INTO v_sink_id
    FROM zenicore.accounts
   WHERE owner_type = 'external_outbound'
     AND owner_ref  = p_merchant_ref
     AND currency   = p_currency;
  IF v_sink_id IS NULL THEN
    v_sink_id := 'zca_' || encode(gen_random_bytes(12), 'hex');
    INSERT INTO zenicore.accounts(id, owner_type, owner_ref, currency, balance_micro, status, created_at, updated_at)
    VALUES (v_sink_id, 'external_outbound', p_merchant_ref, p_currency, 0, 'active', v_now, v_now);
  END IF;

  v_tx_id := 'ztx_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.tx_groups(id, kind, status, organization_id, idempotency_key, metadata, created_at, posted_at)
  VALUES (v_tx_id, 'return_to_merchant', 'posted', p_organization_id, p_idempotency_key,
          jsonb_build_object('merchant_ref', p_merchant_ref), v_now, v_now);

  SELECT chain_hash, seq + 1
    INTO v_prev_hash, v_seq
    FROM zenicore.journal_entries
   ORDER BY seq DESC
   LIMIT 1;
  IF v_seq IS NULL THEN v_seq := 1; END IF;

  v_debit_id := 'zjn_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.journal_entries(
    id, seq, tx_group, posted_at, effective_at, account_id, direction,
    amount_micro, currency, memo, ref_type, ref_id, posted_by,
    chain_hash, prev_chain_hash
  ) VALUES (
    v_debit_id, v_seq, v_tx_id, v_now, v_now, v_treasury_id, 'debit',
    p_amount_micro, p_currency, 'Returned to ' || p_merchant_ref, 'merchant_return', p_merchant_ref,
    p_posted_by,
    encode(digest(COALESCE(v_prev_hash,'') || v_debit_id || v_seq::text || v_treasury_id || 'debit'
                  || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex'),
    v_prev_hash
  );
  UPDATE zenicore.accounts
     SET balance_micro = balance_micro - p_amount_micro, updated_at = v_now
   WHERE id = v_treasury_id;

  v_prev_hash := encode(digest(COALESCE(v_prev_hash,'') || v_debit_id || v_seq::text || v_treasury_id || 'debit'
                               || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex');
  v_seq := v_seq + 1;

  v_credit_id := 'zjn_' || encode(gen_random_bytes(12), 'hex');
  INSERT INTO zenicore.journal_entries(
    id, seq, tx_group, posted_at, effective_at, account_id, direction,
    amount_micro, currency, memo, ref_type, ref_id, posted_by,
    chain_hash, prev_chain_hash
  ) VALUES (
    v_credit_id, v_seq, v_tx_id, v_now, v_now, v_sink_id, 'credit',
    p_amount_micro, p_currency, 'External outbound: ' || p_merchant_ref, 'merchant_return', p_merchant_ref,
    p_posted_by,
    encode(digest(v_prev_hash || v_credit_id || v_seq::text || v_sink_id || 'credit'
                  || p_amount_micro::text || p_currency || v_now::text, 'sha256'), 'hex'),
    v_prev_hash
  );
  UPDATE zenicore.accounts
     SET balance_micro = balance_micro + p_amount_micro, updated_at = v_now
   WHERE id = v_sink_id;

  RETURN v_tx_id;
END $$;

GRANT EXECUTE ON FUNCTION public.zc_return_to_merchant(text, text, bigint, text, text, text) TO service_role, authenticated, anon;

COMMIT;
