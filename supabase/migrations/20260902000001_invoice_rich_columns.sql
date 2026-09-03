-- 20260902000001_invoice_rich_columns.sql
-- Add the rich invoice fields (invoice_number, tax breakdown, line items,
-- payment linkage, merchant branding) to zenipay_invoices so automated
-- invoices generated on money-in can record tax + line items.
--
-- The production table currently only has the legacy columns
-- (client_name/client_email/amount/currency/status/description/due_date/
-- paid_at). The application writes the rich shape first and falls back to
-- the legacy columns, so these are purely additive and safe.

ALTER TABLE public.zenipay_invoices
  ADD COLUMN IF NOT EXISTS invoice_number  TEXT,
  ADD COLUMN IF NOT EXISTS customer_name   TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone  TEXT,
  ADD COLUMN IF NOT EXISTS items           JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax             NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total           NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_id      TEXT,
  ADD COLUMN IF NOT EXISTS payment_link    TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name   TEXT,
  ADD COLUMN IF NOT EXISTS merchant_email  TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_number  ON public.zenipay_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON public.zenipay_invoices(payment_id);