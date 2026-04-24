// Supabase Auth session resolvers.
//
// `getMerchantSession(req)` reads the Supabase access token from the
// request's `Authorization: Bearer ...` header or the `sb-access-token`
// cookie, verifies it against Supabase, then resolves to the linked
// merchant row via `zenipay_merchants.auth_user_id`. Falls back to
// `null` if no session is present — the caller decides how to react.
//
// `requireMerchantSession(req)` returns the session or a Response with
// the appropriate 401 / 403 / 402-style status so handlers can early
// return.
//
// Intentionally additive: this does NOT migrate existing
// sessionStorage-based flows. Routes that need the new auth import
// these helpers explicitly.

import { NextRequest, NextResponse } from "next/server";
import { createClient, User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export interface MerchantSession {
  user: User;
  merchant_id: string;
  merchant: {
    id: string;
    email: string | null;
    business_name: string | null;
    status: string;
    onboarding_state: string | null;
  };
  pending: boolean; // true when status = 'pending_kyb'
}

function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function verifyAccessToken(token: string): Promise<User | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function getMerchantSession(req: NextRequest): Promise<MerchantSession | null> {
  const token = parseBearer(req.headers.get("authorization"))
             ?? req.cookies.get("sb-access-token")?.value
             ?? null;
  if (!token) return null;
  const user = await verifyAccessToken(token);
  if (!user) return null;

  const { data: merchant } = await getSupabaseAdmin()
    .from("zenipay_merchants")
    .select("id, email, business_name, status, onboarding_state")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!merchant) return null;

  return {
    user,
    merchant_id: merchant.id,
    merchant,
    pending: merchant.status === "pending_kyb",
  };
}

export async function requireMerchantSession(req: NextRequest): Promise<MerchantSession | Response> {
  const session = await getMerchantSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.merchant.status === "rejected" || session.merchant.status === "closed") {
    return NextResponse.json({ error: `account_${session.merchant.status}` }, { status: 403 });
  }
  return session;
}
