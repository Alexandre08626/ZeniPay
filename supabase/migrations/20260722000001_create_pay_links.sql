CREATE TABLE IF NOT EXISTS public.zenipay_pay_links (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'CAD',
  description    TEXT NOT NULL DEFAULT '',
  merchant_id    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' 
                   CHECK (status IN ('active','paid','expired','cancelled')),
  uses           INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_links_merchant ON public.zenipay_pay_links(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pay_links_status ON public.zenipay_pay_links(status);
CREATE INDEX IF NOT EXISTS idx_pay_links_created ON public.zenipay_pay_links(created_at DESC);

ALTER TABLE public.zenipay_merchants 
  ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sandbox_key TEXT,
  ADD COLUMN IF NOT EXISTS live_key TEXT;

-- RLS: all access goes through API routes using service_role client.
-- The public /pay/[id] page and merchant dashboard both use the API.
-- No client-side Supabase queries access this table directly.
ALTER TABLE public.zenipay_pay_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.zenipay_pay_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON public.zenipay_pay_links TO service_role;
