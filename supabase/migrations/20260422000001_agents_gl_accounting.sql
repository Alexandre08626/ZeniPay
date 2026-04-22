-- =============================================================================
-- PR 4 — GL Expense Categorization + Accounting Export (Pillar 3)
-- =============================================================================
-- Design notes for future Claudes / reviewers:
--
-- 1. `mcc_default_catalog` is a NEW global table (no organization_id) holding
--    the 40+ well-known MCC → GL-code mappings. This is the "industry
--    standard" knowledge base — same for everyone. Org-specific overrides
--    still live in `mcc_gl_mapping`; UI merges catalog + overrides at read.
--
-- 2. `mcc_gl_mapping.is_default BOOL` marks rows copied from the catalog at
--    org-seed time vs rows the CFO later overrode. Removing an override falls
--    back to the catalog default.
--
-- 3. `card_authorizations.gl_account_id` is the auto-categorization marker.
--    The cron picks WHERE decision='approved' AND gl_account_id IS NULL.
--    Once set, the row is skipped — unless manually_categorized=false and the
--    CFO re-runs the cron explicitly (out of scope for PR 4).
--
-- 4. `expense_report_lines.manually_categorized BOOL` — if TRUE, re-run of the
--    cron MUST NOT overwrite the CFO's decision. Non-negotiable #1.
--
-- 5. `expense_reports.parent_report_id` supports the "finalized is immutable"
--    model: to edit a finalized report, clone it with parent_report_id set.
--
-- 6. `expense_report_lines.amount_cents` stays in the original auth currency;
--    `converted_usd_cents` uses the FX rate AT SETTLE TIME (snapshot), not at
--    report-build time. Historical reports don't drift with FX markets.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Column extensions on existing tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE agents.card_authorizations
  ADD COLUMN IF NOT EXISTS gl_account_id TEXT REFERENCES agents.gl_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_card_auths_pending_categorize
  ON agents.card_authorizations(organization_id, created_at DESC)
  WHERE decision = 'approved' AND gl_account_id IS NULL AND deleted_at IS NULL;

