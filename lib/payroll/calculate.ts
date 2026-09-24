// Moteur de paie — Québec. Brut → net, pour une période de paie.
//
// Méthode : les barèmes fédéral (T4127) et québécois (TP-1015.G) calculent
// l'impôt sur une base ANNUELLE, puis divisent par le nombre de périodes. On
// suit cette méthode plutôt qu'un calcul période par période, sinon l'employé
// paie trop ou pas assez et doit régler l'écart à sa déclaration.
//
// Les cotisations (RRQ, AE, RQAP) sont calculées sur la période, avec les
// plafonds annuels appliqués contre le cumulatif : un employé qui atteint le
// maximum des gains admissibles en octobre cesse de cotiser pour le reste de
// l'année, et son employeur aussi.

import {
  EMPTY_YTD,
  PERIODS_PER_YEAR,
  type DeductionLine,
  type EarningLine,
  type PayFrequency,
  type PayrollInput,
  type PayrollResult,
  type PayrollYearRates,
  type TaxBracket,
  type YearToDate,
} from "./types";
import { ratesForYear } from "./rates";

/** Arrondi au cent. Un seul endroit dans tout le moteur. */
export function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const clampMin0 = (n: number) => (n > 0 ? n : 0);

// ---------------------------------------------------------------------------
// Assiettes de la période
// ---------------------------------------------------------------------------

interface Bases {
  gross: number;
  pensionable: number;
  insurable: number;
  taxableFederal: number;
  taxableQuebec: number;
  otherDeductions: number;
}

function computeBases(earnings: EarningLine[], deductions: DeductionLine[]): Bases {
  let gross = 0;
  let pensionable = 0;
  let insurable = 0;
  let taxable = 0;

  for (const e of earnings) {
    const amount = e.amount || 0;
    gross += amount;
    // Par défaut un gain est assujetti partout : un oubli doit produire une
    // retenue, jamais une exemption silencieuse.
    if (e.pensionable !== false) pensionable += amount;
    if (e.insurable !== false) insurable += amount;
    if (e.taxable !== false) taxable += amount;
  }

  let preTaxBoth = 0;
  let preTaxFederal = 0;
  let preTaxQuebec = 0;
  let otherDeductions = 0;

  for (const d of deductions) {
    const amount = d.amount || 0;
    otherDeductions += amount;
    if (!d.reducesTaxableIncome) continue;
    const scope = d.scope || "both";
    if (scope === "both") preTaxBoth += amount;
    else if (scope === "federal") preTaxFederal += amount;
    else preTaxQuebec += amount;
  }

  return {
    gross,
    pensionable,
    insurable,
    taxableFederal: clampMin0(taxable - preTaxBoth - preTaxFederal),
    taxableQuebec: clampMin0(taxable - preTaxBoth - preTaxQuebec),
    otherDeductions,
  };
}

// ---------------------------------------------------------------------------
// RRQ — base + 1er volet, puis 2e volet (RRQ2)
// ---------------------------------------------------------------------------

function computeQpp(
  rates: PayrollYearRates,
  pensionable: number,
  periods: number,
  ytd: YearToDate,
  exempt: boolean,
  notes: string[]
) {
  if (exempt || pensionable <= 0) {
    return { employee: 0, employeeSecond: 0, pensionableUsed: 0 };
  }
  const q = rates.qpp;

  // L'exemption générale est annuelle : on en répartit une part par période.
  const periodExemption = q.basicExemption / periods;
  const roomBase = clampMin0(q.maxPensionableEarnings - ytd.pensionableEarnings);
  const baseEarnings = Math.min(pensionable, roomBase);
  const contributory = clampMin0(baseEarnings - periodExemption);

  let employee = contributory * q.employeeRate;
  const capBase = clampMin0(q.maxEmployeeContribution - ytd.qppContribution);
  if (employee > capBase) {
    employee = capBase;
    notes.push("Maximum annuel de cotisation au RRQ atteint.");
  }

  // 2e volet : gains entre le MGA et le MSGA.
  let employeeSecond = 0;
  const ytdTotal = ytd.pensionableEarnings;
  const aboveStart = Math.max(ytdTotal, q.maxPensionableEarnings);
  const aboveEnd = Math.min(ytdTotal + pensionable, q.additionalMaxPensionableEarnings);
  const secondEarnings = clampMin0(aboveEnd - aboveStart);
  if (secondEarnings > 0) {
    employeeSecond = secondEarnings * q.secondRate;
    const capSecond = clampMin0(q.maxEmployeeSecondContribution - ytd.qppSecondContribution);
    if (employeeSecond > capSecond) {
      employeeSecond = capSecond;
      notes.push("Maximum annuel de cotisation au RRQ supplémentaire (RRQ2) atteint.");
    }
  }

  return {
    employee: roundCents(employee),
    employeeSecond: roundCents(employeeSecond),
    pensionableUsed: pensionable,
  };
}

