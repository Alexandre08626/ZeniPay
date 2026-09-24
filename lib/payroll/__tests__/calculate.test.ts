// Vérification du moteur de paie québécois.
//
// Ces tests protègent les propriétés qu'on ne peut pas se permettre de casser :
// plafonds annuels, exemptions, assiettes, arrondis. Les montants d'impôt exacts
// devront être confrontés aux tables officielles (TP-1015.F, T4032QC) avant la
// première paie réelle — un test ne remplace pas cette vérification, il empêche
// seulement une régression silencieuse entre deux versions du code.

import { describe, it, expect } from "vitest";
import { calculatePay, healthServicesFundRate, roundCents, taxFromBrackets, vacationPay, federalBpa } from "../calculate";
import { ratesForYear, availableYears } from "../rates";
import { EMPTY_YTD, type PayrollInput } from "../types";

const RATES = ratesForYear(2026);

function salary(amount: number, extra: Partial<PayrollInput> = {}): PayrollInput {
  return {
    year: 2026,
    frequency: "biweekly",
    earnings: [{ code: "REG", label: "Salaire régulier", amount }],
    employer: { sector: "other", totalAnnualPayroll: 500_000, cnesstRate: 0.0184 },
    ...extra,
  };
}

describe("barèmes", () => {
  it("expose 2026 et refuse une année inconnue plutôt que de deviner", () => {
    expect(availableYears()).toContain(2026);
    expect(() => ratesForYear(2031)).toThrow(/Aucun barème de paie pour 2031/);
  });

  it("signale un barème non vérifié contre les publications officielles", () => {
    const r = calculatePay(salary(2000));
    if (!RATES.verifiedOn) {
      expect(r.notes.join(" ")).toMatch(/non vérifié/);
    }
  });
});

describe("assiettes et cotisations", () => {
  it("applique l'exemption RRQ répartie sur les périodes", () => {
    const r = calculatePay(salary(2000));
    const periodExemption = RATES.qpp.basicExemption / 26;
    const expected = roundCents((2000 - periodExemption) * RATES.qpp.employeeRate);
    expect(r.employee.qpp).toBeCloseTo(expected, 2);
  });

  it("l'employeur verse le même montant que l'employé au RRQ", () => {
    const r = calculatePay(salary(2000));
    expect(r.employer.qpp).toBe(r.employee.qpp);
    expect(r.employer.qppSecond).toBe(r.employee.qppSecond);
  });

  it("calcule l'AE au taux réduit du Québec et 1,4× pour l'employeur", () => {
    const r = calculatePay(salary(2000));
    expect(r.employee.ei).toBeCloseTo(roundCents(2000 * RATES.ei.employeeRate), 2);
    expect(r.employer.ei).toBeCloseTo(roundCents(r.employee.ei * 1.4), 2);
  });

  it("calcule le RQAP aux deux taux distincts", () => {
    const r = calculatePay(salary(2000));
    expect(r.employee.qpip).toBeCloseTo(roundCents(2000 * RATES.qpip.employeeRate), 2);
    expect(r.employer.qpip).toBeCloseTo(roundCents(2000 * RATES.qpip.employerRate), 2);
  });

  it("un gain non assujetti sort des assiettes mais reste dans le brut", () => {
    const r = calculatePay({
      ...salary(0),
      earnings: [
        { code: "REG", label: "Salaire", amount: 2000 },
        { code: "ALLOC", label: "Allocation non assujettie", amount: 500, pensionable: false, insurable: false, taxable: false },
      ],
    });
    expect(r.gross).toBe(2500);
    expect(r.employee.ei).toBeCloseTo(roundCents(2000 * RATES.ei.employeeRate), 2);
  });
});

