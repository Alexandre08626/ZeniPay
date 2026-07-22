-- Bank accounts per merchant (for ACH/wire payouts)

CREATE TABLE IF NOT EXISTS public.zenipay_bank_accounts (
  id                TEXT PRIMARY KEY,
  merchant_id       TEXT NOT NULL REFERENCES public.zenipay_merchants(id) ON DELETE CASCADE,
  account_name      TEXT NOT NULL,
  account_type      TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
  routing_number    TEXT NOT NULL,
  account_number    TEXT NOT NULL,  -- encrypted in app layer
  bank_name         TEXT,
  is_default        BOOLEAN DEFAULT FALSE,
  is_verified       BOOLEAN DEFAULT FALSE,
  verification_method TEXT CHECK (verification_method IN ('microdeposits', 'plaid', 'manual', 'instant')),
  finix_instrument_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, account_name)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_merchant ON public.zenipay_bank_accounts(merchant_id);

-- RLS
ALTER TABLE public.zenipay_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant CRUD own bank accounts"
  ON public.zenipay_bank_accounts
  FOR ALL
  TO authenticated
  USING (merchant_id = auth.uid()::text)
  WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Service role full access bank accounts"
  ON public.zenipay_bank_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_zenipay_bank_accounts_updated_at ON public.zenipay_bank_accounts;
CREATE TRIGGER update_zenipay_bank_accounts_updated_at
  BEFORE UPDATE ON public.zenipay_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();