-- Add settlement tracking columns to zenipay_payouts
-- Stores the Finix settlement ID and status for payout tracking

ALTER TABLE public.zenipay_payouts
  ADD COLUMN IF NOT EXISTS finix_settlement_id     TEXT,
  ADD COLUMN IF NOT EXISTS finix_settlement_status TEXT;

COMMENT ON COLUMN public.zenipay_payouts.finix_settlement_id     IS 'Finix settlement ID when payout is submitted for settlement';
COMMENT ON COLUMN public.zenipay_payouts.finix_settlement_status IS 'Latest known status from Finix settlement (PENDING, PROCESSING, SUCCEEDED, FAILED)';
