-- Add merchant branding columns to zenipay_invoices
-- Invoices are issued BY the merchant, not by ZeniPay

ALTER TABLE zenipay_invoices
  ADD COLUMN IF NOT EXISTS merchant_id    TEXT,
  ADD COLUMN IF NOT EXISTS merchant_name  TEXT,
  ADD COLUMN IF NOT EXISTS merchant_logo  TEXT,
  ADD COLUMN IF NOT EXISTS merchant_email TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON zenipay_invoices(merchant_id);
