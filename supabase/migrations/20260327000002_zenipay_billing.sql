-- ZeniPay billing: invoices FROM ZeniPay TO merchants for processing fees

CREATE TABLE IF NOT EXISTS zenipay_billing (
  id                    TEXT PRIMARY KEY,
  merchant_id           TEXT,
  merchant_name         TEXT,
  invoice_number        TEXT,
  period_start          DATE,
  period_end            DATE,
  transactions_count    INTEGER DEFAULT 0,
  transactions_volume   NUMERIC(12,2) DEFAULT 0,
  fee_percentage        NUMERIC(5,2) DEFAULT 2.9,
  fee_per_transaction   NUMERIC(5,2) DEFAULT 0.30,
  platform_fee          NUMERIC(10,2) DEFAULT 97,
  total_fees            NUMERIC(12,2) DEFAULT 0,
  status                TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_merchant ON zenipay_billing(merchant_id);
CREATE INDEX IF NOT EXISTS idx_billing_status   ON zenipay_billing(status);
