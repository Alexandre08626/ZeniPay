-- ZeniPay Production Schema Migration
-- Run once in Supabase SQL editor
-- Version: 001 — Initial production tables

-- ─── Idempotency keys ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_idempotency_keys (
  key          TEXT PRIMARY KEY,
  operation    TEXT NOT NULL,
  result       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON zenipay_idempotency_keys(expires_at);

-- ─── Payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_payments (
  id                              TEXT PRIMARY KEY,
  idempotency_key                 TEXT UNIQUE,
  booking_id                      TEXT,
  customer_name                   TEXT NOT NULL DEFAULT '',
  customer_email                  TEXT NOT NULL DEFAULT '',
  customer_phone                  TEXT,
  amount                          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                        TEXT NOT NULL DEFAULT 'USD',
  status                          TEXT NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','succeeded','failed','refunded','canceled')),
  gateway                         TEXT NOT NULL DEFAULT 'finix',
  gateway_payment_instrument_id   TEXT,
  gateway_transfer_id             TEXT,
  gateway_response                JSONB,
  description                     TEXT,
  metadata                        JSONB,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON zenipay_payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_email     ON zenipay_payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_created   ON zenipay_payments(created_at DESC);

-- ─── Ledger (append-only, NEVER UPDATE rows) ──────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_ledger (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_id   TEXT REFERENCES zenipay_payments(id) ON DELETE RESTRICT,
  payout_id    TEXT,
  event_type   TEXT NOT NULL
                 CHECK (event_type IN (
                   'customer_payment','platform_fee','agent_commission',
                   'influencer_commission','supplier_allocation','payout_execution',
                   'refund','processor_fee','manual_adjustment'
                 )),
  wallet_type  TEXT NOT NULL
                 CHECK (wallet_type IN ('platform','agent','influencer','supplier')),
  direction    TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  reference    TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_payment    ON zenipay_ledger(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet     ON zenipay_ledger(wallet_type);
CREATE INDEX IF NOT EXISTS idx_ledger_created    ON zenipay_ledger(created_at DESC);
-- Prevent updates/deletes on ledger
CREATE OR REPLACE RULE ledger_no_update AS ON UPDATE TO zenipay_ledger DO INSTEAD NOTHING;
CREATE OR REPLACE RULE ledger_no_delete AS ON DELETE TO zenipay_ledger DO INSTEAD NOTHING;

-- ─── Wallet balance view (derived from ledger) ────────────────────────────
CREATE OR REPLACE VIEW zenipay_wallet_balances AS
SELECT
  wallet_type,
  COALESCE(SUM(CASE WHEN direction = 'credit' AND event_type != 'payout_execution' THEN amount ELSE 0 END)
         - SUM(CASE WHEN direction = 'debit'  AND event_type != 'payout_execution' THEN amount ELSE 0 END), 0) AS available,
  COALESCE(SUM(CASE WHEN event_type = 'payout_execution' AND direction = 'debit' THEN amount ELSE 0 END), 0) AS paid_out,
  'USD' AS currency,
  MAX(created_at) AS last_updated
FROM zenipay_ledger
GROUP BY wallet_type;

-- ─── Payouts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_payouts (
  id               TEXT PRIMARY KEY,
  idempotency_key  TEXT UNIQUE,
  recipient_type   TEXT NOT NULL CHECK (recipient_type IN ('agent','influencer','supplier','other')),
  recipient_id     TEXT,
  recipient_name   TEXT NOT NULL DEFAULT '',
  from_wallet      TEXT NOT NULL DEFAULT 'platform',
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'USD',
  method           TEXT NOT NULL DEFAULT 'ach' CHECK (method IN ('ach','wire','instant','check')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','paid','failed','canceled')),
  reference        TEXT,
  note             TEXT,
  scheduled_for    TIMESTAMPTZ,
  executed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT
);

-- ─── Commissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_commissions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_id     TEXT REFERENCES zenipay_payments(id) ON DELETE RESTRICT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('agent','influencer','platform')),
  recipient_id   TEXT,
  recipient_name TEXT NOT NULL DEFAULT '',
  rate           NUMERIC(5,4) NOT NULL DEFAULT 0,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commissions_payment ON zenipay_commissions(payment_id);

-- ─── Invoices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_invoices (
  id               TEXT PRIMARY KEY,
  payment_id       TEXT REFERENCES zenipay_payments(id),
  booking_id       TEXT,
  customer_name    TEXT NOT NULL DEFAULT '',
  customer_email   TEXT NOT NULL DEFAULT '',
  customer_address TEXT,
  items            JSONB NOT NULL DEFAULT '[]',
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'USD',
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','paid','overdue','void')),
  due_date         DATE,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Pay links ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_pay_links (
  id             TEXT PRIMARY KEY,
  payment_id     TEXT REFERENCES zenipay_payments(id),
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  description    TEXT NOT NULL DEFAULT '',
  customer_name  TEXT,
  customer_email TEXT,
  type           TEXT NOT NULL DEFAULT 'custom'
                   CHECK (type IN ('trip','deposit','balance','custom')),
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','paid','expired','cancelled')),
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Accounting entries (double-entry) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_accounting_entries (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  payment_id      TEXT REFERENCES zenipay_payments(id),
  payout_id       TEXT REFERENCES zenipay_payouts(id),
  ledger_entry_id TEXT REFERENCES zenipay_ledger(id),
  account_code    TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  entry_type      TEXT NOT NULL CHECK (entry_type IN ('debit','credit')),
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  description     TEXT,
  period          TEXT NOT NULL,  -- 'YYYY-MM'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounting_period ON zenipay_accounting_entries(period);

-- ─── Chart of accounts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_chart_of_accounts (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('Asset','Liability','Equity','Income','Expense')),
  parent_code TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed chart of accounts
INSERT INTO zenipay_chart_of_accounts (code, name, type) VALUES
  ('1000', 'ZeniPay Platform Wallet',   'Asset'),
  ('1100', 'Agent Wallets',             'Asset'),
  ('1200', 'Accounts Receivable',       'Asset'),
  ('1300', 'Cash & Equivalents',        'Asset'),
  ('2000', 'Pending Payouts Payable',   'Liability'),
  ('2100', 'Agent Commissions Payable', 'Liability'),
  ('2500', 'Tax Payable',               'Liability'),
  ('3000', 'Retained Earnings',         'Equity'),
  ('4000', 'Travel Revenue',            'Income'),
  ('4100', 'ZeniStay Revenue',          'Income'),
  ('4200', 'ZeniYacht Revenue',         'Income'),
  ('5000', 'Supplier Payments',         'Expense'),
  ('5100', 'Agent Commissions Expense', 'Expense'),
  ('5200', 'Influencer Payouts',        'Expense'),
  ('5300', 'Processor Fees',            'Expense')
ON CONFLICT (code) DO NOTHING;

-- ─── Webhook events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_webhook_events (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  gateway      TEXT NOT NULL DEFAULT 'finix',
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  processed    BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_dedup ON zenipay_webhook_events(gateway, (payload->>'id')) WHERE payload->>'id' IS NOT NULL;

-- ─── Audit logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zenipay_audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  user_id     TEXT,
  changes     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON zenipay_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON zenipay_audit_logs(created_at DESC);
