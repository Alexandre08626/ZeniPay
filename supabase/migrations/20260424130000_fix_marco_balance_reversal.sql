-- PR 10 hotfix — correct the architectural mistake where the acceptance
-- test transferred $0.01 CAD merchant → directly to Marco's agent wallet.
--
-- Alex's rule (non-negotiable): merchant transfers ALWAYS land in the
-- org treasury; then a separate manual action distributes from treasury
-- to a specific agent.
--
-- The test run (idempotency_key `acc-test-1777035370-001`) wrote 4
-- journal entries:
--   seq 1 debit  external_inbound (zenipay_global) CAD 0.01
--   seq 2 credit org_treasury                     CAD 0.01
--   seq 3 debit  org_treasury                     CAD 0.01
--   seq 4 credit agent_wallet (Marco)             CAD 0.01
--
-- seq 1+2 are correct. seq 3+4 are the illegal direct distribute leg.
-- We keep the journal chain intact (never delete entries — chain_hash
-- depends on it) and simply correct the _balance cache_ on the two
-- zenicore.accounts rows. The journal still tells the full story;
-- downstream read paths should be fixed in a follow-up to ignore the
-- seq 3+4 distribute-leg tx_group when originated by distribute-from-
-- merchant (post-hotfix that entire path is removed, so future runs
-- won't produce a mis-credited distribute leg at all).
--
-- Idempotent: the WHERE clauses target exactly 2 rows and the
-- post-conditions (balance_micro values) are the fixed targets.

BEGIN;

-- 1. zero Marco's CAD agent wallet.
UPDATE zenicore.accounts
   SET balance_micro = 0,
       updated_at    = NOW()
 WHERE owner_type = 'agent_wallet'
   AND owner_ref  = 'agt_04d9b6a8-d9a3-4451-a6d6-86dd59ed165e'
   AND currency   = 'CAD';

-- 2. credit the $0.01 back to org treasury CAD.
UPDATE zenicore.accounts
   SET balance_micro = 10000,
       updated_at    = NOW()
 WHERE owner_type = 'org_treasury'
   AND owner_ref  = 'org_1707cddd-147e-4ab1-a454-3571ed551603'
   AND currency   = 'CAD';

-- Sanity check — both rows must now have the intended balances.
DO $$
DECLARE
  treasury_bal BIGINT;
  agent_bal    BIGINT;
BEGIN
  SELECT balance_micro INTO treasury_bal
    FROM zenicore.accounts
   WHERE owner_type='org_treasury'
     AND owner_ref='org_1707cddd-147e-4ab1-a454-3571ed551603'
     AND currency='CAD';

  SELECT balance_micro INTO agent_bal
    FROM zenicore.accounts
   WHERE owner_type='agent_wallet'
     AND owner_ref='agt_04d9b6a8-d9a3-4451-a6d6-86dd59ed165e'
     AND currency='CAD';

  IF treasury_bal IS DISTINCT FROM 10000 THEN
    RAISE EXCEPTION 'treasury CAD balance_micro should be 10000, got %', treasury_bal;
  END IF;
  IF agent_bal IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Marco CAD balance_micro should be 0, got %', agent_bal;
  END IF;

  RAISE NOTICE 'fix_marco_balance_reversal OK — treasury=% agent=%', treasury_bal, agent_bal;
END $$;

COMMIT;
