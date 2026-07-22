-- Updated at trigger function (reusable)

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ZeniPay Merchants RLS Policies
ALTER TABLE public.zenipay_merchants ENABLE ROW LEVEL SECURITY;

-- Merchants can only read their own row (via auth.uid() linked to merchant id)
CREATE POLICY "Merchant read own"
  ON public.zenipay_merchants
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()::text
    OR auth.uid()::text = ANY(string_to_array(coalesce(merchant_data->>'team_members', ''), ','))
  );

-- Service role (API routes) can do everything
CREATE POLICY "Service role full access"
  ON public.zenipay_merchants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users can read all merchants
CREATE POLICY "Admin read all merchants"
  ON public.zenipay_merchants
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
DROP TRIGGER IF EXISTS update_zenipay_merchants_updated_at ON public.zenipay_merchants;
CREATE TRIGGER update_zenipay_merchants_updated_at
  BEFORE UPDATE ON public.zenipay_merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();