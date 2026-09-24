-- =============================================================================
-- ZeniPay Paie — Québec (phase 1)
-- =============================================================================
-- Schéma `payroll` séparé. Aucune lecture ni écriture dans public.zenipay_*.
-- Isolation par employeur : payroll_members mappe auth.users.id → employeur.
-- RLS activée partout ; les écritures passent par le service_role (aucune
-- politique INSERT/UPDATE pour anon/authenticated) car une paie ne doit jamais
-- pouvoir être modifiée depuis le navigateur.
--
-- Les montants sont en NUMERIC(14,2) : jamais de float pour de l'argent.
-- Les cumulatifs (payroll_ytd) sont dérivés des lignes de paie, mais stockés
-- pour éviter de rejouer l'année entière à chaque calcul.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS payroll;

-- -----------------------------------------------------------------------------
-- 1. Employeurs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.employers (
  id                  TEXT PRIMARY KEY DEFAULT ('emp_' || gen_random_uuid()::text),
  legal_name          TEXT NOT NULL,
  operating_name      TEXT,
  owner_user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Identifiants de remise. Format attendu : NEQ 10 chiffres,
  -- numéro d'identification Revenu Québec, numéro d'entreprise ARC (RP).
  neq                 TEXT,
  rq_identification   TEXT,
  cra_payroll_number  TEXT,

  province            TEXT NOT NULL DEFAULT 'QC' CHECK (province = 'QC'),

  -- Paramètres qui changent le calcul des cotisations de l'employeur.
  hsf_sector          TEXT NOT NULL DEFAULT 'other'
                        CHECK (hsf_sector IN ('primary_manufacturing','other')),
  total_annual_payroll NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Taux CNESST de l'avis de cotisation. NULL = non configuré : le moteur ne
  -- calcule alors aucune prime et le signale plutôt que d'inventer un taux.
  cnesst_rate         NUMERIC(8,6),
  -- Multiplicateur AE réduit accordé par l'assurance-emploi, s'il y a lieu.
  ei_employer_multiplier NUMERIC(6,4),

  -- Fréquence de remise à Revenu Québec et à l'ARC.
  remittance_frequency TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (remittance_frequency IN ('quarterly','monthly','twice_monthly','weekly')),

  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','suspended','closed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employers_owner ON payroll.employers(owner_user_id);

-- -----------------------------------------------------------------------------
-- 2. Accès des utilisateurs à un employeur
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.members (
  id           TEXT PRIMARY KEY DEFAULT ('pmem_' || gen_random_uuid()::text),
  employer_id  TEXT NOT NULL REFERENCES payroll.employers(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('owner','admin','preparer','viewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_members_user ON payroll.members(user_id);

-- -----------------------------------------------------------------------------
-- 3. Employés
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.employees (
  id                TEXT PRIMARY KEY DEFAULT ('pe_' || gen_random_uuid()::text),
  employer_id       TEXT NOT NULL REFERENCES payroll.employers(id) ON DELETE CASCADE,

  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT,
  -- Le NAS n'est jamais stocké en clair : seuls les 3 derniers chiffres pour
  -- l'affichage, plus une empreinte pour détecter les doublons. Le numéro
  -- complet requis pour le relevé 1 et le T4 est conservé dans le coffre
  -- chiffré de ZeniPay, référencé ici par son identifiant.
  sin_last3         TEXT CHECK (sin_last3 IS NULL OR sin_last3 ~ '^[0-9]{3}$'),
  sin_vault_ref     TEXT,

  date_of_birth     DATE,
  hire_date         DATE NOT NULL,
  termination_date  DATE,

  employment_type   TEXT NOT NULL DEFAULT 'salaried'
                      CHECK (employment_type IN ('salaried','hourly')),
  annual_salary     NUMERIC(14,2),
  hourly_rate       NUMERIC(10,4),
  standard_hours_per_period NUMERIC(8,2),

  pay_frequency     TEXT NOT NULL DEFAULT 'biweekly'
                      CHECK (pay_frequency IN ('weekly','biweekly','semimonthly','monthly')),

  -- Crédits déclarés par l'employé (TD1 fédéral et TP-1015.3 du Québec).
  -- NULL = on applique le montant personnel de base de l'année.
  federal_credits   NUMERIC(14,2),
  quebec_credits    NUMERIC(14,2),
  additional_federal_tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_quebec_tax  NUMERIC(14,2) NOT NULL DEFAULT 0,

  qpp_exempt        BOOLEAN NOT NULL DEFAULT FALSE,
  ei_exempt         BOOLEAN NOT NULL DEFAULT FALSE,
  qpip_exempt       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Versement du net : compte bancaire du dépôt direct, dans le coffre.
  bank_vault_ref    TEXT,

  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','on_leave','terminated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employees_employer ON payroll.employees(employer_id, status);

-- -----------------------------------------------------------------------------
-- 4. Cycles de paie
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.pay_runs (
  id              TEXT PRIMARY KEY DEFAULT ('run_' || gen_random_uuid()::text),
  employer_id     TEXT NOT NULL REFERENCES payroll.employers(id) ON DELETE CASCADE,

  tax_year        INTEGER NOT NULL,
  pay_frequency   TEXT NOT NULL
                    CHECK (pay_frequency IN ('weekly','biweekly','semimonthly','monthly')),
  period_number   INTEGER NOT NULL CHECK (period_number >= 1 AND period_number <= 53),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  payment_date    DATE NOT NULL,

  -- draft → calculée mais modifiable ; approved → figée ; paid → net versé.
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','paid','cancelled')),

  -- Version du barème utilisée. Indispensable pour rejouer une paie vérifiée.
  rates_year      INTEGER NOT NULL,

  total_gross     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net       NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employee_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employer_cost NUMERIC(14,2) NOT NULL DEFAULT 0,

  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (period_end >= period_start),
  UNIQUE (employer_id, tax_year, pay_frequency, period_number)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_employer ON payroll.pay_runs(employer_id, tax_year, period_number);

-- -----------------------------------------------------------------------------
-- 5. Lignes de paie (un employé × un cycle) — le bulletin de paie
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.pay_lines (
  id              TEXT PRIMARY KEY DEFAULT ('pl_' || gen_random_uuid()::text),
  pay_run_id      TEXT NOT NULL REFERENCES payroll.pay_runs(id) ON DELETE CASCADE,
  employee_id     TEXT NOT NULL REFERENCES payroll.employees(id) ON DELETE RESTRICT,

  -- Détail des gains et des retenues volontaires, tel que soumis au moteur.
  earnings        JSONB NOT NULL DEFAULT '[]',
  deductions      JSONB NOT NULL DEFAULT '[]',

  gross           NUMERIC(14,2) NOT NULL,
  taxable_income  NUMERIC(14,2) NOT NULL,

  qpp             NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpp_second      NUMERIC(14,2) NOT NULL DEFAULT 0,
  ei              NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpip            NUMERIC(14,2) NOT NULL DEFAULT 0,
  federal_tax     NUMERIC(14,2) NOT NULL DEFAULT 0,
  quebec_tax      NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net             NUMERIC(14,2) NOT NULL,

  er_qpp          NUMERIC(14,2) NOT NULL DEFAULT 0,
  er_qpp_second   NUMERIC(14,2) NOT NULL DEFAULT 0,
  er_ei           NUMERIC(14,2) NOT NULL DEFAULT 0,
  er_qpip         NUMERIC(14,2) NOT NULL DEFAULT 0,
  er_hsf          NUMERIC(14,2) NOT NULL DEFAULT 0,
  er_cnesst       NUMERIC(14,2),
  er_total        NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Cumulatif APRÈS cette ligne : ce qu'on repasse au calcul suivant.
  ytd_snapshot    JSONB NOT NULL DEFAULT '{}',
  -- Avertissements du moteur (plafond atteint, taux manquant…).
  notes           JSONB NOT NULL DEFAULT '[]',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pay_run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee ON payroll.pay_lines(employee_id);

-- -----------------------------------------------------------------------------
-- 6. Cumulatifs annuels par employé (dérivés, mais matérialisés)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.ytd (
  id                      TEXT PRIMARY KEY DEFAULT ('ytd_' || gen_random_uuid()::text),
  employee_id             TEXT NOT NULL REFERENCES payroll.employees(id) ON DELETE CASCADE,
  tax_year                INTEGER NOT NULL,

  gross_earnings          NUMERIC(14,2) NOT NULL DEFAULT 0,
  pensionable_earnings    NUMERIC(14,2) NOT NULL DEFAULT 0,
  insurable_earnings      NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpip_insurable_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpp_contribution        NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpp_second_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  ei_contribution         NUMERIC(14,2) NOT NULL DEFAULT 0,
  qpip_contribution       NUMERIC(14,2) NOT NULL DEFAULT 0,
  federal_tax             NUMERIC(14,2) NOT NULL DEFAULT 0,
  quebec_tax              NUMERIC(14,2) NOT NULL DEFAULT 0,

  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, tax_year)
);

-- -----------------------------------------------------------------------------
-- 7. Remises aux gouvernements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll.remittances (
  id              TEXT PRIMARY KEY DEFAULT ('rem_' || gen_random_uuid()::text),
  employer_id     TEXT NOT NULL REFERENCES payroll.employers(id) ON DELETE CASCADE,
  authority       TEXT NOT NULL CHECK (authority IN ('revenu_quebec','cra')),
  tax_year        INTEGER NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  due_date        DATE NOT NULL,

  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  breakdown       JSONB NOT NULL DEFAULT '{}',

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','scheduled','sent','confirmed','failed')),
  confirmation_ref TEXT,
  sent_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_remittances_due ON payroll.remittances(employer_id, due_date, status);

-- =============================================================================
-- RLS — lecture réservée aux membres de l'employeur, écriture au service_role
-- =============================================================================

ALTER TABLE payroll.employers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.employees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.pay_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.pay_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.ytd         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.remittances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION payroll.is_member(target_employer TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = payroll, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM payroll.members m
    WHERE m.employer_id = target_employer AND m.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS employers_select ON payroll.employers;
CREATE POLICY employers_select ON payroll.employers
  FOR SELECT TO authenticated USING (payroll.is_member(id));

DROP POLICY IF EXISTS members_select ON payroll.members;
CREATE POLICY members_select ON payroll.members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR payroll.is_member(employer_id));

DROP POLICY IF EXISTS employees_select ON payroll.employees;
CREATE POLICY employees_select ON payroll.employees
  FOR SELECT TO authenticated USING (payroll.is_member(employer_id));

DROP POLICY IF EXISTS pay_runs_select ON payroll.pay_runs;
CREATE POLICY pay_runs_select ON payroll.pay_runs
  FOR SELECT TO authenticated USING (payroll.is_member(employer_id));

DROP POLICY IF EXISTS pay_lines_select ON payroll.pay_lines;
CREATE POLICY pay_lines_select ON payroll.pay_lines
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM payroll.pay_runs r WHERE r.id = pay_run_id AND payroll.is_member(r.employer_id))
  );

DROP POLICY IF EXISTS ytd_select ON payroll.ytd;
CREATE POLICY ytd_select ON payroll.ytd
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM payroll.employees e WHERE e.id = employee_id AND payroll.is_member(e.employer_id))
  );

DROP POLICY IF EXISTS remittances_select ON payroll.remittances;
CREATE POLICY remittances_select ON payroll.remittances
  FOR SELECT TO authenticated USING (payroll.is_member(employer_id));

-- Une paie approuvée est une pièce comptable : elle ne se modifie plus.
CREATE OR REPLACE FUNCTION payroll.block_locked_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('approved','paid') AND NEW.status NOT IN ('approved','paid','cancelled') THEN
    RAISE EXCEPTION 'Une paie % ne peut pas revenir en brouillon. Annulez-la et créez-en une nouvelle.', OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay_runs_lock ON payroll.pay_runs;
CREATE TRIGGER trg_pay_runs_lock
  BEFORE UPDATE ON payroll.pay_runs
  FOR EACH ROW EXECUTE FUNCTION payroll.block_locked_pay_run();

CREATE OR REPLACE FUNCTION payroll.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_employers_touch ON payroll.employers;
CREATE TRIGGER trg_employers_touch BEFORE UPDATE ON payroll.employers
  FOR EACH ROW EXECUTE FUNCTION payroll.touch_updated_at();
DROP TRIGGER IF EXISTS trg_employees_touch ON payroll.employees;
CREATE TRIGGER trg_employees_touch BEFORE UPDATE ON payroll.employees
  FOR EACH ROW EXECUTE FUNCTION payroll.touch_updated_at();
DROP TRIGGER IF EXISTS trg_pay_runs_touch ON payroll.pay_runs;
CREATE TRIGGER trg_pay_runs_touch BEFORE UPDATE ON payroll.pay_runs
  FOR EACH ROW EXECUTE FUNCTION payroll.touch_updated_at();
