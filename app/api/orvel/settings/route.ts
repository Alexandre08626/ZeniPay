export const dynamic = "force-dynamic";

// GET/PUT /api/orvel/settings — the merchant's Orvel permission switches.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { getOrvelSettings, saveOrvelSettings, PERMISSIONS } from "@/lib/orvel/permissions";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const settings = await getOrvelSettings(getSupabaseAdmin(), session.merchant_id);
  return NextResponse.json({ ...settings, catalog: PERMISSIONS });
}

export async function PUT(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({}));
  try {
    const settings = await saveOrvelSettings(getSupabaseAdmin(), session.merchant_id, {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      permissions: body.permissions && typeof body.permissions === "object" ? body.permissions : undefined,
    });
    return NextResponse.json({ ...settings, catalog: PERMISSIONS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg === "MIGRATION_REQUIRED" ? "Les permissions ne peuvent pas encore être enregistrées (migration de base de données à appliquer)." : msg },
      { status: msg === "MIGRATION_REQUIRED" ? 503 : 500 },
    );
  }
}
