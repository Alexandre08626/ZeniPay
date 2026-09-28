-- Abonnements mensuels (forfaits Orvel AI). À exécuter dans l'éditeur SQL de Supabase.
-- Tant que cette table n'existe pas, le code range les abonnements dans zenipay_merchants.config (clé zp_subscriptions).
CREATE TABLE IF NOT EXISTS zenipay_subscriptions (
  id                   TEXT PRIMARY KEY,
  product              TEXT NOT NULL,
  plan                 TEXT NOT NULL,
  external_ref         TEXT NOT NULL,
  customer_email       TEXT NOT NULL,
  customer_name        TEXT NOT NULL DEFAULT '',
  merchant_id          TEXT NOT NULL,
  amount               NUMERIC(12,2) NOT NULL,
  tps                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tvq                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                NUMERIC(12,2) NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'CAD',
  status               TEXT NOT NULL DEFAULT 'incomplete',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  instrument_id        TEXT,
  card_brand           TEXT,
  card_last4           TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  next_charge_at       TIMESTAMPTZ,
  failed_attempts      INTEGER NOT NULL DEFAULT 0,
  periods              INTEGER NOT NULL DEFAULT 0,
  activation_attempts  INTEGER NOT NULL DEFAULT 0,
  return_url           TEXT NOT NULL DEFAULT '',
  webhook_pending      BOOLEAN NOT NULL DEFAULT FALSE,
  last_payment_id      TEXT,
  last_error           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zenipay_subscriptions_status_idx ON zenipay_subscriptions (status, next_charge_at);
CREATE INDEX IF NOT EXISTS zenipay_subscriptions_ref_idx ON zenipay_subscriptions (product, external_ref);
ALTER TABLE zenipay_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON zenipay_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
