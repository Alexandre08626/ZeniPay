-- anomaly_signals.baseline was declared NUMERIC when the table was created
-- in PR 1 (pre-fraud-logic scaffolding). PR 5's baseline-builder emits
-- a richer object:
--   { mean, stddev, sample_count, last_sample_at, computed_at }
-- Alter the column type. The table is empty (PR 5 is the first writer) so
-- no data migration is needed.
ALTER TABLE agents.anomaly_signals
  ALTER COLUMN baseline TYPE JSONB USING NULL::jsonb;

COMMENT ON COLUMN agents.anomaly_signals.baseline IS 'BaselineStats: { mean, stddev, sample_count, last_sample_at, computed_at }';
