// POST /api/v1/payroll/runs/[id]/approve
//
// L'approbation est le point de non-retour : le cycle devient immuable et le
// cumulatif annuel de chaque employé avance. C'est aussi à partir de là que les
// remises deviennent exigibles. Réservé aux rôles admin et propriétaire — celui
// qui prépare la paie ne devrait pas être celui qui l'approuve.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireZpSession } from "@/lib/auth/zp-session";
import { assertMember, employerIdForRun, PayrollAccessError } from "@/lib/payroll/access";
import { approvePayRun } from "@/lib/payroll/pay-run";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const employerId = await employerIdForRun(params.id);
    await assertMember(session.auth_user_id, employerId, "admin");
    const result = await approvePayRun(params.id, session.auth_user_id as string);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PayrollAccessError) {
      return NextResponse.json(
        { error: { code: "forbidden", message: e.message } },
        { status: e.status }
      );
    }
    const message = e instanceof Error ? e.message : "Approbation impossible.";
    return NextResponse.json({ error: { code: "payroll_error", message } }, { status: 422 });
  }
}