// ---------------------------------------------------------------------------
// Assurance-emploi (taux réduit du Québec)
// ---------------------------------------------------------------------------

function computeEi(
  rates: PayrollYearRates,
  insurable: number,
  ytd: YearToDate,
  exempt: boolean,
  notes: string[]
) {
  if (exempt || insurable <= 0) return { employee: 0, insurableUsed: 0 };
  const e = rates.ei;
  const room = clampMin0(e.maxInsurableEarnings - ytd.insurableEarnings);
  const earnings = Math.min(insurable, room);
  let employee = earnings * e.employeeRate;
  const cap = clampMin0(e.maxEmployeeContribution - ytd.eiContribution);
  if (employee > cap) {
    employee = cap;
    notes.push("Maximum annuel de cotisation à l'assurance-emploi atteint.");
  }
  return { employee: roundCents(employee), insurableUsed: earnings };
}

// ---------------------------------------------------------------------------
// RQAP
// ---------------------------------------------------------------------------

function computeQpip(
  rates: PayrollYearRates,
  insurable: number,
  ytd: YearToDate,
  exempt: boolean,
  notes: string[]
) {
  if (exempt || insurable <= 0) return { employee: 0, employer: 0, insurableUsed: 0 };
  const p = rates.qpip;
  const room = clampMin0(p.maxInsurableEarnings - ytd.qpipInsurableEarnings);
  const earnings = Math.min(insurable, room);
  let employee = earnings * p.employeeRate;
  const cap = clampMin0(p.maxEmployeeContribution - ytd.qpipContribution);
  if (employee > cap) {
    employee = cap;
    notes.push("Maximum annuel de cotisation au RQAP atteint.");
  }
  return {
    employee: roundCents(employee),
    employer: roundCents(earnings * p.employerRate),
    insurableUsed: earnings,
  };
}

// ---------------------------------------------------------------------------
// Impôt
// ---------------------------------------------------------------------------

/** Impôt annuel selon un barème progressif. */
export function taxFromBrackets(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  let floor = 0;
  for (const b of brackets) {
    const ceiling = b.upTo ?? Infinity;
    if (income <= floor) break;
    const slice = Math.min(income, ceiling) - floor;
    if (slice > 0) tax += slice * b.rate;
    floor = ceiling;
    if (income <= ceiling) break;
  }
  return tax;
}

/** Montant personnel de base fédéral : réduit linéairement dans la zone de retrait. */
export function federalBpa(annualIncome: number, rates: PayrollYearRates): number {
  const f = rates.federalTax;
  if (annualIncome <= f.bpaPhaseOutStart) return f.basicPersonalAmountMax;
  if (annualIncome >= f.bpaPhaseOutEnd) return f.basicPersonalAmountMin;
  const span = f.bpaPhaseOutEnd - f.bpaPhaseOutStart;
  const reduction =
    ((f.basicPersonalAmountMax - f.basicPersonalAmountMin) * (annualIncome - f.bpaPhaseOutStart)) /
    span;
  return f.basicPersonalAmountMax - reduction;
}

function computeFederalTax(
  rates: PayrollYearRates,
  annualTaxable: number,
  annualQpp: number,
  annualEi: number,
  annualQpip: number,
  periods: number,
  credits: number | undefined
): number {
  const f = rates.federalTax;
  // Les cotisations au régime supplémentaire (1er et 2e volets) sont une
  // DÉDUCTION du revenu, pas un crédit — contrairement à la part de base.
  const qppEnhanced = annualQpp * (1 - 5.3 / 6.3); // part supplémentaire du taux employé
  const annualIncome = clampMin0(annualTaxable - qppEnhanced);

  const baseTax = taxFromBrackets(annualIncome, f.brackets);

  const bpa = credits ?? federalBpa(annualIncome, rates);
  const qppBase = annualQpp - qppEnhanced;
  const creditBase =
    bpa + Math.min(f.canadaEmploymentAmount, annualTaxable) + qppBase + annualEi + annualQpip;
  const credits$ = creditBase * f.lowestRate;

  let annualTax = clampMin0(baseTax - credits$);
  // Abattement du Québec : l'impôt fédéral retenu est réduit de 16,5 %.
  annualTax *= 1 - f.quebecAbatementRate;

  return annualTax / periods;
}

