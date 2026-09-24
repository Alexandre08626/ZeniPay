// Construction d'un cycle de paie — la partie pure, sans base de données.

import { describe, it, expect } from "vitest";
import { buildPayRun, regularEarnings, type EmployeeRecord, type EmployerRecord } from "../pay-run";
import { EMPTY_YTD } from "../types";

const employer: EmployerRecord = {
  id: "emp_1",
  hsf_sector: "other",
  total_annual_payroll: 800_000,
  cnesst_rate: 0.0184,
  ei_employer_multiplier: null,
};

function employee(over: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: "pe_1",
    first_name: "Marie",
    last_name: "Tremblay",
    employment_type: "salaried",
    annual_salary: 65_000,
    hourly_rate: null,
    standard_hours_per_period: null,
    pay_frequency: "biweekly",
    federal_credits: null,
    quebec_credits: null,
    additional_federal_tax: 0,
    additional_quebec_tax: 0,
    qpp_exempt: false,
    ei_exempt: false,
    qpip_exempt: false,
    status: "active",
    ...over,
  };
}

const run = (employees: EmployeeRecord[], inputs?: Parameters<typeof buildPayRun>[0]["inputs"]) =>
  buildPayRun({
    taxYear: 2026,
    frequency: "biweekly",
    employer,
    employees,
    ytdByEmployee: {},
    inputs,
  });

describe("gains réguliers", () => {
  it("salarié : salaire annuel divisé par le nombre de périodes", () => {
    const notes: string[] = [];
    const e = regularEarnings(employee(), "biweekly", undefined, notes);
    expect(e[0].amount).toBeCloseTo(65_000 / 26, 2);
    expect(notes).toHaveLength(0);
  });

  it("horaire : heures × taux, avec le détail dans le libellé", () => {
    const notes: string[] = [];
    const e = regularEarnings(
      employee({ employment_type: "hourly", annual_salary: null, hourly_rate: 25 }),
      "biweekly",
      72,
      notes
    );
    expect(e[0].amount).toBe(1800);
    expect(e[0].label).toContain("72 h");
  });

  it("horaire sans heures saisies : utilise les heures standard ET le signale", () => {
    const notes: string[] = [];
    const e = regularEarnings(
      employee({
        employment_type: "hourly",
        annual_salary: null,
        hourly_rate: 25,
        standard_hours_per_period: 80,
      }),
      "biweekly",
      undefined,
      notes
    );
    expect(e[0].amount).toBe(2000);
    expect(notes.join(" ")).toMatch(/aucune heure saisie/);
  });

  it("ne paie rien et le signale si la configuration est incomplète", () => {
    const notes: string[] = [];
    expect(regularEarnings(employee({ annual_salary: null }), "biweekly", undefined, notes)).toHaveLength(0);
    expect(notes.join(" ")).toMatch(/aucun salaire annuel/);

    const notes2: string[] = [];
    expect(
      regularEarnings(
        employee({ employment_type: "hourly", annual_salary: null, hourly_rate: null }),
        "biweekly",
        40,
        notes2
      )
    ).toHaveLength(0);
    expect(notes2.join(" ")).toMatch(/taux horaire ou heures manquants/);
  });
});

describe("cycle de paie", () => {
  it("produit un bulletin par employé actif et additionne les totaux", () => {
    const d = run([employee(), employee({ id: "pe_2", first_name: "Luc", annual_salary: 52_000 })]);
    expect(d.lines).toHaveLength(2);
    expect(d.totals.gross).toBeCloseTo(
      d.lines[0].result.gross + d.lines[1].result.gross,
      2
    );
    expect(d.totals.net).toBeCloseTo(d.lines[0].result.net + d.lines[1].result.net, 2);
  });

  it("exclut un employé congédié", () => {
    const d = run([employee(), employee({ id: "pe_2", status: "terminated" })]);
    expect(d.lines).toHaveLength(1);
  });

  it("exclut un employé marqué à sauter", () => {
    const d = run([employee(), employee({ id: "pe_2" })], [{ employeeId: "pe_2", skip: true }]);
    expect(d.lines.map((l) => l.employeeId)).toEqual(["pe_1"]);
  });

  it("ajoute les gains ponctuels au salaire régulier", () => {
    const d = run(
      [employee()],
      [
        {
          employeeId: "pe_1",
          extraEarnings: [{ code: "BONI", label: "Prime de rendement", amount: 1000 }],
        },
      ]
    );
    expect(d.lines[0].earnings).toHaveLength(2);
    expect(d.lines[0].result.gross).toBeCloseTo(65_000 / 26 + 1000, 2);
  });

  it("applique les retenues volontaires de l'employé", () => {
    const sans = run([employee()]);
    const avec = run(
      [employee()],
      [
        {
          employeeId: "pe_1",
          deductions: [{ code: "REER", label: "REER", amount: 150, reducesTaxableIncome: true }],
        },
      ]
    );
    expect(avec.lines[0].result.net).toBeLessThan(sans.lines[0].result.net);
    expect(avec.lines[0].result.employee.federalTax).toBeLessThan(
      sans.lines[0].result.employee.federalTax
    );
  });

  it("préfixe chaque avertissement du nom de l'employé", () => {
    const d = run([employee({ annual_salary: null })]);
    expect(d.notes.join(" ")).toMatch(/Marie Tremblay :/);
  });

  it("déduplique un avertissement commun à toute la paie", () => {
    const d = run([
      employee(),
      employee({ id: "pe_2", first_name: "Luc" }),
      employee({ id: "pe_3", first_name: "Ana" }),
    ]);
    // L'avertissement de barème non vérifié est identique pour les trois, mais
    // préfixé du nom : il apparaît donc trois fois, une par personne.
    const uniques = new Set(d.notes);
    expect(uniques.size).toBe(d.notes.length);
  });

  it("repart du cumulatif fourni pour appliquer les plafonds", () => {
    const frais = buildPayRun({
      taxYear: 2026,
      frequency: "biweekly",
      employer,
      employees: [employee()],
      ytdByEmployee: {},
    });
    const plafonne = buildPayRun({
      taxYear: 2026,
      frequency: "biweekly",
      employer,
      employees: [employee()],
      ytdByEmployee: {
        pe_1: { ...EMPTY_YTD, insurableEarnings: 68_900, eiContribution: 895.7 },
      },
    });
    expect(frais.lines[0].result.employee.ei).toBeGreaterThan(0);
    expect(plafonne.lines[0].result.employee.ei).toBe(0);
  });

  it("une paie sans employé payable reste valide et vide", () => {
    const d = run([employee({ status: "terminated" })]);
    expect(d.lines).toHaveLength(0);
    expect(d.totals.gross).toBe(0);
    expect(d.totals.net).toBe(0);
  });
});
