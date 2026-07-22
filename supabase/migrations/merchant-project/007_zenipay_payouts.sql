-- Payouts FROM merchant TO their recipients (vendors, affiliates, etc.)

CREATE TABLE IF NOT EXISTS public.zenipay_payouts (
  id                TEXT PRIMARY KEY,
  merchant_id       TEXT NOT NULL REFERENCES public.zenipay_merchants(id) ON DELETE CASCADE,
  recipient_id      TEXT,  -- optional link to another merchant or customer
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT DEFAULT 'CAD',
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'returned')),
  method            TEXT DEFAULT 'ach' CHECK (method IN ('ach', 'wire', 'rtp', 'check', 'card')),
  destination       JSONB NOT NULL,  -- { account: ..., routing: ..., name: ..., type: 'checking'|'savings' }
  description       TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  gateway_tx_id     TEXT,
  fees              NUMERIC(10,2) DEFAULT 0,
  net_amount        NUMERIC(12,2),
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_merchant  ON public.zenipay_payouts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status    ON public.zenipay_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_recipient ON public.zenipay_payouts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payouts_created   ON public.zenipay_payouts(created_at DESC);

-- RLS
ALTER TABLE public.zenipay_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant CRUD own payouts"
  ON public.zenipay_payouts
  FOR ALL
  TO authenticated
  USING (merchant_id = auth.uid()::text)
  WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Service role full access payouts"
  ON public.zenipay_payouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin read all payouts"
  ON public.zenipay_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Updated at trigger
DROP TRIGGER IF EXISTS update_zenipay_payouts_updated_at ON public.zenipay_payouts;
CREATE TRIGGER update_zenipay_payouts_updated_at
  BEFORE UPDATE ON public.zenipay_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();