// Exécution d'un cycle de paie.
//
// Un cycle prend tous les employés actifs d'un employeur, calcule chaque
// bulletin avec le cumulatif de l'employé, puis enregistre le tout. Deux règles
// gouvernent ce fichier :
//
// 1. La partie qui décide (quels gains, quel cumulatif, quels totaux) est pure
//    et testable sans base de données — c'est `buildPayRun()`.
// 2. La partie qui écrit est séparée et idempotente par (cycle, employé) :
//    relancer un calcul ne doit jamais créer un deuxième bulletin ni compter
//    deux fois le cumulatif.

import { calculatePay, roundCents } from "./calculate";
import { getPayrollDb } from "./supabase-client";
import {
  EMPTY_YTD,
  PERIODS_PER_YEAR,
  type EarningLine,
  type PayFrequency,
  type PayrollResult,
  type YearToDate,
} from "./types";

export interface EmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
  employment_type: "salaried" | "hourly";
  annual_salary: number | null;
  hourly_rate: number | null;
  standard_hours_per_period: number | null;
  pay_frequency: PayFrequency;
  federal_credits: number | null;
  quebec_credits: number | null;
  additional_federal_tax: number;
  additional_quebec_tax: number;
  qpp_exempt: boolean;
  ei_exempt: boolean;
  qpip_exempt: boolean;
  status: string;
}

export interface EmployerRecord {
  id: string;
  hsf_sector: "primary_manufacturing" | "other";
  total_annual_payroll: number;
  cnesst_rate: number | null;
  ei_employer_multiplier: number | null;
}

/** Saisie ponctuelle pour un employé : heures, prime, gains ou retenues ajoutés. */
export interface EmployeeInput {
  employeeId: string;
  hours?: number;
  extraEarnings?: EarningLine[];
  deductions?: { code: string; label: string; amount: number; reducesTaxableIncome?: boolean }[];
  /** Ne pas payer cet employé pour cette période (congé sans solde, départ). */
  skip?: boolean;
}

export interface PayRunLine {
  employeeId: string;
  employeeName: string;
  earnings: EarningLine[];
  deductions: NonNullable<EmployeeInput["deductions"]>;
  result: PayrollResult;
}

export interface PayRunDraft {
  taxYear: number;
  lines: PayRunLine[];
  totals: {
    gross: number;
    net: number;
    employeeDeductions: number;
    employerCost: number;
  };
  /** Avertissements agrégés, préfixés du nom de l'employé concerné. */
  notes: string[];
}

/**
 * Gains réguliers d'un employé pour une période.
 *
 * Un salarié reçoit son salaire annuel divisé par le nombre de périodes ; un
 * employé horaire reçoit ses heures × son taux. Si aucune heure n'est fournie
 * pour un horaire, on prend ses heures standard plutôt que de payer zéro en
 * silence — mais on le signale, parce que payer des heures supposées est une
 * erreur qu'il faut voir.
 */
export function regularEarnings(
  employee: EmployeeRecord,
  frequency: PayFrequency,
  hours: number | undefined,
  notes: string[]
): EarningLine[] {
  const name = `${employee.first_name} ${employee.last_name}`;

  if (employee.employment_type === "salaried") {
    const annual = employee.annual_salary ?? 0;
    if (annual <= 0) {
      notes.push(`${name} : aucun salaire annuel configuré, paie à 0 $.`);
      return [];
    }
    return [
      {
        code: "REG",
        label: "Salaire régulier",
        amount: roundCents(annual / PERIODS_PER_YEAR[frequency]),
      },
    ];
  }

  const rate = employee.hourly_rate ?? 0;
  let worked = hours;
  if (worked == null) {
    worked = employee.standard_hours_per_period ?? 0;
    if (worked > 0) {
      notes.push(`${name} : aucune heure saisie, ${worked} h standard utilisées.`);
    }
  }
  if (rate <= 0 || worked <= 0) {
    notes.push(`${name} : taux horaire ou heures manquants, paie à 0 $.`);
    return [];
  }
  return [
    {
      code: "REG",
      label: `Heures régulières (${worked} h × ${rate.toFixed(2)} $)`,
      amount: roundCents(worked * rate),
    },
  ];
}

/**
 * Construit un cycle complet. Aucune écriture : on peut prévisualiser une paie
 * autant de fois qu'on veut avant de l'enregistrer.
 */
