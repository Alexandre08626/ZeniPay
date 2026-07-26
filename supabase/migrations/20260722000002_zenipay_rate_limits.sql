-- ZeniPay Rate Limits table
-- Supabase-backed rate limiting that scales across serverless instances.
-- Auto-cleanup by TTL / periodic sweep via expires_at.
-- 
-- Usage: INSERT a row per request bucket, COUNT rows in the same bucket.
-- If count > max => rate limited.

CREATE TABLE IF NOT EXISTS public.zenipay_rate_limits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket_key  TEXT NOT NULL,       -- "login:<ip>:<time-window>" format
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 minute')
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.zenipay_rate_limits(bucket_key, created_at DESC);

-- Auto-cleanup: expired rows are safe to ignore and will be vacuumed
COMMENT ON TABLE public.zenipay_rate_limits IS 
  'Rate limiting bucket entries. Rows expire via expires_at and are cleaned up by Postgres autovacuum.';

-- RLS: service_role only (server-side inserts)
ALTER TABLE public.zenipay_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.zenipay_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant access to the API role
GRANT ALL ON public.zenipay_rate_limits TO service_role;
GRANT USAGE ON SEQUENCE public.zenipay_rate_limits_id_seq TO service_role;