-- Create zenipay_accounts table (referenced by many routes but never created in a migration)
-- zenipay_merchants.id is UUID in production, but merchant IDs may be text in some DBs.
-- No FK constraint to avoid type mismatch (UUID vs TEXT).
CREATE TABLE IF NOT EXISTS public.zenipay_accounts (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  merchant_id       TEXT NOT NULL,
  account_type      TEXT NOT NULL DEFAULT 'business_checking',
  account_name      TEXT NOT NULL DEFAULT 'New Account',
  account_number    TEXT NOT NULL,
  balance           NUMERIC NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  is_primary        BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'active',
  interest_rate     NUMERIC DEFAULT 0,
  goal_amount       NUMERIC,
  goal_deadline     TIMESTAMPTZ,
  account_data      JSONB DEFAULT '{}'::jsonb,
  zp_account_number TEXT,
  zp_routing_code   TEXT,
  finix_balance_synced_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast merchant lookups
CREATE INDEX IF NOT EXISTS idx_zenipay_accounts_merchant ON public.zenipay_accounts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_zenipay_accounts_primary  ON public.zenipay_accounts(merchant_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.zenipay_accounts ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (service-role backend calls)
CREATE POLICY service_role_all ON public.zenipay_accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow merchant to read their own accounts (authenticated via session)
-- merchant_id is TEXT, zenipay_merchants.id is UUID → cast to text for comparison
CREATE POLICY merchant_select ON public.zenipay_accounts
  FOR SELECT TO authenticated
  USING (merchant_id IN (
    SELECT id::text FROM public.zenipay_merchants WHERE id::text = merchant_id
  ));

-- Allow insert by authenticated merchants
CREATE POLICY merchant_insert ON public.zenipay_accounts
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (
    SELECT id::text FROM public.zenipay_merchants
  ));

-- Allow update by authenticated merchants (their own rows)
CREATE POLICY merchant_update ON public.zenipay_accounts
  FOR UPDATE TO authenticated
  USING (merchant_id IN (
    SELECT id::text FROM public.zenipay_merchants WHERE id::text = merchant_id
  ))
  WITH CHECK (merchant_id IN (
    SELECT id::text FROM public.zenipay_merchants
  ));
