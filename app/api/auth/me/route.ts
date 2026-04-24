// GET /api/auth/me
//
// Resolves the logged-in Supabase Auth user to the merchant they own,
// plus any linked agents organization. Mobile + web clients call this
// right after sign-in to hydrate a consistent session: same merchant_id,
// same agents org id, same data surface across device.
//
// Auth: Authorization: Bearer <supabase access token>

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

async function verifyAccessToken(token: string): Promise<{ id: string; email: string | null } | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await verifyAccessToken(bearer);
  if (!user) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Prefer the auth_user_id link; fall back to email match for legacy
  // rows that were created before Supabase Auth integration shipped.
  let { data: merchant } = await db
    .from("zenipay_merchants")
    .select("id, email, business_name, country, status, onboarding_state, plan, kyb_rejection_reason")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!merchant && user.email) {
    const byEmail = await db
      .from("zenipay_merchants")
      .select("id, email, business_name, country, status, onboarding_state, plan, kyb_rejection_reason, auth_user_id")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    if (byEmail.data) {
      merchant = byEmail.data;
      // Best-effort self-heal: link the auth user id so future lookups hit the
      // fast path.
      if (!byEmail.data.auth_user_id) {
        await db.from("zenipay_merchants")
          .update({ auth_user_id: user.id })
          .eq("id", byEmail.data.id);
      }
    }
  }

  if (!merchant) {
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      merchant_id: null,
      merchant: null,
      agents_org_id: null,
    });
  }

  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    merchant_id: merchant.id,
    merchant,
    agents_org_id: mapping?.organization_id ?? null,
  });
}
