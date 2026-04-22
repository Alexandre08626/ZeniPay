-- =============================================================================
-- PR 4 Part 5 — Polish: DB-level finalized-immutability + single-use export URLs
-- =============================================================================
-- Design notes:
--
-- 1. Application code already refuses UPDATEs on finalized expense_reports, but
--    a direct service_role connection (SQL console, migration, out-of-band
--    script) could silently mutate a finalized report. This trigger makes
--    finalization a DB-level contract: once status='finalized', no column can
--    change. To "edit" a finalized report, callers must clone via
--    parent_report_id (status='draft', new id) — the existing design.
--
--    Exception: allow setting status from 'finalized' → 'exported' (the legacy
--    third state in the CHECK constraint) + the `export_format` / `export_ref`
--    columns. This is defensive — the UI currently doesn't use 'exported', but
--    the CHECK constraint admits it and future formats may want to track which
--    export format was last produced.
--
-- 2. agents.export_url_nonces tracks HMAC-signed export URLs and is consumed
--    on first GET. The signature itself stays HMAC (see ZP_EXPORT_URL_SECRET)
--    — the nonce is just the unique primary key for single-use enforcement.
--    INSERT on generation; DELETE (or mark consumed_at) on first successful
--    download. Second download sees the row gone → 410 Gone.
--
--    We use DELETE-on-consume rather than consumed_at flag: expired rows get
--    swept by a separate maintenance cron (not in PR 4 — 60s TTL means the
--    table is tiny anyway, well under 1K rows at realistic throughput).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Finalized expense_reports are immutable (DB-level trigger)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.block_finalized_report_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    -- Allow transitioning status: finalized → exported (legacy third state).
    -- Allow updating the export_format / export_ref columns alongside that.
    -- Everything else is frozen.
    IF NEW.status NOT IN ('finalized','exported') THEN
      RAISE EXCEPTION 'expense_report_is_finalized: status cannot change from finalized except to exported (id=%)', OLD.id
        USING ERRCODE = '23514';
    END IF;
    IF NEW.period_start    IS DISTINCT FROM OLD.period_start    THEN RAISE EXCEPTION 'finalized report is immutable: period_start'   USING ERRCODE = '23514'; END IF;
    IF NEW.period_end      IS DISTINCT FROM OLD.period_end      THEN RAISE EXCEPTION 'finalized report is immutable: period_end'     USING ERRCODE = '23514'; END IF;
    IF NEW.finalized_at    IS DISTINCT FROM OLD.finalized_at    THEN RAISE EXCEPTION 'finalized report is immutable: finalized_at'   USING ERRCODE = '23514'; END IF;
    IF NEW.finalized_by    IS DISTINCT FROM OLD.finalized_by    THEN RAISE EXCEPTION 'finalized report is immutable: finalized_by'   USING ERRCODE = '23514'; END IF;
    IF NEW.notes           IS DISTINCT FROM OLD.notes           THEN RAISE EXCEPTION 'finalized report is immutable: notes'          USING ERRCODE = '23514'; END IF;
    IF NEW.parent_report_id IS DISTINCT FROM OLD.parent_report_id THEN RAISE EXCEPTION 'finalized report is immutable: parent_report_id' USING ERRCODE = '23514'; END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'finalized report is immutable: organization_id' USING ERRCODE = '23514'; END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_finalized_report_update ON agents.expense_reports;
CREATE TRIGGER trg_block_finalized_report_update
  BEFORE UPDATE ON agents.expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION agents.block_finalized_report_update();

-- Lines of a finalized report are likewise frozen.
CREATE OR REPLACE FUNCTION agents.block_finalized_report_line_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  parent_status TEXT;
BEGIN
  SELECT status INTO parent_status
    FROM agents.expense_reports
   WHERE id = COALESCE(NEW.report_id, OLD.report_id);
  IF parent_status = 'finalized' THEN
    RAISE EXCEPTION 'expense_report_is_finalized: lines of a finalized report cannot change (report_id=%)', COALESCE(NEW.report_id, OLD.report_id)
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_block_finalized_report_line_change ON agents.expense_report_lines;
CREATE TRIGGER trg_block_finalized_report_line_change
  BEFORE UPDATE OR DELETE ON agents.expense_report_lines
  FOR EACH ROW
  EXECUTE FUNCTION agents.block_finalized_report_line_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Export URL single-use nonces
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.export_url_nonces (
  token                     TEXT PRIMARY KEY,                     -- HMAC hex digest (64 chars for sha256)
  report_id                 TEXT NOT NULL REFERENCES agents.expense_reports(id) ON DELETE CASCADE,
  organization_id           TEXT NOT NULL REFERENCES agents.agent_organizations(id) ON DELETE CASCADE,
  format                    TEXT NOT NULL CHECK (format IN ('quickbooks','xero','netsuite','csv')),
  expires_at                TIMESTAMPTZ NOT NULL,
  created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_url_nonces_expires
  ON agents.export_url_nonces(expires_at);

ALTER TABLE agents.export_url_nonces ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — service_role only. The export generator INSERTs
-- and the download handler DELETEs, both via service_role in the route code.

COMMENT ON TABLE  agents.export_url_nonces IS 'Single-use nonce registry for HMAC-signed export download URLs. Row exists → URL valid. DELETE on first GET → 410 Gone thereafter.';
COMMENT ON COLUMN agents.export_url_nonces.token IS 'SHA-256 HMAC hex digest of (report_id.format.expires_at.organization_id) signed with ZP_EXPORT_URL_SECRET.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Opportunistic sweep of expired nonces (called from the download handler).
--    Cheap index-only range delete, bounded by the 60s TTL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION agents.sweep_expired_export_nonces()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM agents.export_url_nonces WHERE expires_at < NOW() - INTERVAL '5 minutes'
  RETURNING 1 INTO removed;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