export function buildPayRun(params: {
  taxYear: number;
  frequency: PayFrequency;
  employer: EmployerRecord;
  employees: EmployeeRecord[];
  ytdByEmployee: Record<string, YearToDate>;
  inputs?: EmployeeInput[];
}): PayRunDraft {
  const { taxYear, frequency, employer, employees, ytdByEmployee } = params;
  const inputsById = new Map((params.inputs || []).map((i) => [i.employeeId, i]));
  const notes: string[] = [];
  const lines: PayRunLine[] = [];

  for (const employee of employees) {
    const input = inputsById.get(employee.id);
    if (input?.skip) continue;
    if (employee.status === "terminated") continue;

    const name = `${employee.first_name} ${employee.last_name}`;
    const earnings = [
      ...regularEarnings(employee, frequency, input?.hours, notes),
      ...(input?.extraEarnings || []),
    ];
    if (earnings.length === 0) continue;

    const deductions = input?.deductions || [];
    const result = calculatePay({
      year: taxYear,
      frequency,
      earnings,
      deductions,
      ytd: ytdByEmployee[employee.id] || EMPTY_YTD,
      profile: {
        federalCredits: employee.federal_credits ?? undefined,
        quebecCredits: employee.quebec_credits ?? undefined,
        additionalFederalTax: employee.additional_federal_tax || 0,
        additionalQuebecTax: employee.additional_quebec_tax || 0,
        qppExempt: employee.qpp_exempt,
        eiExempt: employee.ei_exempt,
        qpipExempt: employee.qpip_exempt,
      },
      employer: {
        sector: employer.hsf_sector,
        totalAnnualPayroll: employer.total_annual_payroll,
        cnesstRate: employer.cnesst_rate,
        eiEmployerMultiplier: employer.ei_employer_multiplier ?? undefined,
      },
    });

    for (const n of result.notes) notes.push(`${name} : ${n}`);
    lines.push({ employeeId: employee.id, employeeName: name, earnings, deductions, result });
  }

  const totals = lines.reduce(
    (acc, l) => ({
      gross: acc.gross + l.result.gross,
      net: acc.net + l.result.net,
      employeeDeductions: acc.employeeDeductions + l.result.employee.totalDeductions,
      employerCost: acc.employerCost + l.result.employer.total,
    }),
    { gross: 0, net: 0, employeeDeductions: 0, employerCost: 0 }
  );

  return {
    taxYear,
    lines,
    totals: {
      gross: roundCents(totals.gross),
      net: roundCents(totals.net),
      employeeDeductions: roundCents(totals.employeeDeductions),
      employerCost: roundCents(totals.employerCost),
    },
    // Un même avertissement revient pour chaque employé concerné : on déduplique
    // pour que la liste reste lisible sur une paie de 40 personnes.
    notes: Array.from(new Set(notes)),
  };
}

// ---------------------------------------------------------------------------
// Persistance
// ---------------------------------------------------------------------------

export interface CreatePayRunParams {
  employerId: string;
  taxYear: number;
  frequency: PayFrequency;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  inputs?: EmployeeInput[];
  createdBy?: string;
}

/** Charge l'employeur, ses employés actifs et leurs cumulatifs de l'année. */
export async function loadPayrollContext(employerId: string, taxYear: number) {
  const db = getPayrollDb();

  const { data: employer, error: eErr } = await db
    .from("employers")
    .select("id, hsf_sector, total_annual_payroll, cnesst_rate, ei_employer_multiplier")
    .eq("id", employerId)
    .single();
  if (eErr || !employer) throw new Error("Employeur introuvable.");

  const { data: employees, error: empErr } = await db
    .from("employees")
    .select("*")
    .eq("employer_id", employerId)
    .in("status", ["active", "on_leave"])
    .order("last_name");
  if (empErr) throw new Error(`Lecture des employés : ${empErr.message}`);

  const ids = (employees || []).map((e: EmployeeRecord) => e.id);
  const ytdByEmployee: Record<string, YearToDate> = {};
  if (ids.length) {
    const { data: ytdRows } = await db
      .from("ytd")
      .select("*")
      .eq("tax_year", taxYear)
      .in("employee_id", ids);
    for (const row of ytdRows || []) {
      ytdByEmployee[row.employee_id] = {
        grossEarnings: Number(row.gross_earnings),
        pensionableEarnings: Number(row.pensionable_earnings),
        insurableEarnings: Number(row.insurable_earnings),
        qpipInsurableEarnings: Number(row.qpip_insurable_earnings),
        qppContribution: Number(row.qpp_contribution),
        qppSecondContribution: Number(row.qpp_second_contribution),
        eiContribution: Number(row.ei_contribution),
        qpipContribution: Number(row.qpip_contribution),
        federalTax: Number(row.federal_tax),
        quebecTax: Number(row.quebec_tax),
      };
    }
  }

  return {
    employer: employer as EmployerRecord,
    employees: (employees || []) as EmployeeRecord[],
    ytdByEmployee,
  };
}

/**
 * Calcule et enregistre un cycle de paie en brouillon.
 *
 * Le cumulatif n'est PAS mis à jour ici : il ne l'est qu'à l'approbation, quand
 * la paie devient une pièce comptable. Sinon une prévisualisation relancée trois
 * fois gonflerait le cumulatif et fausserait les plafonds annuels.
 */
