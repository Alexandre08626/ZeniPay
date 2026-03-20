-- Merchant data store (paylinks, invoices, payouts, bankCfg per merchant)
ALTER TABLE zenipay_merchants
  ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb;
