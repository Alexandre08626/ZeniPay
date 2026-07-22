-- ZeniPay Billing: Invoices FROM ZeniPay TO merchants for processing fees

CREATE TABLE IF NOT EXISTS public.zenipay_billing (
  id                    TEXT PRIMARY KEY,
  merchant_id           TEXT NOT NULL REFERENCES public.zenipay_merchants(id) ON DELETE CASCADE,
  merchant_name         TEXT,
  invoice_number        TEXT UNIQUE NOT NULL,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  transactions_count    INTEGER DEFAULT 0,
  transactions_volume   NUMERIC(12,2) DEFAULT 0,
  fee_percentage        NUMERIC(5,2) DEFAULT 2.90,
  fee_per_transaction   NUMERIC(5,2) DEFAULT 0.30,
  platform_fee          NUMERIC(10,2) DEFAULT 97.00,
  total_fees            NUMERIC(12,2) DEFAULT 0,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_merchant   ON public.zenipay_billing(merchant_id);
CREATE INDEX IF NOT EXISTS idx_billing_status     ON public.zenipay_billing(status);
CREATE INDEX IF NOT EXISTS idx_billing_period     ON public.zenipay_billing(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_invoice    ON public.zenipay_billing(invoice_number);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_zenipay_billing_updated_at ON public.zenipay_billing;
CREATE TRIGGER update_zenipay_billing_updated_at
  BEFORE UPDATE ON public.zenipay_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();