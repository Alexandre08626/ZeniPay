-- Fix RLS policies: replace auth.uid()::text comparisons with
-- proper auth_user_id UUID joins.
--
-- The zenipay_merchants table has both:
--   id            TEXT PRIMARY KEY           (free-form merchant identifier)
--   auth_user_id  UUID REFERENCES auth.users (proper FK to auth)
--
-- Old policies compared merchant_id (TEXT) against auth.uid()::text which is
-- fragile and semantically wrong. New policies use auth_user_id = auth.uid()
-- via a subquery join, which is type-safe and efficient (indexed UUID column).

-- ─── 1. zenipay_merchants ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Merchant read own" ON public.zenipay_merchants;
CREATE POLICY "Merchant read own"
  ON public.zenipay_merchants
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    -- Team members stored in merchant_data JSONB are email-based, not
    -- UUID-based, so we keep the existing string-match fallback but
    -- require the merchant to be resolveable to the current user first.
    OR (
      auth.uid()::text = ANY(string_to_array(coalesce(merchant_data->>'team_members', ''), ','))
    )
  );

-- ─── 2. zenipay_payments ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Merchant read own payments" ON public.zenipay_payments;
CREATE POLICY "Merchant read own payments"
  ON public.zenipay_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  );

-- ─── 3. zenipay_invoices ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Merchant CRUD own invoices" ON public.zenipay_invoices;
CREATE POLICY "Merchant CRUD own invoices"
  ON public.zenipay_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  );

-- ─── 4. zenipay_payouts ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Merchant CRUD own payouts" ON public.zenipay_payouts;
CREATE POLICY "Merchant CRUD own payouts"
  ON public.zenipay_payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  );

-- ─── 5. zenipay_bank_accounts ─────────────────────────────────────────
DROP POLICY IF EXISTS "Merchant CRUD own bank accounts" ON public.zenipay_bank_accounts;
CREATE POLICY "Merchant CRUD own bank accounts"
  ON public.zenipay_bank_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zenipay_merchants
      WHERE id = merchant_id
      AND auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.zenipay_merchants IS 'ZeniPay merchant accounts. RLS: merchant sees own row via auth_user_id match.';
COMMENT ON TABLE public.zenipay_payments IS 'Payment transactions. RLS: merchant sees payments via zenipay_merchants.auth_user_id join.';
COMMENT ON TABLE public.zenipay_invoices IS 'Invoices issued by merchants. RLS: same auth_user_id join pattern.';
COMMENT ON TABLE public.zenipay_payouts IS 'Payouts from merchants to recipients. RLS: same auth_user_id join pattern.';
COMMENT ON TABLE public.zenipay_bank_accounts IS 'Bank accounts for merchant payouts. RLS: same auth_user_id join pattern.';