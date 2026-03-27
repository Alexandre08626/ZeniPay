ALTER TABLE zenipay_merchants
  ADD COLUMN IF NOT EXISTS finix_identity_id TEXT,
  ADD COLUMN IF NOT EXISTS finix_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_state TEXT DEFAULT 'pending';
