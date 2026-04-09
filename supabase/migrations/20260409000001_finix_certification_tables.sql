-- Finix Certification Tables
CREATE TABLE IF NOT EXISTS finix_payment_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transfer_id text, state text, amount_cents int,
  currency text DEFAULT 1657USD1657,
  fraud_session_id text, idempotency_key text, instrument_id text,
  failure_code text, failure_message text,
  tags jsonb DEFAULT 1657{}$$, raw_response jsonb DEFAULT 1657{}$$,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finix_dispute_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text, dispute_id text, transfer_id text,
  state text, reason text, amount_cents int,
  respond_by timestamptz,
  raw_payload jsonb DEFAULT 1657{}$$,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finix_webhook_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text, entity_id text,
  raw_payload jsonb DEFAULT 1657{}$$,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finix_certification_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  step text, data jsonb DEFAULT 1657{}$$,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fpl_transfer ON finix_payment_logs(transfer_id);
CREATE INDEX IF NOT EXISTS idx_fpl_state ON finix_payment_logs(state);
CREATE INDEX IF NOT EXISTS idx_fdl_dispute ON finix_dispute_logs(dispute_id);
CREATE INDEX IF NOT EXISTS idx_fwe_type ON finix_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fcl_step ON finix_certification_logs(step);