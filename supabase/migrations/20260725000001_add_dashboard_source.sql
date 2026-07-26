-- Add "dashboard" and "dashboard-*" as valid source values for zenipay_access_requests.
-- These are used by the local Dev Dashboard (http://localhost:4567) to push leads
-- generated from scraping/prospecting directly into the zenipay.ca admin panel.

ALTER TABLE public.zenipay_access_requests
  DROP CONSTRAINT IF EXISTS zenipay_access_requests_source_check;

ALTER TABLE public.zenipay_access_requests
  ADD CONSTRAINT zenipay_access_requests_source_check
  CHECK (source IN (
    'landing','pricing','security','contact','access',
    'dashboard',
    'dashboard-zeniva-travel',
    'dashboard-zeniva-agency',
    'dashboard-zenipay',
    'dashboard-zeniva-dev'
  ));
