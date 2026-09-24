// GET  /api/v1/payroll/runs?employer_id=   → cycles de paie de l'employeur
// POST /api/v1/payroll/runs                → crée et calcule un cycle (brouillon)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireZpSession } from "@/lib/auth/zp-session";
import { assertMember, PayrollAccessError } from "@/lib/payroll/access";
import { createPayRun } from "@/lib/payroll/pay-run";
import { getPayrollDb } from "@/lib/payroll/supabase-client";
import { availableYears } from "@/lib/payroll/rates";

function fail(e: unknown) {
  if (e instanceof PayrollAccessError) {
    return NextResponse.json({ error: { code: "forbidden", message: e.message } }, { status: e.status });
  }
  const message = e instanceof Error ? e.message : "Erreur interne.";
  return NextResponse.json({ error: { code: "payroll_error", message } }, { status: 422 });
}

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;

  const employerId = req.nextUrl.searchParams.get("employer_id");
  if (!employerId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "employer_id requis." } },
      { status: 400 }
    );
  }

  try {
    await assertMember(session.auth_user_id, employerId, "viewer");
    const db = getPayrollDb();
    const { data, error } = await db
      .from("pay_runs")
      .select("*")
      .eq("employer_id", employerId)
      .order("payment_date", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return NextResponse.json({ runs: data ?? [] });
  } catch (e) {
    return fail(e);
  }
}

const createSchema = z.object({
  employer_id: z.string().min(1),
  tax_year: z.number().int(),
  frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
  period_number: z.number().int().min(1).max(53),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inputs: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        hours: z.number().finite().min(0).max(400).optional(),
        skip: z.boolean().optional(),
        extraEarnings: z
          .array(
            z.object({
              code: z.string().min(1).max(20),
              label: z.string().min(1).max(80),
              amount: z.number().finite().min(0).max(1_000_000),
              pensionable: z.boolean().optional(),
              insurable: z.boolean().optional(),
              taxable: z.boolean().optional(),
            })
          )
          .max(20)
          .optional(),
        deductions: z
          .array(
            z.object({
              code: z.string().min(1).max(20),
              label: z.string().min(1).max(80),
              amount: z.number().finite().min(0).max(1_000_000),
              reducesTaxableIncome: z.boolean().optional(),
            })
          )
          .max(20)
          .optional(),
      })
    )
    .max(500)
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Corps JSON invalide." } },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Requête invalide.", issues: parsed.error.issues } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (!availableYears().includes(body.tax_year)) {
    return NextResponse.json(
      {
        error: {
          code: "unsupported_year",
          message: `Aucun barème de paie pour ${body.tax_year}.`,
        },
      },
      { status: 422 }
    );
  }
  if (body.period_end < body.period_start) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "La fin de période précède son début." } },
      { status: 400 }
    );
  }

  try {
    // Créer une paie engage l'entreprise : un rôle de lecture ne suffit pas.
    await assertMember(session.auth_user_id, body.employer_id, "preparer");
    const { run, draft } = await createPayRun({
      employerId: body.employer_id,
      taxYear: body.tax_year,
      frequency: body.frequency,
      periodNumber: body.period_number,
      periodStart: body.period_start,
      periodEnd: body.period_end,
      paymentDate: body.payment_date,
      inputs: body.inputs,
      createdBy: session.auth_user_id,
    });
    return NextResponse.json(
      {
        run,
        totals: draft.totals,
        lines: draft.lines.map((l) => ({
          employeeId: l.employeeId,
          employeeName: l.employeeName,
          gross: l.result.gross,
          net: l.result.net,
          totalDeductions: l.result.employee.totalDeductions,
          employerCost: l.result.employer.total,
        })),
        notes: draft.notes,
      },
      { status: 201 }
    );
  } catch (e) {
    return fail(e);
  }
}
