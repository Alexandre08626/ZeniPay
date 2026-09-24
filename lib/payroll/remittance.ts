// Remises aux gouvernements — Québec et fédéral.
//
// Ce que l'employeur retient sur la paie ne lui appartient pas : il le détient
// en fiducie et doit le verser à date fixe. Un retard entraîne une pénalité
// (7 % à 20 % du montant selon le retard, plus les intérêts) et la
// responsabilité personnelle des administrateurs. Le calendrier ci-dessous est
// donc la partie du module qu'il ne faut pas approximer.
//
// Deux destinataires, deux calendriers qui se ressemblent sans être identiques :
//   - Revenu Québec : impôt du Québec, RRQ, RQAP, FSS, cotisation au FDRCMO
//   - ARC : impôt fédéral, assurance-emploi
//
// La fréquence dépend de la retenue moyenne mensuelle des deux années civiles
// précédentes. Elle est attribuée par chaque administration : on la stocke sur
// l'employeur plutôt que de la déduire, parce qu'un nouvel employeur commence
// toujours mensuel quel que soit son volume.

import type { PayrollResult } from "./types";

export type RemittanceFrequency = "quarterly" | "monthly" | "twice_monthly" | "weekly";
export type Authority = "revenu_quebec" | "cra";

export interface RemittancePeriod {
  authority: Authority;
  periodStart: string; // AAAA-MM-JJ
  periodEnd: string;
  dueDate: string;
}

export interface RemittanceAmounts {
  /** Impôt du Québec + RRQ (employé et employeur) + RQAP (les deux) + FSS. */
  revenuQuebec: number;
  /** Impôt fédéral + AE (employé et employeur). */
  cra: number;
  breakdown: {
    quebecTax: number;
    qpp: number;
    qpip: number;
    healthServicesFund: number;
    federalTax: number;
    ei: number;
  };
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day));
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Reporte au jour ouvrable suivant : une échéance qui tombe un samedi est due le lundi. */
function nextBusinessDay(d: Date): Date {
  const out = new Date(d.getTime());
  while (out.getUTCDay() === 0 || out.getUTCDay() === 6) {
    out.setUTCDate(out.getUTCDate() + 1);
  }
  return out;
}

/**
 * Période de remise qui contient une date de paiement, et son échéance.
 *
 * La date qui compte est celle du VERSEMENT au salarié, pas la fin de la période
 * de travail : une paie du 1er au 15 mars versée le 2 avril se remet en avril.
 */
export function remittancePeriodFor(
  paymentDate: Date,
  frequency: RemittanceFrequency,
  authority: Authority
): RemittancePeriod {
  const y = paymentDate.getUTCFullYear();
  const m = paymentDate.getUTCMonth();
  const day = paymentDate.getUTCDate();

  let start: Date;
  let end: Date;
  let due: Date;

  switch (frequency) {
    case "quarterly": {
      // Trimestres civils, dus le 15 du mois suivant la fin du trimestre.
      const q = Math.floor(m / 3);
      start = utc(y, q * 3, 1);
      end = utc(y, q * 3 + 2, lastDayOfMonth(y, q * 3 + 2));
      due = utc(y, q * 3 + 3, 15);
      break;
    }
    case "monthly": {
      start = utc(y, m, 1);
      end = utc(y, m, lastDayOfMonth(y, m));
      due = utc(y, m + 1, 15);
      break;
    }
    case "twice_monthly": {
      // Du 1er au 15 → dû le 25 du même mois.
      // Du 16 à la fin → dû le 10 du mois suivant.
      if (day <= 15) {
        start = utc(y, m, 1);
        end = utc(y, m, 15);
        due = utc(y, m, 25);
      } else {
        start = utc(y, m, 16);
        end = utc(y, m, lastDayOfMonth(y, m));
        due = utc(y, m + 1, 10);
      }
      break;
    }
    case "weekly": {
      // Quatre quartiers de mois, dus le 3e jour ouvrable suivant la fin.
      const cuts = [7, 14, 21, lastDayOfMonth(y, m)];
      const idx = cuts.findIndex((c) => day <= c);
      const i = idx === -1 ? cuts.length - 1 : idx;
      start = utc(y, m, i === 0 ? 1 : cuts[i - 1] + 1);
      end = utc(y, m, cuts[i]);
      due = new Date(end.getTime());
      let added = 0;
      while (added < 3) {
        due.setUTCDate(due.getUTCDate() + 1);
        if (due.getUTCDay() !== 0 && due.getUTCDay() !== 6) added++;
      }
      break;
    }
  }

  return {
    authority,
    periodStart: iso(start),
    periodEnd: iso(end),
    dueDate: iso(nextBusinessDay(due)),
  };
}

/**
 * Montants à remettre pour un ensemble de paies.
 *
 * Le FSS et la CNESST ne suivent pas le même chemin : le FSS se remet avec les
 * retenues à Revenu Québec, la CNESST se paie séparément selon l'entente de
 * l'employeur avec la Commission — elle n'entre donc pas ici.
 */
export function remittanceAmounts(results: PayrollResult[]): RemittanceAmounts {
  const b = {
    quebecTax: 0,
    qpp: 0,
    qpip: 0,
    healthServicesFund: 0,
    federalTax: 0,
    ei: 0,
  };

  for (const r of results) {
    b.quebecTax += r.employee.quebecTax;
    // RRQ et RQAP : les deux parts sont remises ensemble.
    b.qpp += r.employee.qpp + r.employee.qppSecond + r.employer.qpp + r.employer.qppSecond;
    b.qpip += r.employee.qpip + r.employer.qpip;
    b.healthServicesFund += r.employer.healthServicesFund;
    b.federalTax += r.employee.federalTax;
    b.ei += r.employee.ei + r.employer.ei;
  }

  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  for (const k of Object.keys(b) as (keyof typeof b)[]) b[k] = round(b[k]);

  return {
    revenuQuebec: round(b.quebecTax + b.qpp + b.qpip + b.healthServicesFund),
    cra: round(b.federalTax + b.ei),
    breakdown: b,
  };
}

/** Jours restants avant l'échéance. Négatif = en retard. */
export function daysUntilDue(dueDate: string, today: Date = new Date()): number {
  const due = new Date(dueDate + "T00:00:00Z").getTime();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((due - now) / 86_400_000);
}

/**
 * Pénalité de Revenu Québec et de l'ARC pour une remise en retard.
 * Les deux administrations appliquent la même grille sur le montant dû.
 */
export function latePenaltyRate(daysLate: number): number {
  if (daysLate <= 0) return 0;
  if (daysLate <= 7) return 0.07;
  if (daysLate <= 14) return 0.1;
  return 0.15; // 20 % en cas de récidive dans l'année — décidé par l'administration
}
