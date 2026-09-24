// Paramètres légaux de la paie — Québec, année 2026.
//
// Une année = un fichier. On ne modifie JAMAIS un fichier d'année passée : les
// paies déjà produites doivent pouvoir être recalculées à l'identique lors d'une
// vérification de Revenu Québec ou de l'ARC.
//
// Chaque valeur porte sa source. Avant la première paie de janvier, il faut
// confirmer chaque ligne contre :
//   - ARC T4127 (Formules pour le calcul des retenues sur la paie), édition en vigueur
//   - Revenu Québec TP-1015.F (Tables des retenues à la source) et guide TP-1015.G
//   - Retraite Québec (RRQ), RQAP, et la Commission de l'assurance-emploi
//
// `verifiedOn` indique la dernière vérification humaine contre ces documents.
// Le moteur refuse de calculer une paie dont l'année n'a pas de barème (voir
// `lib/payroll/rates/index.ts`) plutôt que de deviner.

import type { PayrollYearRates } from "../types";

export const RATES_2026: PayrollYearRates = {
  year: 2026,
  jurisdiction: "QC",
  verifiedOn: null, // ⚠️ à remplir après vérification ligne par ligne des sources ci-dessus

  // ---------------------------------------------------------------------------
  // RRQ — Régime de rentes du Québec (Retraite Québec)
  // Régime de base + régime supplémentaire (1er volet), puis RRQ2 (2e volet).
  // ---------------------------------------------------------------------------
  qpp: {
    // Maximum des gains admissibles (MGA)
    maxPensionableEarnings: 74_600,
    // Maximum supplémentaire des gains admissibles (MSGA) — 2e volet
    additionalMaxPensionableEarnings: 85_000,
    // Exemption générale annuelle
    basicExemption: 3_500,
    // Taux employé = base (5,30 %) + 1er volet supplémentaire (1,00 %)
    employeeRate: 0.063,
    // L'employeur verse le même montant que l'employé
    employerRate: 0.063,
    // 2e volet (RRQ2) : sur les gains entre le MGA et le MSGA
    secondRate: 0.04,
    // Cotisations maximales, utilisées comme plafond de sécurité du calcul
    maxEmployeeContribution: 4_479.3, // (74 600 − 3 500) × 6,30 %
    maxEmployeeSecondContribution: 416.0, // (85 000 − 74 600) × 4,00 %
  },

  // ---------------------------------------------------------------------------
  // AE — Assurance-emploi, taux réduit du Québec (le Québec administre le RQAP)
  // ---------------------------------------------------------------------------
  ei: {
    maxInsurableEarnings: 68_900,
    employeeRate: 0.013, // 1,30 $ par 100 $
    // L'employeur paie 1,4 × la part de l'employé, sauf réduction accordée par
    // l'assurance-emploi pour un régime d'assurance-salaire admissible.
    employerMultiplier: 1.4,
    maxEmployeeContribution: 895.7,
  },

  // ---------------------------------------------------------------------------
  // RQAP — Régime québécois d'assurance parentale
  // ---------------------------------------------------------------------------
  qpip: {
    maxInsurableEarnings: 103_000,
    employeeRate: 0.0043,
    employerRate: 0.00602,
    maxEmployeeContribution: 442.9,
    maxEmployerContribution: 620.06,
  },

  // ---------------------------------------------------------------------------
  // Impôt fédéral — retenue à la source (T4127)
  // Les montants sont annuels ; le moteur annualise le salaire de la période.
  // ---------------------------------------------------------------------------
  federalTax: {
    brackets: [
      { upTo: 58_523, rate: 0.14 },
      { upTo: 117_045, rate: 0.205 },
      { upTo: 181_440, rate: 0.26 },
      { upTo: 258_482, rate: 0.29 },
      { upTo: null, rate: 0.33 },
    ],
    lowestRate: 0.14,
    // Montant personnel de base : plein jusqu'à 181 440 $, réduit linéairement
    // jusqu'au minimum à 258 482 $.
    basicPersonalAmountMax: 16_452,
    basicPersonalAmountMin: 14_829,
    bpaPhaseOutStart: 181_440,
    bpaPhaseOutEnd: 258_482,
    // Montant canadien pour emploi
    canadaEmploymentAmount: 1_501,
    // Abattement du Québec : l'impôt fédéral retenu est réduit de 16,5 %
    quebecAbatementRate: 0.165,
  },

  // ---------------------------------------------------------------------------
  // Impôt du Québec — retenue à la source (TP-1015.F / TP-1015.G)
  // ---------------------------------------------------------------------------
  quebecTax: {
    brackets: [
      { upTo: 54_345, rate: 0.14 },
      { upTo: 108_680, rate: 0.19 },
      { upTo: 132_245, rate: 0.24 },
      { upTo: null, rate: 0.2575 },
    ],
    lowestRate: 0.14,
    // Montant personnel de base (code A du TP-1015.3)
    basicPersonalAmount: 18_952,
    // Déduction pour travailleur : 6 % du revenu d'emploi, plafonnée
    workerDeductionRate: 0.06,
    workerDeductionMax: 1_450,
  },

  // ---------------------------------------------------------------------------
  // FSS — Fonds des services de santé (cotisation de l'employeur)
  // Le taux dépend de la masse salariale totale et du secteur d'activité.
  // Sous 1 M$ : taux plancher. Entre 1 M$ et le seuil : interpolation linéaire.
  // Au-dessus du seuil : taux plafond.
  // ---------------------------------------------------------------------------
  healthServicesFund: {
    thresholdPayroll: 7_800_000,
    maxRate: 0.0426,
    // Secteurs primaire et manufacturier (≥ 50 % des activités)
    primaryAndManufacturing: { minRate: 0.0125, slope: 0.004427, intercept: 0.008073 },
    // Tous les autres secteurs
    otherSectors: { minRate: 0.0165, slope: 0.003838, intercept: 0.012662 },
  },

  // ---------------------------------------------------------------------------
  // CNESST — la prime dépend de l'unité de classification de CHAQUE employeur.
  // Aucun taux par défaut ne serait honnête ici : il est saisi par l'employeur
  // depuis son avis de cotisation, et le moteur ne calcule rien sans lui.
  // ---------------------------------------------------------------------------
  cnesst: {
    // Maximum annuel assurable par travailleur
    maxAssessableEarnings: 98_000,
    defaultRate: null,
  },

  // ---------------------------------------------------------------------------
  // Normes du travail (Loi sur les normes du travail) — vacances et salaire minimum
  // ---------------------------------------------------------------------------
  labourStandards: {
    minimumWage: 16.1,
    minimumWageTipped: 12.9,
    // Indemnité de congé annuel : 4 % avant 3 ans de service continu, 6 % après.
    vacationRateUnder3Years: 0.04,
    vacationRate3YearsPlus: 0.06,
    vacationSeniorityYears: 3,
  },
};
