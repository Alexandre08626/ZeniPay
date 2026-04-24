-- PR Personal — savings goals + budget categories.
--
-- Two new tables that complement the four `zenipay_personal_*` tables
-- already created by Claude Web. Both are scoped to a single merchant
-- (the personal profile is keyed off zenipay_merchants.id).

CREATE TABLE IF NOT EXISTS public.zenipay_savings_goals (
  id              TEXT PRIMARY KEY DEFAULT 'goal_' || gen_random_uuid()::TEXT,
  merchant_id     TEXT NOT NULL REFERENCES public.zenipay_merchants(id),
  profile_id      TEXT REFERENCES public.zenipay_personal_profiles(id),
  name            TEXT NOT NULL,
  target_amount   NUMERIC(18,6) NOT NULL,
  current_amount  NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency        CHAR(3) NOT NULL DEFAULT 'CAD',
  target_date     DATE,
  icon            TEXT DEFAULT '🎯',
  color           TEXT DEFAULT '#FF6B9D',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_merchant ON public.zenipay_savings_goals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status   ON public.zenipay_savings_goals(status);

ALTER TABLE public.zenipay_savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON public.zenipay_savings_goals;
CREATE POLICY "service_role_full" ON public.zenipay_savings_goals FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON public.zenipay_savings_goals;
CREATE POLICY "authenticated_read" ON public.zenipay_savings_goals FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.zenipay_budget_categories (
  id                  TEXT PRIMARY KEY DEFAULT 'bcat_' || gen_random_uuid()::TEXT,
  merchant_id         TEXT NOT NULL REFERENCES public.zenipay_merchants(id),
  profile_id          TEXT REFERENCES public.zenipay_personal_profiles(id),
  name                TEXT NOT NULL,
  monthly_limit       NUMERIC(18,6) NOT NULL,
  spent_this_month    NUMERIC(18,6) NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'CAD',
  icon                TEXT,
  color               TEXT,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_merchant ON public.zenipay_budget_categories(merchant_id);

ALTER TABLE public.zenipay_budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full" ON public.zenipay_budget_categories;
CREATE POLICY "service_role_full" ON public.zenipay_budget_categories FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "authenticated_read" ON public.zenipay_budget_categories;
CREATE POLICY "authenticated_read" ON public.zenipay_budget_categories FOR SELECT TO authenticated USING (true);
