// POST /api/v1/payroll/calculate
//
// Calcule une paie québécoise (brut → net) sans rien enregistrer. Sert à la
// prévisualisation avant de créer un cycle de paie, et au simulateur public de
// coût d'embauche. Le calcul est déterministe : mêmes entrées, même sortie,
// ce qui permet de rejouer une paie lors d'une vérification.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculatePay } from "@/lib/payroll/calculate";
import { availableYears } from "@/lib/payroll/rates";
import { EMPTY_YTD } from "@/lib/payroll/types";

const earningSchema = z.object({
  code: z.string().min(1).max(20),
  label: z.string().min(1).max(80),
  amount: z.number().finite().min(0).max(10_000_000),
  pensionable: z.boolean().optional(),
  insurable: z.boolean().optional(),
  taxable: z.boolean().optional(),
  vacationable: z.boolean().optional(),
});

const deductionSchema = z.object({
  code: z.string().min(1).max(20),
  label: z.string().min(1).max(80),
  amount: z.number().finite().min(0).max(10_000_000),
  reducesTaxableIncome: z.boolean().optional(),
  scope: z.enum(["both", "federal", "quebec"]).optional(),
});

const ytdSchema = z.object({
  pensionableEarnings: z.number().finite().min(0),
  qppContribution: z.number().finite().min(0),
  qppSecondContribution: z.number().finite().min(0),
  insurableEarnings: z.number().finite().min(0),
  eiContribution: z.number().finite().min(0),
  qpipInsurableEarnings: z.number().finite().min(0),
  qpipContribution: z.number().finite().min(0),
  grossEarnings: z.number().finite().min(0),
  federalTax: z.number().finite().min(0),
  quebecTax: z.number().finite().min(0),
});

const bodySchema = z.object({
  year: z.number().int(),
  frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
  periodNumber: z.number().int().min(1).max(53).optional(),
  earnings: z.array(earningSchema).min(1).max(40),
  deductions: z.array(deductionSchema).max(40).optional(),
  ytd: ytdSchema.partial().optional(),
  profile: z
    .object({
      quebecCredits: z.number().finite().min(0).optional(),
      federalCredits: z.number().finite().min(0).optional(),
      additionalFederalTax: z.number().finite().min(0).optional(),
      additionalQuebecTax: z.number().finite().min(0).optional(),
      qppExempt: z.boolean().optional(),
      eiExempt: z.boolean().optional(),
      qpipExempt: z.boolean().optional(),
    })
    .optional(),
  employer: z
    .object({
      sector: z.enum(["primary_manufacturing", "other"]).optional(),
      totalAnnualPayroll: z.number().finite().min(0).optional(),
      cnesstRate: z.number().finite().min(0).max(0.5).nullable().optional(),
      eiEmployerMultiplier: z.number().finite().min(1).max(2).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Corps JSON invalide." } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Requête invalide.", issues: parsed.error.issues } },
      { status: 400 }
    );
  }

  const input = parsed.data;
  if (!availableYears().includes(input.year)) {
    return NextResponse.json(
      {
        error: {
          code: "unsupported_year",
          message: `Aucun barème de paie pour ${input.year}. Années disponibles : ${availableYears().join(", ")}.`,
        },
      },
      { status: 422 }
    );
  }

  try {
    const result = calculatePay({
      ...input,
      ytd: { ...EMPTY_YTD, ...(input.ytd || {}) },
    });
    return NextResponse.json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de calcul.";
    return NextResponse.json({ error: { code: "calculation_failed", message } }, { status: 422 });
  }
}

/** GET → années couvertes, pour que l'interface n'offre pas une année sans barème. */
export async function GET() {
  return NextResponse.json({ years: availableYears() });
}
