// Types du moteur de paie — Québec.
//
// Toutes les sommes sont en DOLLARS (nombres à deux décimales après arrondi),
// jamais en cents : les barèmes officiels sont exprimés en dollars et convertir
// dans les deux sens multiplie les occasions d'erreur d'arrondi. L'arrondi final
// au cent est fait une seule fois, par `roundCents`.

export type PayFrequency =
  | "weekly" // 52
  | "biweekly" // 26
  | "semimonthly" // 24
  | "monthly"; // 12

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export type HsfSector = "primary_manufacturing" | "other";

// ---------------------------------------------------------------------------
// Barèmes légaux (voir lib/payroll/rates/<année>.ts)
// ---------------------------------------------------------------------------

export interface TaxBracket {
  /** Plafond du palier, ou null pour le dernier palier. */
  upTo: number | null;
  rate: number;
}

export interface PayrollYearRates {
  year: number;
  jurisdiction: "QC";
  /** Date de la dernière vérification humaine contre les publications officielles. */
  verifiedOn: string | null;

  qpp: {
    maxPensionableEarnings: number;
    additionalMaxPensionableEarnings: number;
    basicExemption: number;
    employeeRate: number;
    employerRate: number;
    secondRate: number;
    maxEmployeeContribution: number;
    maxEmployeeSecondContribution: number;
  };

  ei: {
    maxInsurableEarnings: number;
    employeeRate: number;
    employerMultiplier: number;
    maxEmployeeContribution: number;
  };

  qpip: {
    maxInsurableEarnings: number;
    employeeRate: number;
    employerRate: number;
    maxEmployeeContribution: number;
    maxEmployerContribution: number;
  };

  federalTax: {
    brackets: TaxBracket[];
    lowestRate: number;
    basicPersonalAmountMax: number;
    basicPersonalAmountMin: number;
    bpaPhaseOutStart: number;
    bpaPhaseOutEnd: number;
    canadaEmploymentAmount: number;
    quebecAbatementRate: number;
  };

  quebecTax: {
    brackets: TaxBracket[];
    lowestRate: number;
    basicPersonalAmount: number;
    workerDeductionRate: number;
    workerDeductionMax: number;
  };

  healthServicesFund: {
    thresholdPayroll: number;
    maxRate: number;
    primaryAndManufacturing: { minRate: number; slope: number; intercept: number };
    otherSectors: { minRate: number; slope: number; intercept: number };
  };

  cnesst: {
    maxAssessableEarnings: number;
    /** Aucun taux par défaut : il vient de l'avis de cotisation de l'employeur. */
    defaultRate: number | null;
  };

  labourStandards: {
    minimumWage: number;
    minimumWageTipped: number;
    vacationRateUnder3Years: number;
    vacationRate3YearsPlus: number;
    vacationSeniorityYears: number;
  };
}

// ---------------------------------------------------------------------------
// Entrées du calcul
// ---------------------------------------------------------------------------

/** Cumulatif de l'employé AVANT la période courante (pour les plafonds annuels). */
export interface YearToDate {
  pensionableEarnings: number;
  qppContribution: number;
  qppSecondContribution: number;
  insurableEarnings: number;
  eiContribution: number;
  qpipInsurableEarnings: number;
  qpipContribution: number;
  grossEarnings: number;
  federalTax: number;
  quebecTax: number;
}

export const EMPTY_YTD: YearToDate = {
  pensionableEarnings: 0,
  qppContribution: 0,
  qppSecondContribution: 0,
  insurableEarnings: 0,
  eiContribution: 0,
  qpipInsurableEarnings: 0,
  qpipContribution: 0,
  grossEarnings: 0,
  federalTax: 0,
  quebecTax: 0,
};

export interface EarningLine {
  code: string;
  label: string;
  amount: number;
  /** Assujetti au RRQ. Faux pour l'indemnité de départ, par exemple. */
  pensionable?: boolean;
  /** Assujetti à l'AE et au RQAP. */
  insurable?: boolean;
  /** Soumis à l'impôt. Presque toujours vrai. */
  taxable?: boolean;
  /** Donne droit à l'indemnité de congé annuel. */
  vacationable?: boolean;
}

export interface DeductionLine {
  code: string;
  label: string;
  amount: number;
  /** Réduit le revenu imposable (REER collectif, cotisation syndicale…). */
  reducesTaxableIncome?: boolean;
  /** Réduit le revenu imposable au fédéral seulement, ou au Québec seulement. */
  scope?: "both" | "federal" | "quebec";
}

export interface EmployeeTaxProfile {
  /** Code A du TP-1015.3 : crédits personnels du Québec. Par défaut, le montant de base. */
  quebecCredits?: number;
  /** Demande du TD1 fédéral. Par défaut, le montant personnel de base. */
  federalCredits?: number;
  /** Retenue supplémentaire demandée par l'employé, par période. */
  additionalFederalTax?: number;
  additionalQuebecTax?: number;
  /** L'employé a atteint 72 ans ou a cessé de cotiser au RRQ. */
  qppExempt?: boolean;
  /** Emploi non assurable (ex. actionnaire majoritaire). */
  eiExempt?: boolean;
  qpipExempt?: boolean;
}

export interface PayrollInput {
  year: number;
  frequency: PayFrequency;
  /** Numéro de la période dans l'année (1..n). Sert aux rapports, pas au calcul. */
  periodNumber?: number;
  earnings: EarningLine[];
  deductions?: DeductionLine[];
  ytd?: YearToDate;
  profile?: EmployeeTaxProfile;
  employer?: {
    sector?: HsfSector;
    /** Masse salariale totale annuelle, pour le taux du FSS. */
    totalAnnualPayroll?: number;
    /** Taux CNESST de l'employeur (ex. 0.0184). Sans lui, aucune prime n'est calculée. */
    cnesstRate?: number | null;
    /** Multiplicateur AE réduit accordé par l'assurance-emploi, s'il y a lieu. */
    eiEmployerMultiplier?: number;
  };
}

// ---------------------------------------------------------------------------
// Résultat du calcul
// ---------------------------------------------------------------------------

export interface PayrollResult {
  year: number;
  frequency: PayFrequency;
  gross: number;
  /** Gains soumis à l'impôt après déductions avant impôt. */
  taxableIncome: number;
  employee: {
    qpp: number;
    qppSecond: number;
    ei: number;
    qpip: number;
    federalTax: number;
    quebecTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  employer: {
    qpp: number;
    qppSecond: number;
    ei: number;
    qpip: number;
    healthServicesFund: number;
    cnesst: number | null;
    total: number;
  };
  net: number;
  /** Cumulatif mis à jour, à enregistrer pour la période suivante. */
  ytd: YearToDate;
  /** Messages destinés à l'humain qui valide la paie (plafond atteint, taux manquant…). */
  notes: string[];
}