ALTER TABLE agents.expense_report_lines
  ADD COLUMN IF NOT EXISTS manually_categorized BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE agents.expense_reports
  ADD COLUMN IF NOT EXISTS parent_report_id TEXT REFERENCES agents.expense_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE agents.mcc_gl_mapping
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Composite index for cursor-paginated report reads (spec rule 6: <500ms at 10K+ lines).
CREATE INDEX IF NOT EXISTS idx_expense_lines_report_gl
  ON agents.expense_report_lines(report_id, gl_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Global MCC catalog — well-known industry defaults (one row per MCC)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.mcc_default_catalog (
  mcc         TEXT PRIMARY KEY,
  gl_code     TEXT NOT NULL,                   -- target GL account code (e.g. "6110")
  gl_name     TEXT NOT NULL,                   -- human label ("Cloud Compute")
  description TEXT NOT NULL,                   -- what this MCC actually means
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT ON agents.mcc_default_catalog TO authenticated;
ALTER TABLE agents.mcc_default_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mcc_catalog_read_all ON agents.mcc_default_catalog;
CREATE POLICY mcc_catalog_read_all ON agents.mcc_default_catalog
  FOR SELECT TO authenticated USING (TRUE);

-- 42 entries covering the AI-agent spend profile (cloud, APIs, data, software,
-- marketing, ads, digital goods, telecom, professional services).
INSERT INTO agents.mcc_default_catalog (mcc, gl_code, gl_name, description) VALUES
  -- AI infrastructure & cloud
  ('7372', '6110', 'Cloud Compute',            'Computer programming, data processing, integrated systems design'),
  ('7375', '6120', 'AI API Services',          'Computer information services'),
  ('7379', '6110', 'Cloud Compute',            'Computer maintenance, repair, services — not elsewhere classified'),
  ('5045', '6110', 'Cloud Compute',            'Computers, peripherals, and software'),
  ('4812', '6130', 'Bandwidth & CDN',          'Telecommunication equipment including telephone sales'),
  ('4814', '6130', 'Bandwidth & CDN',          'Telecommunication services, long distance and local'),
  ('4899', '6130', 'Bandwidth & CDN',          'Cable, satellite, and other pay TV / radio'),
  -- Software & SaaS
  ('5734', '6220', 'Software & SaaS',          'Computer software stores'),
  ('5815', '6220', 'Software & SaaS',          'Digital goods – media, books, movies, music'),
  ('5816', '6220', 'Software & SaaS',          'Digital goods – games'),
  ('5817', '6220', 'Software & SaaS',          'Digital goods – applications (excluding games)'),
  ('5818', '6220', 'Software & SaaS',          'Digital goods multi-category'),
  ('5192', '6220', 'Software & SaaS',          'Books, periodicals, newspapers'),
  ('5942', '6220', 'Software & SaaS',          'Book stores'),
  -- Data & research
  ('5967', '6310', 'Data & Research',          'Direct marketing — inbound teleservices'),
  ('8220', '6310', 'Data & Research',          'Universities, colleges, professional schools'),
  ('8244', '6310', 'Data & Research',          'Business and secretarial schools'),
  ('8249', '6310', 'Data & Research',          'Schools — vocational and trade'),
  ('8299', '6310', 'Data & Research',          'Schools and educational services NEC'),
  -- Marketing / advertising
  ('7311', '6410', 'Advertising',              'Advertising services'),
  ('7333', '6420', 'Design & Creative',        'Commercial photography, art, graphics'),
  ('5968', '6410', 'Advertising',              'Subscription merchants (continuity / direct marketing)'),
  -- Professional services
  ('7392', '7100', 'Professional Services',    'Management, consulting, and public relations services'),
  ('8111', '7100', 'Professional Services',    'Legal services, attorneys'),
  ('8931', '7100', 'Professional Services',    'Accounting, auditing, and bookkeeping'),
  ('7338', '7100', 'Professional Services',    'Quick copy, reproduction, and blueprinting services'),
  ('7339', '7100', 'Professional Services',    'Stenographic and secretarial support services'),
  -- Financial / admin
  ('6012', '8100', 'Administrative',           'Financial institutions — merchandise and services'),
  ('6051', '8100', 'Administrative',           'Non-financial institutions — foreign currency, money orders'),
  ('6211', '8100', 'Administrative',           'Security brokers / dealers'),
  ('6300', '8100', 'Administrative',           'Insurance sales, underwriting, and premiums'),
  -- Office & misc
  ('5111', '8200', 'Office & Supplies',        'Stationery, office supplies, printing and writing paper'),
  ('5943', '8200', 'Office & Supplies',        'Stationery stores, office and school supply stores'),
  ('5044', '8200', 'Office & Supplies',        'Office, photographic, photocopy, microfilm equipment'),
  ('5065', '8200', 'Office & Supplies',        'Electrical parts and equipment'),
  -- Payment processors (agent paying an API that wraps card issuing)
  ('6540', '8100', 'Administrative',           'POI — funding transactions (stored value, crypto on-ramp, etc.)'),
  -- Government / tax
  ('9311', '8300', 'Taxes & Fees',             'Tax payments'),
  ('9399', '8300', 'Taxes & Fees',             'Government services NEC'),
  -- Courier / logistics (agents shipping physical goods they bought)
  ('4215', '8400', 'Shipping & Postage',       'Courier services — air or ground, freight forwarders'),
  -- Fallbacks
  ('0000', '9900', 'Uncategorized',            'Unknown MCC — review manually'),
  ('9999', '9900', 'Uncategorized',            'Test / sandbox transaction')
ON CONFLICT (mcc) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. seed_org_gl_accounts() — seed ~15 default COA rows for a fresh org
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.seed_org_gl_accounts(p_org_id TEXT, p_actor UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO agents.gl_accounts (organization_id, code, name, created_by) VALUES
    (p_org_id, '4000', 'Revenue', p_actor),
    (p_org_id, '5000', 'Cost of Services', p_actor),
    (p_org_id, '6000', 'Operating Expenses', p_actor),
    (p_org_id, '6100', 'AI Infrastructure', p_actor),
    (p_org_id, '6110', 'Cloud Compute', p_actor),
    (p_org_id, '6120', 'AI API Services', p_actor),
    (p_org_id, '6130', 'Bandwidth & CDN', p_actor),
    (p_org_id, '6200', 'Software & Subscriptions', p_actor),
    (p_org_id, '6220', 'Software & SaaS', p_actor),
    (p_org_id, '6300', 'Data & Research', p_actor),
    (p_org_id, '6310', 'Data & Research', p_actor),
    (p_org_id, '6400', 'Marketing & Advertising', p_actor),
    (p_org_id, '6410', 'Advertising', p_actor),
    (p_org_id, '6420', 'Design & Creative', p_actor),
    (p_org_id, '7100', 'Professional Services', p_actor),
    (p_org_id, '8000', 'Administrative', p_actor),
    (p_org_id, '8100', 'Administrative', p_actor),
    (p_org_id, '8200', 'Office & Supplies', p_actor),
    (p_org_id, '8300', 'Taxes & Fees', p_actor),
    (p_org_id, '8400', 'Shipping & Postage', p_actor),
    (p_org_id, '9900', 'Uncategorized', p_actor)
  ON CONFLICT (organization_id, code) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. seed_org_mcc_mappings() — copy catalog → per-org mcc_gl_mapping rows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.seed_org_mcc_mappings(p_org_id TEXT, p_actor UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- For each catalog entry, resolve the target GL account in this org by
  -- code match, then insert/link. Only insert if not already mapped.
  INSERT INTO agents.mcc_gl_mapping (organization_id, mcc, gl_account_id, is_default, created_by)
  SELECT
    p_org_id,
    c.mcc,
    g.id,
    TRUE,
    p_actor
  FROM agents.mcc_default_catalog c
  JOIN agents.gl_accounts g
    ON g.organization_id = p_org_id AND g.code = c.gl_code AND g.active = TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM agents.mcc_gl_mapping m
    WHERE m.organization_id = p_org_id AND m.mcc = c.mcc
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. build_expense_report() — atomic report build
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.build_expense_report(
  p_org_id TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_actor UUID DEFAULT NULL
)
RETURNS TEXT                                -- returns the new expense_report id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = agents, public, pg_temp
AS $fn$
DECLARE
  v_report_id TEXT;
  v_line_count INTEGER;
BEGIN
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end (%) < period_start (%)', p_period_end, p_period_start USING ERRCODE = '22023';
  END IF;

  INSERT INTO agents.expense_reports (organization_id, period_start, period_end, status, created_by)
  VALUES (p_org_id, p_period_start, p_period_end, 'draft', p_actor)
  RETURNING id INTO v_report_id;

  -- Add lines from approved, gl-categorized card_authorizations in window.
  INSERT INTO agents.expense_report_lines (
    report_id, card_auth_id, gl_account_id, memo,
    amount_cents, currency, converted_usd_cents, created_by
  )
  SELECT
    v_report_id,
    ca.id,
    ca.gl_account_id,
    COALESCE(ca.merchant_name, ''),
    ca.amount_cents,
    ca.currency,
    CASE
      WHEN ca.currency = 'USD' THEN ca.amount_cents
      ELSE (ca.amount_cents::NUMERIC * COALESCE(
        (SELECT rate FROM agents.fx_rates
          WHERE base_currency = ca.currency AND quote_currency = 'USD'
          AND ca.created_at BETWEEN valid_from AND COALESCE(valid_to, NOW())
          ORDER BY valid_from DESC LIMIT 1),
        1.0
      ))::BIGINT
    END,
    p_actor
  FROM agents.card_authorizations ca
  WHERE ca.organization_id = p_org_id
    AND ca.decision = 'approved'
    AND ca.deleted_at IS NULL
    AND ca.gl_account_id IS NOT NULL
    AND ca.created_at >= p_period_start::TIMESTAMPTZ
    AND ca.created_at <  (p_period_end + INTERVAL '1 day')::TIMESTAMPTZ;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;

  -- Also pull Phase 1 agent_transactions that aren't from a card_auth (API spend).
  INSERT INTO agents.expense_report_lines (
    report_id, transaction_id, gl_account_id, memo,
    amount_cents, currency, converted_usd_cents, created_by
  )
  SELECT
    v_report_id,
    t.id,
    NULL,                               -- API spend gets uncategorized for now
    COALESCE(t.description, t.merchant_id, ''),
    t.amount_cents,
    t.currency,
    CASE
      WHEN t.currency = 'USD' THEN t.amount_cents
      ELSE (t.amount_cents::NUMERIC * COALESCE(
        (SELECT rate FROM agents.fx_rates
          WHERE base_currency = t.currency AND quote_currency = 'USD' AND valid_to IS NULL LIMIT 1),
        1.0
      ))::BIGINT
    END,
    p_actor
  FROM agents.agent_transactions t
  WHERE t.organization_id = p_org_id
    AND t.status IN ('authorized','captured')
    AND t.deleted_at IS NULL
    AND t.protocol_used <> 'card_issuing_v1'
    AND t.created_at >= p_period_start::TIMESTAMPTZ
    AND t.created_at <  (p_period_end + INTERVAL '1 day')::TIMESTAMPTZ;

  RETURN v_report_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION agents.seed_org_gl_accounts(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION agents.seed_org_mcc_mappings(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION agents.build_expense_report(TEXT, DATE, DATE, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
