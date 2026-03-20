-- ZeniPay Merchants Table
-- Stores all merchant signups (replaces localStorage)

CREATE TABLE IF NOT EXISTS zenipay_merchants (
  id               TEXT PRIMARY KEY,
  business_name    TEXT NOT NULL,
  owner_name       TEXT,
  email            TEXT NOT NULL,
  phone            TEXT,
  website          TEXT,
  business_type    TEXT,
  country          TEXT,
  monthly_volume   TEXT,
  status           TEXT DEFAULT 'sandbox',
  plan             TEXT DEFAULT 'Standard',
  sandbox_key      TEXT,
  sandbox_secret   TEXT,
  live_key         TEXT,
  volume           NUMERIC DEFAULT 0,
  tx_count         INTEGER DEFAULT 0,
  balance          NUMERIC DEFAULT 0,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchants_email  ON zenipay_merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON zenipay_merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_created ON zenipay_merchants(created_at DESC);
