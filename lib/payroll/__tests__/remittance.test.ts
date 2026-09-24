// Calendrier et montants des remises.
//
// Une échéance ratée coûte 7 % à 15 % du montant dû, plus les intérêts. Ces
// tests figent les dates de chaque fréquence pour qu'un refactor ne les déplace
// pas en silence.

import { describe, it, expect } from "vitest";
import {
  daysUntilDue,
  latePenaltyRate,
  remittanceAmounts,
  remittancePeriodFor,
} from "../remittance";
import { calculatePay } from "../calculate";
import type { PayrollResult } from "../types";

const d = (s: string) => new Date(s + "T12:00:00Z");

describe("périodes de remise", () => {
  it("mensuel : le mois civil, dû le 15 du mois suivant", () => {
    const p = remittancePeriodFor(d("2026-03-18"), "monthly", "revenu_quebec");
    expect(p.periodStart).toBe("2026-03-01");
    expect(p.periodEnd).toBe("2026-03-31");
    expect(p.dueDate).toBe("2026-04-15");
  });

  it("trimestriel : le trimestre civil, dû le 15 du mois suivant", () => {
    const p = remittancePeriodFor(d("2026-02-10"), "quarterly", "cra");
    expect(p.periodStart).toBe("2026-01-01");
    expect(p.periodEnd).toBe("2026-03-31");
    expect(p.dueDate).toBe("2026-04-15");
  });

  it("bimensuel : première quinzaine due le 25 du même mois", () => {
    const p = remittancePeriodFor(d("2026-05-07"), "twice_monthly", "revenu_quebec");
    expect(p.periodStart).toBe("2026-05-01");
    expect(p.periodEnd).toBe("2026-05-15");
    expect(p.dueDate).toBe("2026-05-25");
  });

  it("bimensuel : seconde quinzaine due le 10 du mois suivant", () => {
    const p = remittancePeriodFor(d("2026-05-22"), "twice_monthly", "revenu_quebec");
    expect(p.periodStart).toBe("2026-05-16");
    expect(p.periodEnd).toBe("2026-05-31");
    expect(p.dueDate).toBe("2026-06-10");
  });

  it("hebdomadaire : quartiers de mois, dû le 3e jour ouvrable suivant", () => {
    const p = remittancePeriodFor(d("2026-04-09"), "weekly", "cra");
    expect(p.periodStart).toBe("2026-04-08");
    expect(p.periodEnd).toBe("2026-04-14");
    // 15 avril (mer), 16 (jeu), 17 (ven) → 3 jours ouvrables
    expect(p.dueDate).toBe("2026-04-17");
  });

  it("reporte une échéance de fin de semaine au lundi", () => {
    // Le 15 novembre 2026 est un dimanche.
    const p = remittancePeriodFor(d("2026-10-20"), "monthly", "cra");
    expect(p.periodEnd).toBe("2026-10-31");
    expect(new Date(p.dueDate + "T00:00:00Z").getUTCDay()).not.toBe(0);
    expect(new Date(p.dueDate + "T00:00:00Z").getUTCDay()).not.toBe(6);
  });

  it("traverse correctement la fin d'année", () => {
    const p = remittancePeriodFor(d("2026-12-24"), "monthly", "revenu_quebec");
    expect(p.periodStart).toBe("2026-12-01");
    expect(p.periodEnd).toBe("2026-12-31");
    expect(p.dueDate).toBe("2027-01-15");
  });

  it("gère février d'une année bissextile", () => {
    const p = remittancePeriodFor(d("2028-02-20"), "monthly", "cra");
    expect(p.periodEnd).toBe("2028-02-29");
  });

  it("c'est la date de VERSEMENT qui détermine la période", () => {
    // Une paie de mars versée le 2 avril se remet en avril.
    const p = remittancePeriodFor(d("2026-04-02"), "monthly", "revenu_quebec");
    expect(p.periodStart).toBe("2026-04-01");
  });
});

describe("montants à remettre", () => {
  const paie = (brut: number): PayrollResult =>
    calculatePay({
      year: 2026,
      frequency: "biweekly",
      earnings: [{ code: "REG", label: "Salaire", amount: brut }],
      employer: { sector: "other", totalAnnualPayroll: 500_000, cnesstRate: 0.0184 },
    });

  it("sépare ce qui va à Revenu Québec de ce qui va à l'ARC", () => {
    const r = paie(2500);
    const a = remittanceAmounts([r]);

    // Revenu Québec : impôt QC + RRQ (deux parts) + RQAP (deux parts) + FSS
    expect(a.breakdown.quebecTax).toBeCloseTo(r.employee.quebecTax, 2);
    expect(a.breakdown.qpp).toBeCloseTo(r.employee.qpp + r.employer.qpp, 2);
    expect(a.breakdown.qpip).toBeCloseTo(r.employee.qpip + r.employer.qpip, 2);
    expect(a.breakdown.healthServicesFund).toBeCloseTo(r.employer.healthServicesFund, 2);

    // ARC : impôt fédéral + AE (deux parts)
    expect(a.breakdown.federalTax).toBeCloseTo(r.employee.federalTax, 2);
    expect(a.breakdown.ei).toBeCloseTo(r.employee.ei + r.employer.ei, 2);
  });

  it("n'inclut pas la CNESST : elle se paie séparément", () => {
    const r = paie(2500);
    const a = remittanceAmounts([r]);
    const total = a.revenuQuebec + a.cra;
    expect(r.employer.cnesst).toBeGreaterThan(0);
    expect(total).toBeLessThan(
      r.employee.totalDeductions + r.employer.total + 0.01
    );
    expect(JSON.stringify(a.breakdown)).not.toMatch(/cnesst/i);
  });

  it("additionne plusieurs employés", () => {
    const un = remittanceAmounts([paie(2000)]);
    const deux = remittanceAmounts([paie(2000), paie(2000)]);
    expect(deux.revenuQuebec).toBeCloseTo(un.revenuQuebec * 2, 1);
    expect(deux.cra).toBeCloseTo(un.cra * 2, 1);
  });

  it("une liste vide ne doit rien", () => {
    const a = remittanceAmounts([]);
    expect(a.revenuQuebec).toBe(0);
    expect(a.cra).toBe(0);
  });
});

describe("échéances et pénalités", () => {
  it("compte les jours restants et détecte le retard", () => {
    expect(daysUntilDue("2026-04-15", d("2026-04-10"))).toBe(5);
    expect(daysUntilDue("2026-04-15", d("2026-04-15"))).toBe(0);
    expect(daysUntilDue("2026-04-15", d("2026-04-20"))).toBe(-5);
  });

  it("applique la grille de pénalité par tranche de retard", () => {
    expect(latePenaltyRate(0)).toBe(0);
    expect(latePenaltyRate(3)).toBe(0.07);
    expect(latePenaltyRate(7)).toBe(0.07);
    expect(latePenaltyRate(8)).toBe(0.1);
    expect(latePenaltyRate(14)).toBe(0.1);
    expect(latePenaltyRate(15)).toBe(0.15);
    expect(latePenaltyRate(60)).toBe(0.15);
  });
});
