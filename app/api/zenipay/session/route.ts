export const dynamic = "force-dynamic";

// GET /api/zenipay/session — which merchant the session cookie belongs to.
// The dashboard compares it with the merchant id it keeps in sessionStorage;
// after logging into another account the two diverge and every data call is
// (correctly) refused as cross-tenant, which left the pages empty.

import { NextRequest, NextResponse } from "next/server";
import { getZpSession } from "@/lib/auth/zp-session";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const s = await getZpSession(req);
  if (!s) return NextResponse.json({ authenticated: false }, { status: 401 });
  const { data: m } = await getSupabaseAdmin().from("zenipay_merchants").select("id, email, name, company, config").eq("id", s.merchant_id).maybeSingle();
  const cfg = ((m?.config || {}) as Record<string, unknown>);
  return NextResponse.json({
    authenticated: true,
    merchant_id: s.merchant_id,
    email: String(m?.email || cfg.email || ""),
    business_name: String(cfg.businessName || cfg.business_name || m?.name || m?.company || ""),
  }, { headers: { "Cache-Control": "no-store" } });
}