export async function createPayRun(params: CreatePayRunParams) {
  const db = getPayrollDb();
  const ctx = await loadPayrollContext(params.employerId, params.taxYear);

  const draft = buildPayRun({
    taxYear: params.taxYear,
    frequency: params.frequency,
    employer: ctx.employer,
    employees: ctx.employees,
    ytdByEmployee: ctx.ytdByEmployee,
    inputs: params.inputs,
  });

  const { data: run, error: runErr } = await db
    .from("pay_runs")
    .insert({
      employer_id: params.employerId,
      tax_year: params.taxYear,
      pay_frequency: params.frequency,
      period_number: params.periodNumber,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      payment_date: params.paymentDate,
      rates_year: params.taxYear,
      status: "draft",
      total_gross: draft.totals.gross,
      total_net: draft.totals.net,
      total_employee_deductions: draft.totals.employeeDeductions,
      total_employer_cost: draft.totals.employerCost,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();
  if (runErr || !run) {
    // La contrainte UNIQUE (employeur, année, fréquence, période) empêche de
    // payer deux fois la même période — on le dit en clair.
    if (runErr?.code === "23505") {
      throw new Error(
        `La période ${params.periodNumber} de ${params.taxYear} a déjà un cycle de paie.`
      );
    }
    throw new Error(`Création du cycle : ${runErr?.message}`);
  }

  if (draft.lines.length) {
    const rows = draft.lines.map((l) => ({
      pay_run_id: run.id,
      employee_id: l.employeeId,
      earnings: l.earnings,
      deductions: l.deductions,
      gross: l.result.gross,
      taxable_income: l.result.taxableIncome,
      qpp: l.result.employee.qpp,
      qpp_second: l.result.employee.qppSecond,
      ei: l.result.employee.ei,
      qpip: l.result.employee.qpip,
      federal_tax: l.result.employee.federalTax,
      quebec_tax: l.result.employee.quebecTax,
      other_deductions: l.result.employee.otherDeductions,
      total_deductions: l.result.employee.totalDeductions,
      net: l.result.net,
      er_qpp: l.result.employer.qpp,
      er_qpp_second: l.result.employer.qppSecond,
      er_ei: l.result.employer.ei,
      er_qpip: l.result.employer.qpip,
      er_hsf: l.result.employer.healthServicesFund,
      er_cnesst: l.result.employer.cnesst,
      er_total: l.result.employer.total,
      ytd_snapshot: l.result.ytd,
      notes: l.result.notes,
    }));
    const { error: linesErr } = await db.from("pay_lines").insert(rows);
    if (linesErr) {
      // Un cycle sans ses bulletins n'a aucun sens : on annule plutôt que de
      // laisser un enregistrement à moitié écrit.
      await db.from("pay_runs").delete().eq("id", run.id);
      throw new Error(`Écriture des bulletins : ${linesErr.message}`);
    }
  }

  return { run, draft };
}

/**
 * Approuve un cycle : il devient immuable et le cumulatif de chaque employé
 * avance. C'est le seul moment où `payroll.ytd` bouge.
 */
export async function approvePayRun(runId: string, approvedBy: string) {
  const db = getPayrollDb();

  const { data: run, error: runErr } = await db
    .from("pay_runs")
    .select("id, employer_id, tax_year, status")
    .eq("id", runId)
    .single();
  if (runErr || !run) throw new Error("Cycle de paie introuvable.");
  if (run.status !== "draft") {
    throw new Error(`Ce cycle est déjà ${run.status} : il ne peut plus être approuvé.`);
  }

  const { data: lines, error: linesErr } = await db
    .from("pay_lines")
    .select("employee_id, ytd_snapshot")
    .eq("pay_run_id", runId);
  if (linesErr) throw new Error(`Lecture des bulletins : ${linesErr.message}`);

  for (const line of lines || []) {
    const y = line.ytd_snapshot || {};
    const { error } = await db.from("ytd").upsert(
      {
        employee_id: line.employee_id,
        tax_year: run.tax_year,
        gross_earnings: y.grossEarnings ?? 0,
        pensionable_earnings: y.pensionableEarnings ?? 0,
        insurable_earnings: y.insurableEarnings ?? 0,
        qpip_insurable_earnings: y.qpipInsurableEarnings ?? 0,
        qpp_contribution: y.qppContribution ?? 0,
        qpp_second_contribution: y.qppSecondContribution ?? 0,
        ei_contribution: y.eiContribution ?? 0,
        qpip_contribution: y.qpipContribution ?? 0,
        federal_tax: y.federalTax ?? 0,
        quebec_tax: y.quebecTax ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,tax_year" }
    );
    if (error) throw new Error(`Mise à jour du cumulatif : ${error.message}`);
  }

  const { error: updErr } = await db
    .from("pay_runs")
    .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq("id", runId);
  if (updErr) throw new Error(`Approbation : ${updErr.message}`);

  return { runId, linesApproved: (lines || []).length };
}
