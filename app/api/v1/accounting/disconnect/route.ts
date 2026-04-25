// POST /api/v1/accounting/disconnect?merchant_id=&provider=
//
// Sets the accounting connection row to status='disconnected'. No-op
// when the table doesn't exist yet (returns success so the UI can
// keep working).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";

export async function POST(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  const provider   = req.nextUrl.searchParams.get("provider")?.trim();
  if (!merchantId || !provider) {
    return NextResponse.json({ error: { code: "bad_request", message: "missing_fields" } }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  try {
    await db.from("zenipay_accounting_connections")
      .update({ status: "disconnected" })
      .eq("merchant_id", merchantId)
      .eq("provider", provider);
  } catch { /* swallow — table may not exist yet */ }

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "accounting.disconnected",
    resource_type: "zenipay_accounting_connections",
    resource_id: provider,
    severity: "info",
  });

  return NextResponse.json({ success: true });
}
