// POST /api/zenipay/login
//
// Auth flow:
//   1. Try Supabase Auth (`signInWithPassword`). New banking-grade
//      signups land here — the merchant has an `auth_user_id` row in
//      `auth.users`. On success we set the `sb-access-token` +
//      `sb-refresh-token` cookies and return the merchant payload.
//   2. Fallback to the legacy hash stored in
//      `zenipay_merchants.merchant_data.password`. On success we set
//      the legacy HMAC `zp_session` cookie. This keeps merchants
//      created via the old flow working until they are migrated.
//
// Rate-limited (5 / IP / hour). The frontend never sees which path
// authenticated — both return the same shape.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { verifyPassword } from "../../../../modules/zenipay/services/auth";
import { rateLimit } from "../../../../modules/zenipay/services/rate-limit";
import { setZpSessionCookie, setSupabaseSessionCookies } from "@/lib/auth/zp-session";

interface MerchantPayload {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  plan: string;
  status: string;
  website: string;
  businessType: string;
  country: string;
  // Notes on key naming:
  //   `sandboxKey` is the underlying field still in the DB, but the
  //   client UI labels it "Test Mode" — never "sandbox".
  sandboxKey: string;
  liveKey: string;
}

function buildMerchantPayload(found: { id: string; email: string | null; sandbox_key: string | null; live_key: string | null }, md: Record<string, unknown>, fallbackEmail: string): MerchantPayload {
  return {
    id:           found.id,
    email:        (md.email as string) || found.email || fallbackEmail,
    businessName: (md.businessName as string) || "",
    ownerName:    (md.ownerName as string) || "",
    plan:         (md.plan as string) || "Starter",
    status:       (md.status as string) || "pending_kyb",
    website:      (md.website as string) || "",
    businessType: (md.businessType as string) || "",
    country:      (md.country as string) || "",
    sandboxKey:   found.sandbox_key || "",
    liveKey:      found.live_key || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!rateLimit(`login:${ip}`, 10, 600_000)) {
      return NextResponse.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
    }

    const body = await req.json();
    const rawEmail = (body.email || "").trim().toLowerCase();
    // Alias map for known email-form mismatches between what users
    // type and what's stored in zenipay_merchants. Add new entries
    // as we discover them; do NOT silently rewrite the user's input
    // for anything unrelated.
    const EMAIL_ALIASES: Record<string, string> = {
      "zenipay@zeniva.ca":     "info@zeniva.ca",
      "info@zenivatravel.com": "info@zeniva.ca",
    };
    const email = EMAIL_ALIASES[rawEmail] ?? rawEmail;
    const password = body.password || "";
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ── Path 1: Supabase Auth signInWithPassword ────────────────────
    // Use the anon key (the one the auth.* APIs accept) when available;
    // fall back to the service role key (also accepted but less
    // appropriate semantically).
    if (url && (anonKey || serviceKey)) {
      const sbClient = createClient(url, anonKey || serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: signInData, error: signInError } = await sbClient.auth.signInWithPassword({ email, password });
      if (!signInError && signInData?.session && signInData.user) {
        // Resolve merchant by auth_user_id.
        const { data: merchant } = await supabaseAdmin
          .from("zenipay_merchants")
          .select("id, email, sandbox_key, live_key, merchant_data, status")
          .eq("auth_user_id", signInData.user.id)
          .maybeSingle();
        if (merchant) {
          const md = merchant.merchant_data || {};
          const payload = buildMerchantPayload(merchant, md, email);
          // Mode is "live" when active, otherwise "test" — the FE uses
          // this to decide which key to surface as Active.
          payload.status = merchant.status || "pending_kyb";
          const res = NextResponse.json({ success: true, merchant: payload });
          setSupabaseSessionCookies(
            res,
            signInData.session.access_token,
            signInData.session.refresh_token,
            signInData.session.expires_in ?? 3600,
          );
          return res;
        }
      }
      // Fall through to legacy on signInError or no merchant link.
    }

    // ── Path 2: legacy hash stored in merchant_data.password ────────
    const { data: merchants } = await supabaseAdmin
      .from("zenipay_merchants")
      .select("id, email, merchant_data, sandbox_key, live_key, status");
    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const found = merchants.find((m: { email: string | null; merchant_data: Record<string, unknown> | null }) => {
      const mdEmail = (m.merchant_data as Record<string, unknown> | null)?.email;
      if ((typeof mdEmail === "string" ? mdEmail : "").toLowerCase() === email) return true;
      if ((m.email || "").toLowerCase() === email) return true;
      return false;
    });
    if (!found) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const md = (found.merchant_data || {}) as Record<string, unknown>;
    const storedPwd = (md.password as string) || "";
    if (!storedPwd || !(await verifyPassword(password, storedPwd))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const payload = buildMerchantPayload(found, md, email);
    payload.status = found.status || (md.status as string) || "pending_kyb";
    const res = NextResponse.json({ success: true, merchant: payload });
    // Legacy session — HMAC cookie. Mode reflects the merchant's
    // current state so the FE can render Test/Live labels.
    setZpSessionCookie(res, found.id, found.status === "active" ? "live" : "test");
    return res;
  } catch (err) {
    console.error("[Login API]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
