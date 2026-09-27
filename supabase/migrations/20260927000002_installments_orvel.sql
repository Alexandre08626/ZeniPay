-- 20260927000002_installments_orvel.sql
-- 1. Invoice installments (dépôt 1, dépôt 2, solde…) — each has its own
--    public pay token, due date and status. The invoice becomes "partial"
--    after the first paid installment and "paid" when the balance is zero.
-- 2. Orvel (AI operator) — per-merchant permissions + an append-only action
--    journal with undo data.
--
-- Idempotent: safe to run more than once. Column types for invoice/payment
-- references are TEXT on purpose — production ids are UUID but older rows
-- and the repo schema use TEXT; TEXT accepts both.

-- ── Installments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zenipay_invoice_installments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    TEXT NOT NULL,
  merchant_id   TEXT NOT NULL,
  seq           INTEGER NOT NULL,
  label         TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency      TEXT NOT NULL DEFAULT 'CAD',
  due_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),
  pay_token     TEXT NOT NULL UNIQUE,
  payment_id    TEXT,
  payment_ref   TEXT,
  paid_at       TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_installments_invoice  ON public.zenipay_invoice_installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_installments_merchant ON public.zenipay_invoice_installments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_installments_due      ON public.zenipay_invoice_installments(status, due_date);

ALTER TABLE public.zenipay_invoice_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access installments" ON public.zenipay_invoice_installments;
CREATE POLICY "Service role full access installments"
  ON public.zenipay_invoice_installments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Invoice columns used by installments (additive).
ALTER TABLE public.zenipay_invoices
  ADD COLUMN IF NOT EXISTS amount_paid     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_installments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS due_date        DATE;

-- Allow the "partial" status (older CHECK constraints don't list it).
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.zenipay_invoices'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.zenipay_invoices DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.zenipay_invoices
  ADD CONSTRAINT zenipay_invoices_status_check
  CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'));

-- ── Orvel ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zenipay_orvel_settings (
  merchant_id  TEXT PRIMARY KEY,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   TEXT
);
ALTER TABLE public.zenipay_orvel_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access orvel settings" ON public.zenipay_orvel_settings;
CREATE POLICY "Service role full access orvel settings"
  ON public.zenipay_orvel_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.zenipay_orvel_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  TEXT NOT NULL,
  tool         TEXT NOT NULL,
  args         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL CHECK (status IN ('done', 'failed', 'denied', 'undone')),
  result       JSONB,
  undo         JSONB,
  prompt       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orvel_actions_merchant ON public.zenipay_orvel_actions(merchant_id, created_at DESC);
ALTER TABLE public.zenipay_orvel_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access orvel actions" ON public.zenipay_orvel_actions;
CREATE POLICY "Service role full access orvel actions"
  ON public.zenipay_orvel_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
