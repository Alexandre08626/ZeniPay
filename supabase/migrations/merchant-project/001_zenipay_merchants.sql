-- ZeniPay Merchants Table
-- Stores all merchant signups with full KYC/KYB data

CREATE TABLE IF NOT EXISTS public.zenipay_merchants (
  id               TEXT PRIMARY KEY,
  auth_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name    TEXT NOT NULL,
  owner_name       TEXT,
  email            TEXT NOT NULL,
  phone            TEXT,
  website          TEXT,
  business_type    TEXT,
  country          TEXT DEFAULT 'CA',
  monthly_volume   TEXT,
  status           TEXT DEFAULT 'sandbox' CHECK (status IN ('pending_kyb', 'sandbox', 'active', 'suspended', 'rejected', 'closed')),
  plan             TEXT DEFAULT 'Standard' CHECK (plan IN ('Standard', 'Professional', 'Enterprise')),
  sandbox_key      TEXT,
  sandbox_secret   TEXT,
  live_key         TEXT,
  live_secret      TEXT,
  volume           NUMERIC DEFAULT 0,
  tx_count         INTEGER DEFAULT 0,
  balance          NUMERIC DEFAULT 0,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_merchants_email      ON public.zenipay_merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_status     ON public.zenipay_merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_auth_user  ON public.zenipay_merchants(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_created    ON public.zenipay_merchants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_plan       ON public.zenipay_merchants(plan);

-- Merchant data store (JSONB for flexible per-merchant data: paylinks, invoices, payouts, bank config, passwords, etc.)
ALTER TABLE public.zenipay_merchants
  ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_zenipay_merchants_updated_at ON public.zenipay_merchants;
CREATE TRIGGER update_zenipay_merchants_updated_at
  BEFORE UPDATE ON public.zenipay_merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();