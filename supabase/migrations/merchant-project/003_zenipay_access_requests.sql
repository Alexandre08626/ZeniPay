-- Public contact / access-request capture for ZeniPay landing pages
-- Writes go through service_role key via /api/contact route
-- Authenticated admins can SELECT

CREATE TABLE IF NOT EXISTS public.zenipay_access_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL,
  company           TEXT,
  role              TEXT,
  agent_fleet_size  TEXT,
  message           TEXT,
  source            TEXT NOT NULL DEFAULT 'landing'
                    CHECK (source IN ('landing','pricing','security','contact','access')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.zenipay_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_created ON public.zenipay_access_requests(created_at DESC);

-- RLS: Only service_role (API routes) can INSERT; admins can SELECT
ALTER TABLE public.zenipay_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert access requests"
  ON public.zenipay_access_requests
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view access requests"
  ON public.zenipay_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );