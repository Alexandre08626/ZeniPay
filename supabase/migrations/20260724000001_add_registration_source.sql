-- Add 'registration' to the zenipay_access_requests.source CHECK constraint
-- so that merchant self-registration (POST /api/merchants/register) can
-- log a lead with source='registration'.

ALTER TABLE public.zenipay_access_requests
  DROP CONSTRAINT IF EXISTS zenipay_access_requests_source_check;

ALTER TABLE public.zenipay_access_requests
  ADD CONSTRAINT zenipay_access_requests_source_check
  CHECK (source IN ('landing','pricing','security','contact','access','registration'));

COMMENT ON TABLE public.zenipay_access_requests IS 'Contact + access request leads. source supports: landing, pricing, security, contact, access, registration.';