function computeQuebecTax(
  rates: PayrollYearRates,
  annualTaxable: number,
  annualQppEnhanced: number,
  annualQpip: number,
  periods: number,
  credits: number | undefined
): number {
  const q = rates.quebecTax;
  // Déduction pour travailleur : 6 % du revenu d'emploi, plafonnée.
  const workerDeduction = Math.min(annualTaxable * q.workerDeductionRate, q.workerDeductionMax);
  // Les cotisations supplémentaires au RRQ et la cotisation au RQAP sont
  // déductibles du revenu au Québec.
  const annualIncome = clampMin0(
    annualTaxable - workerDeduction - annualQppEnhanced - annualQpip
  );

  const baseTax = taxFromBrackets(annualIncome, q.brackets);
  const credits$ = (credits ?? q.basicPersonalAmount) * q.lowestRate;

  return clampMin0(baseTax - credits$) / periods;
}

// ---------------------------------------------------------------------------
// Cotisations de l'employeur
// ---------------------------------------------------------------------------

/** Taux du FSS selon la masse salariale totale et le secteur. */
export function healthServicesFundRate(
  rates: PayrollYearRates,
  totalAnnualPayroll: number,
  sector: "primary_manufacturing" | "other"
): number {
  const h = rates.healthServicesFund;
  const grid = sector === "primary_manufacturing" ? h.primaryAndManufacturing : h.otherSectors;
  if (totalAnnualPayroll <= 1_000_000) return grid.minRate;
  if (totalAnnualPayroll >= h.thresholdPayroll) return h.maxRate;
  const millions = totalAnnualPayroll / 1_000_000;
  const rate = grid.slope * millions + grid.intercept;
  return Math.min(Math.max(rate, grid.minRate), h.maxRate);
}

// ---------------------------------------------------------------------------
// Calcul complet
// ---------------------------------------------------------------------------