describe("plafonds annuels", () => {
  it("cesse les cotisations RRQ quand le maximum est atteint", () => {
    const r = calculatePay(
      salary(3000, {
        ytd: { ...EMPTY_YTD, pensionableEarnings: 74_000, qppContribution: RATES.qpp.maxEmployeeContribution },
      })
    );
    expect(r.employee.qpp).toBe(0);
    expect(r.notes.join(" ")).toMatch(/RRQ atteint/);
  });

  it("bascule sur le RRQ2 au-dessus du maximum des gains admissibles", () => {
    const r = calculatePay(
      salary(3000, {
        ytd: {
          ...EMPTY_YTD,
          pensionableEarnings: RATES.qpp.maxPensionableEarnings,
          qppContribution: RATES.qpp.maxEmployeeContribution,
        },
      })
    );
    expect(r.employee.qpp).toBe(0);
    expect(r.employee.qppSecond).toBeCloseTo(roundCents(3000 * RATES.qpp.secondRate), 2);
  });

  it("arrête le RRQ2 au maximum supplémentaire", () => {
    const r = calculatePay(
      salary(5000, {
        ytd: {
          ...EMPTY_YTD,
          pensionableEarnings: RATES.qpp.additionalMaxPensionableEarnings,
          qppContribution: RATES.qpp.maxEmployeeContribution,
          qppSecondContribution: RATES.qpp.maxEmployeeSecondContribution,
        },
      })
    );
    expect(r.employee.qpp).toBe(0);
    expect(r.employee.qppSecond).toBe(0);
  });

  it("cesse l'AE au maximum des gains assurables", () => {
    const r = calculatePay(
      salary(3000, {
        ytd: {
          ...EMPTY_YTD,
          insurableEarnings: RATES.ei.maxInsurableEarnings,
          eiContribution: RATES.ei.maxEmployeeContribution,
        },
      })
    );
    expect(r.employee.ei).toBe(0);
    expect(r.employer.ei).toBe(0);
  });

  it("ne dépasse jamais le maximum annuel, même sur une paie unique énorme", () => {
    const r = calculatePay(salary(200_000, { frequency: "monthly" }));
    expect(r.employee.qpp).toBeLessThanOrEqual(RATES.qpp.maxEmployeeContribution);
    expect(r.employee.qppSecond).toBeLessThanOrEqual(RATES.qpp.maxEmployeeSecondContribution);
    expect(r.employee.ei).toBeLessThanOrEqual(RATES.ei.maxEmployeeContribution);
    expect(r.employee.qpip).toBeLessThanOrEqual(RATES.qpip.maxEmployeeContribution);
  });

  it("un employé exempté ne cotise pas", () => {
    const r = calculatePay(salary(2000, { profile: { qppExempt: true, eiExempt: true, qpipExempt: true } }));
    expect(r.employee.qpp + r.employee.ei + r.employee.qpip).toBe(0);
    expect(r.employer.qpp + r.employer.ei + r.employer.qpip).toBe(0);
  });
});

describe("impôt", () => {
  it("applique le barème progressif palier par palier", () => {
    const b = RATES.quebecTax.brackets;
    const firstCeiling = b[0].upTo as number;
    expect(taxFromBrackets(firstCeiling, b)).toBeCloseTo(firstCeiling * b[0].rate, 6);
    const inSecond = firstCeiling + 1000;
    expect(taxFromBrackets(inSecond, b)).toBeCloseTo(firstCeiling * b[0].rate + 1000 * b[1].rate, 6);
  });

  it("retire le montant personnel de base fédéral dans la zone de retrait", () => {
    const f = RATES.federalTax;
    expect(federalBpa(50_000, RATES)).toBe(f.basicPersonalAmountMax);
    expect(federalBpa(300_000, RATES)).toBe(f.basicPersonalAmountMin);
    const middle = federalBpa((f.bpaPhaseOutStart + f.bpaPhaseOutEnd) / 2, RATES);
    expect(middle).toBeGreaterThan(f.basicPersonalAmountMin);
    expect(middle).toBeLessThan(f.basicPersonalAmountMax);
  });

  it("ne retient aucun impôt sous les montants personnels de base", () => {
    // 300 $ aux deux semaines ≈ 7 800 $ par année : sous les deux montants de base.
    const r = calculatePay(salary(300));
    expect(r.employee.federalTax).toBe(0);
    expect(r.employee.quebecTax).toBe(0);
  });

  it("retient plus d'impôt au Québec qu'au fédéral sur un salaire courant", () => {
    // L'abattement de 16,5 % rend la retenue fédérale nettement plus faible.
    const r = calculatePay(salary(2500));
    expect(r.employee.quebecTax).toBeGreaterThan(r.employee.federalTax);
  });

  it("l'impôt croît avec le salaire", () => {
    const low = calculatePay(salary(1500));
    const high = calculatePay(salary(4000));
    expect(high.employee.federalTax).toBeGreaterThan(low.employee.federalTax);
    expect(high.employee.quebecTax).toBeGreaterThan(low.employee.quebecTax);
  });

  it("la retenue supplémentaire demandée par l'employé s'ajoute", () => {
    const base = calculatePay(salary(2500));
    const extra = calculatePay(salary(2500, { profile: { additionalFederalTax: 50, additionalQuebecTax: 25 } }));
    expect(extra.employee.federalTax).toBeCloseTo(base.employee.federalTax + 50, 2);
    expect(extra.employee.quebecTax).toBeCloseTo(base.employee.quebecTax + 25, 2);
  });

  it("une cotisation REER avant impôt réduit l'impôt, pas les cotisations sociales", () => {
    const base = calculatePay(salary(2500));
    const withRrsp = calculatePay(
      salary(2500, {
        deductions: [{ code: "REER", label: "REER collectif", amount: 200, reducesTaxableIncome: true }],
      })
    );
    expect(withRrsp.employee.federalTax).toBeLessThan(base.employee.federalTax);
    expect(withRrsp.employee.quebecTax).toBeLessThan(base.employee.quebecTax);
    expect(withRrsp.employee.qpp).toBe(base.employee.qpp);
    expect(withRrsp.employee.ei).toBe(base.employee.ei);
  });

  it("la fréquence de paie ne change pas l'impôt annuel", () => {
    const weekly = calculatePay(salary(1000, { frequency: "weekly" }));
    const biweekly = calculatePay(salary(2000, { frequency: "biweekly" }));
    expect(weekly.employee.federalTax * 52).toBeCloseTo(biweekly.employee.federalTax * 26, 0);
    expect(weekly.employee.quebecTax * 52).toBeCloseTo(biweekly.employee.quebecTax * 26, 0);
  });
});

