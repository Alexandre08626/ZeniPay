-- PR 16 — Merchant virtual cards (online only).
--
-- Separate table from agents' issued_cards (those are for AI agents
-- in the agents.* schema). This one is for humans on /app/* — a
-- virtual card backed by the merchant's ZeniPay wallet.

CREATE TABLE IF NOT EXISTS public.zenipay_merchant_cards (
  id              TEXT PRIMARY KEY DEFAULT 'mcard_' || gen_random_uuid()::TEXT,
  merchant_id     TEXT NOT NULL REFERENCES public.zenipay_merchants(id),
  account_id      TEXT REFERENCES public.zenipay_accounts(id),
  card_type       TEXT NOT NULL DEFAULT 'virtual'
                    CHECK (card_type IN ('virtual', 'physical')),
  usage_type      TEXT NOT NULL DEFAULT 'online'
                    CHECK (usage_type IN ('online', 'in_person', 'both')),
  provider        TEXT NOT NULL CHECK (provider IN ('stripe', 'finix')),
  provider_card_id TEXT,
  cardholder_name TEXT NOT NULL,
  last4           TEXT,
  exp_month       INT,
  exp_year        INT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','frozen','cancelled')),
  spending_limit_daily   NUMERIC(18,6),
  spending_limit_monthly NUMERIC(18,6),
  currency        CHAR(3) NOT NULL DEFAULT 'CAD',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcards_merchant ON public.zenipay_merchant_cards(merchant_id);
CREATE INDEX IF NOT EXISTS idx_mcards_status   ON public.zenipay_merchant_cards(status);
CREATE INDEX IF NOT EXISTS idx_mcards_provider_id ON public.zenipay_merchant_cards(provider_card_id);

ALTER TABLE public.zenipay_merchant_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full" ON public.zenipay_merchant_cards;
CREATE POLICY "service_role_full" ON public.zenipay_merchant_cards
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "authenticated_read" ON public.zenipay_merchant_cards;
CREATE POLICY "authenticated_read" ON public.zenipay_merchant_cards
  FOR SELECT TO authenticated USING (true);
