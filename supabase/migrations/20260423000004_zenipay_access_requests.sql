-- Public contact + access-request capture for the Agents landing pages.
-- Writes go through the service_role key via the /api/contact route.
-- Authenticated admins (future ZeniPay admin dashboard) can SELECT.

CREATE TABLE IF NOT EXISTS public.zenipay_access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  company       TEXT,
  role          TEXT,
  agent_fleet_size TEXT,
  message       TEXT,
  source        TEXT NOT NULL DEFAULT 'landing'
                    CHECK (source IN ('landing','pricing','security','contact','access')),
  user_agent    TEXT,
  ip_hint       TEXT,
  status        TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','contacted','qualified','closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zp_access_reqs_status ON public.zenipay_access_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zp_access_reqs_email  ON public.zenipay_access_requests(email);

ALTER TABLE public.zenipay_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zp_access_reqs_select_auth ON public.zenipay_access_requests;
CREATE POLICY zp_access_reqs_select_auth ON public.zenipay_access_requests
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.zenipay_access_requests IS 'Contact + access request leads from the public Agents landing pages. Populated via /api/contact.';