describe("cotisations de l'employeur", () => {
  it("applique le taux plancher du FSS sous 1 M$ de masse salariale", () => {
    expect(healthServicesFundRate(RATES, 500_000, "other")).toBe(RATES.healthServicesFund.otherSectors.minRate);
    expect(healthServicesFundRate(RATES, 500_000, "primary_manufacturing")).toBe(
      RATES.healthServicesFund.primaryAndManufacturing.minRate
    );
  });

  it("atteint le taux plafond du FSS au seuil et au-delà", () => {
    const threshold = RATES.healthServicesFund.thresholdPayroll;
    expect(healthServicesFundRate(RATES, threshold, "other")).toBeCloseTo(RATES.healthServicesFund.maxRate, 4);
    expect(healthServicesFundRate(RATES, threshold * 3, "other")).toBe(RATES.healthServicesFund.maxRate);
  });

  it("interpole le FSS entre 1 M$ et le seuil", () => {
    const mid = healthServicesFundRate(RATES, 4_000_000, "other");
    expect(mid).toBeGreaterThan(RATES.healthServicesFund.otherSectors.minRate);
    expect(mid).toBeLessThan(RATES.healthServicesFund.maxRate);
  });

  it("ne calcule aucune prime CNESST sans taux et le dit", () => {
    const r = calculatePay({ ...salary(2000), employer: { sector: "other", totalAnnualPayroll: 500_000 } });
    expect(r.employer.cnesst).toBeNull();
    expect(r.notes.join(" ")).toMatch(/CNESST/);
  });

  it("plafonne la CNESST au maximum assurable annuel", () => {
    const r = calculatePay(
      salary(5000, { ytd: { ...EMPTY_YTD, grossEarnings: RATES.cnesst.maxAssessableEarnings } })
    );
    expect(r.employer.cnesst).toBe(0);
  });
});

describe("résultat global", () => {
  it("net = brut − retenues, et le total des retenues est cohérent", () => {
    const r = calculatePay(salary(2500));
    const sum = roundCents(
      r.employee.qpp + r.employee.qppSecond + r.employee.ei + r.employee.qpip + r.employee.federalTax + r.employee.quebecTax + r.employee.otherDeductions
    );
    expect(r.employee.totalDeductions).toBeCloseTo(sum, 2);
    expect(r.net).toBeCloseTo(roundCents(r.gross - r.employee.totalDeductions), 2);
  });

  it("le net reste inférieur au brut et positif sur une paie normale", () => {
    const r = calculatePay(salary(2500));
    expect(r.net).toBeGreaterThan(0);
    expect(r.net).toBeLessThan(r.gross);
  });

  it("reporte le cumulatif pour la période suivante", () => {
    const first = calculatePay(salary(2000));
    const second = calculatePay(salary(2000, { ytd: first.ytd }));
    expect(second.ytd.grossEarnings).toBe(4000);
    expect(second.ytd.qppContribution).toBeCloseTo(first.employee.qpp * 2, 2);
  });

  it("26 périodes de suite ne dépassent aucun maximum annuel", () => {
    let ytd = EMPTY_YTD;
    let qpp = 0;
    let ei = 0;
    let qpip = 0;
    for (let i = 0; i < 26; i++) {
      const r = calculatePay(salary(4200, { ytd }));
      ytd = r.ytd;
      qpp += r.employee.qpp;
      ei += r.employee.ei;
      qpip += r.employee.qpip;
    }
    expect(qpp).toBeLessThanOrEqual(RATES.qpp.maxEmployeeContribution + 0.05);
    expect(ei).toBeLessThanOrEqual(RATES.ei.maxEmployeeContribution + 0.05);
    expect(qpip).toBeLessThanOrEqual(RATES.qpip.maxEmployeeContribution + 0.05);
  });

  it("un salaire au maximum atteint exactement les cotisations maximales sur l'année", () => {
    let ytd = EMPTY_YTD;
    let qpp = 0;
    let ei = 0;
    for (let i = 0; i < 26; i++) {
      const r = calculatePay(salary(6000, { ytd }));
      ytd = r.ytd;
      qpp += r.employee.qpp;
      ei += r.employee.ei;
    }
    expect(qpp).toBeCloseTo(RATES.qpp.maxEmployeeContribution, 1);
    expect(ei).toBeCloseTo(RATES.ei.maxEmployeeContribution, 1);
  });
});

describe("indemnité de congé annuel", () => {
  it("4 % avant 3 ans de service, 6 % après", () => {
    expect(vacationPay(50_000, 1, 2026)).toBe(2000);
    expect(vacationPay(50_000, 3, 2026)).toBe(3000);
    expect(vacationPay(50_000, 10, 2026)).toBe(3000);
  });
});
