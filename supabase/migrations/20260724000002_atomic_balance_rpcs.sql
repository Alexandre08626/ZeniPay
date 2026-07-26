-- Atomic balance increment RPC functions
-- Eliminates read-then-write race conditions on balance columns.
-- Use these instead of: .update({ balance: Number(old) + delta })

-- 1) Atomic merchant stats update (balance + volume + tx_count in one shot)
CREATE OR REPLACE FUNCTION public.zenipay_merchant_add_stats(
  p_merchant_id TEXT,
  p_balance_delta NUMERIC,
  p_volume_delta NUMERIC DEFAULT 0,
  p_tx_count_delta INTEGER DEFAULT 0
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.zenipay_merchants
  SET balance = COALESCE(balance, 0) + p_balance_delta,
      volume  = COALESCE(volume, 0)  + p_volume_delta,
      tx_count = COALESCE(tx_count, 0) + p_tx_count_delta,
      updated_at = NOW()
  WHERE id = p_merchant_id
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Atomic account balance update (zenipay_accounts)
CREATE OR REPLACE FUNCTION public.zenipay_account_add_balance(
  p_account_id UUID,
  p_amount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.zenipay_accounts
  SET balance = COALESCE(balance, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_account_id
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Atomic personal account balance update
CREATE OR REPLACE FUNCTION public.zenipay_personal_account_add_balance(
  p_account_id UUID,
  p_amount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.zenipay_personal_accounts
  SET balance = COALESCE(balance, 0) + p_amount
  WHERE id = p_account_id
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;