export function calculatePay(input: PayrollInput): PayrollResult {
  const rates = ratesForYear(input.year);
  const periods = PERIODS_PER_YEAR[input.frequency as PayFrequency];
  const ytd: YearToDate = { ...EMPTY_YTD, ...(input.ytd || {}) };
  const profile = input.profile || {};
  const employer = input.employer || {};
  const notes: string[] = [];

  if (!rates.verifiedOn) {
    notes.push(
      `Barème ${rates.year} non vérifié contre le T4127 et le TP-1015.F — à confirmer avant de verser une paie réelle.`
    );
  }

  const bases = computeBases(input.earnings || [], input.deductions || []);

  // --- Cotisations sociales de la période ---
  const qpp = computeQpp(rates, bases.pensionable, periods, ytd, !!profile.qppExempt, notes);
  const ei = computeEi(rates, bases.insurable, ytd, !!profile.eiExempt, notes);
  const qpip = computeQpip(rates, bases.insurable, ytd, !!profile.qpipExempt, notes);

  // --- Impôt : on annualise la période courante ---
  const annualTaxableFederal = bases.taxableFederal * periods;
  const annualTaxableQuebec = bases.taxableQuebec * periods;
  const annualQpp = qpp.employee * periods;
  const annualQppSecond = qpp.employeeSecond * periods;
  const annualEi = ei.employee * periods;
  const annualQpip = qpip.employee * periods;

  let federalTax = computeFederalTax(
    rates,
    annualTaxableFederal,
    annualQpp,
    annualEi,
    annualQpip,
    periods,
    profile.federalCredits
  );
  // Le 2e volet du RRQ est entièrement déductible au fédéral.
  federalTax = clampMin0(
    federalTax - (annualQppSecond * rates.federalTax.lowestRate * (1 - rates.federalTax.quebecAbatementRate)) / periods
  );
  federalTax += profile.additionalFederalTax || 0;

  const annualQppEnhanced = annualQpp * (1 - 5.3 / 6.3) + annualQppSecond;
  let quebecTax = computeQuebecTax(
    rates,
    annualTaxableQuebec,
    annualQppEnhanced,
    annualQpip,
    periods,
    profile.quebecCredits
  );
  quebecTax += profile.additionalQuebecTax || 0;

  federalTax = roundCents(federalTax);
  quebecTax = roundCents(quebecTax);

  // --- Part de l'employeur ---
  const eiMultiplier = employer.eiEmployerMultiplier ?? rates.ei.employerMultiplier;
  const hsfRate = healthServicesFundRate(
    rates,
    employer.totalAnnualPayroll ?? 0,
    employer.sector ?? "other"
  );
  const cnesstRate = employer.cnesstRate ?? rates.cnesst.defaultRate;
  if (cnesstRate == null) {
    notes.push(
      "Aucun taux CNESST configuré : la prime n'est pas calculée. Saisissez le taux de votre avis de cotisation."
    );
  }

  const employerQpp = roundCents(qpp.employee); // l'employeur verse le même montant
  const employerQppSecond = roundCents(qpp.employeeSecond);
  const employerEi = roundCents(ei.employee * eiMultiplier);
  const employerHsf = roundCents(bases.gross * hsfRate);
  const cnesstRoom = clampMin0(rates.cnesst.maxAssessableEarnings - ytd.grossEarnings);
  const employerCnesst =
    cnesstRate == null ? null : roundCents(Math.min(bases.gross, cnesstRoom) * cnesstRate);

  const employeeTotal = roundCents(
    qpp.employee +
      qpp.employeeSecond +
      ei.employee +
      qpip.employee +
      federalTax +
      quebecTax +
      bases.otherDeductions
  );
  const employerTotal = roundCents(
    employerQpp +
      employerQppSecond +
      employerEi +
      qpip.employer +
      employerHsf +
      (employerCnesst ?? 0)
  );

  const gross = roundCents(bases.gross);
  const net = roundCents(gross - employeeTotal);
  if (net < 0) {
    notes.push("Les retenues dépassent le brut : vérifiez les déductions volontaires.");
  }

  return {
    year: rates.year,
    frequency: input.frequency,
    gross,
    taxableIncome: roundCents(bases.taxableQuebec),
    employee: {
      qpp: qpp.employee,
      qppSecond: qpp.employeeSecond,
      ei: ei.employee,
      qpip: qpip.employee,
      federalTax,
      quebecTax,
      otherDeductions: roundCents(bases.otherDeductions),
      totalDeductions: employeeTotal,
    },
    employer: {
      qpp: employerQpp,
      qppSecond: employerQppSecond,
      ei: employerEi,
      qpip: qpip.employer,
      healthServicesFund: employerHsf,
      cnesst: employerCnesst,
      total: employerTotal,
    },
    net,
    ytd: {
      pensionableEarnings: roundCents(ytd.pensionableEarnings + bases.pensionable),
      qppContribution: roundCents(ytd.qppContribution + qpp.employee),
      qppSecondContribution: roundCents(ytd.qppSecondContribution + qpp.employeeSecond),
      insurableEarnings: roundCents(ytd.insurableEarnings + ei.insurableUsed),
      eiContribution: roundCents(ytd.eiContribution + ei.employee),
      qpipInsurableEarnings: roundCents(ytd.qpipInsurableEarnings + qpip.insurableUsed),
      qpipContribution: roundCents(ytd.qpipContribution + qpip.employee),
      grossEarnings: roundCents(ytd.grossEarnings + bases.gross),
      federalTax: roundCents(ytd.federalTax + federalTax),
      quebecTax: roundCents(ytd.quebecTax + quebecTax),
    },
    notes,
  };
}

/** Indemnité de congé annuel selon l'ancienneté (Loi sur les normes du travail). */
export function vacationPay(
  vacationableEarnings: number,
  yearsOfService: number,
  year: number
): number {
  const ls = ratesForYear(year).labourStandards;
  const rate =
    yearsOfService >= ls.vacationSeniorityYears
      ? ls.vacationRate3YearsPlus
      : ls.vacationRateUnder3Years;
  return roundCents(vacationableEarnings * rate);
}
