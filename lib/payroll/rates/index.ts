import type { PayrollYearRates } from "../types";
import { RATES_2026 } from "./2026";

const BY_YEAR: Record<number, PayrollYearRates> = {
  2026: RATES_2026,
};

/**
 * Barème d'une année. Lève plutôt que de deviner : calculer une paie 2027 avec
 * les chiffres de 2026 produirait des retenues fausses sur des milliers de
 * dollars sans que personne ne s'en aperçoive avant les relevés de fin d'année.
 */
export function ratesForYear(year: number): PayrollYearRates {
  const rates = BY_YEAR[year];
  if (!rates) {
    const known = Object.keys(BY_YEAR).join(", ");
    throw new Error(
      `Aucun barème de paie pour ${year}. Années disponibles : ${known}. ` +
        `Ajoutez lib/payroll/rates/${year}.ts à partir du T4127 et du TP-1015.F avant la première paie de l'année.`
    );
  }
  return rates;
}

export function availableYears(): number[] {
  return Object.keys(BY_YEAR)
    .map(Number)
    .sort((a, b) => a - b);
}

export { RATES_2026 };
