-- Invoices issued BY merchants (to their customers)

CREATE TABLE IF NOT EXISTS public.zenipay_invoices (
  id                TEXT PRIMARY KEY,
  merchant_id       TEXT NOT NULL REFERENCES public.zenipay_merchants(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL,
  customer_email    TEXT NOT NULL,
  customer_name     TEXT,
  customer_phone    TEXT,
  line_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal          NUMERIC(12,2) DEFAULT 0,
  tax               NUMERIC(12,2) DEFAULT 0,
  total             NUMERIC(12,2) DEFAULT 0,
  currency          TEXT DEFAULT 'CAD',
  status            TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  payment_link      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON public.zenipay_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON public.zenipay_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due      ON public.zenipay_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.zenipay_invoices(customer_email);

-- RLS
ALTER TABLE public.zenipay_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant CRUD own invoices"
  ON public.zenipay_invoices
  FOR ALL
  TO authenticated
  USING (merchant_id = auth.uid()::text)
  WITH CHECK (merchant_id = auth.uid()::text);

CREATE POLICY "Service role full access invoices"
  ON public.zenipay_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin read all invoices"
  ON public.zenipay_invoices
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
DROP TRIGGER IF EXISTS update_zenipay_invoices_updated_at ON public.zenipay_invoices;
CREATE TRIGGER update_zenipay_invoices_updated_at
  BEFORE UPDATE ON public.zenipay_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();