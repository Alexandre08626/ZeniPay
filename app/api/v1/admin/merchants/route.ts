// GET /api/v1/admin/merchants
// Admin-only — lists every merchant for the KYB review console.
// Authorization: whitelist of operator emails passed via x-admin-email
// header (matches the pattern used by /admin/merchants client). Good
// enough for a single-operator bootstrap; swap to Supabase Auth + a
// role claim once multi-admin support lands.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_merchants")
    .select("id, business_name, email, status, onboarding_state, plan, country, kyb_submitted_at, kyb_approved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ merchants: data ?? [] });
}
