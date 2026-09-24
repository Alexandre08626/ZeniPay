// Contrôle de vraisemblance du moteur de paie : on déroule une année complète
// pour quelques salaires typiques et on imprime le net. À comparer à la main
// avec WebRAS (Revenu Québec) avant la première paie réelle.
import { calculatePay } from "../lib/payroll/calculate";
import { EMPTY_YTD } from "../lib/payroll/types";

const salaires = [35_000, 60_000, 90_000, 150_000];
const periodes = 26;

for (const annuel of salaires) {
  const brutPeriode = annuel / periodes;
  let ytd = EMPTY_YTD;
  let net = 0, fed = 0, qc = 0, rrq = 0, ae = 0, rqap = 0, employeur = 0;
  for (let i = 0; i < periodes; i++) {
    const r = calculatePay({
      year: 2026,
      frequency: "biweekly",
      earnings: [{ code: "REG", label: "Salaire", amount: brutPeriode }],
      ytd,
      employer: { sector: "other", totalAnnualPayroll: 800_000, cnesstRate: 0.0184 },
    });
    ytd = r.ytd;
    net += r.net; fed += r.employee.federalTax; qc += r.employee.quebecTax;
    rrq += r.employee.qpp + r.employee.qppSecond; ae += r.employee.ei; rqap += r.employee.qpip;
    employeur += r.employer.total;
  }
  const pct = (v: number) => ((v / annuel) * 100).toFixed(1) + "%";
  console.log(
    `${annuel.toLocaleString("fr-CA")} $/an → net ${Math.round(net).toLocaleString("fr-CA")} $ (${pct(net)})` +
    ` | féd ${Math.round(fed)} $ · QC ${Math.round(qc)} $ · RRQ ${Math.round(rrq)} $ · AE ${Math.round(ae)} $ · RQAP ${Math.round(rqap)} $` +
    ` | coût employeur +${Math.round(employeur)} $ (${pct(employeur)})`
  );
}
