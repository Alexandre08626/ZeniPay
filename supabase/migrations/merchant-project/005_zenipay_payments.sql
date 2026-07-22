-- Payment transactions per merchant

CREATE TABLE IF NOT EXISTS public.zenipay_payments (
  id                TEXT PRIMARY KEY,
  merchant_id       TEXT NOT NULL REFERENCES public.zenipay_merchants(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT DEFAULT 'CAD',
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'cancelled')),
  payment_method    TEXT,
  gateway           TEXT DEFAULT 'finix',
  gateway_tx_id     TEXT,
  customer_email    TEXT,
  customer_name     TEXT,
  description       TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_merchant  ON public.zenipay_payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON public.zenipay_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created   ON public.zenipay_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_tx ON public.zenipay_payments(gateway_tx_id);

-- RLS
ALTER TABLE public.zenipay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant read own payments"
  ON public.zenipay_payments
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid()::text);

CREATE POLICY "Service role full access payments"
  ON public.zenipay_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin read all payments"
  ON public.zenipay_payments
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
DROP TRIGGER IF EXISTS update_zenipay_payments_updated_at ON public.zenipay_payments;
CREATE TRIGGER update_zenipay_payments_updated_at
  BEFORE UPDATE ON public.zenipay_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();