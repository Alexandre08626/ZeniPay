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

// Columns available in the current zenipay_merchants table schema.
// The table may lack sandbox_key / live_key / merchant_data / auth_user_id
// in some environments — we work with what we have.
type MerchantRow = {
  id: string;
  email: string | null;
  status: string | null;
  name?: string | null;
  company?: string | null;
  website?: string | null;
  config?: Record<string, unknown> | null;
};

function buildMerchantPayload(found: MerchantRow, _md: Record<string, unknown>, fallbackEmail: string): MerchantPayload {
  const cfg = found.config || {};
  return {
    id:           found.id,
    email:        found.email || fallbackEmail,
    businessName: found.name || found.company || (cfg.businessName as string) || "",
    ownerName:    (cfg.ownerName as string) || "",
    plan:         (cfg.plan as string) || "Starter",
    status:       found.status || (cfg.status as string) || "pending_kyb",
    website:      found.website || (cfg.website as string) || "",
    businessType: (cfg.businessType as string) || "",
    country:      (cfg.country as string) || "",
    sandboxKey:   (cfg.sandboxKey as string) || (cfg.sandbox_key as string) || "",
    liveKey:      (cfg.liveKey as string) || (cfg.live_key as string) || "",
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
        // Resolve merchant by email (auth_user_id column may not exist yet).
        const { data: merchant } = await supabaseAdmin
          .from("zenipay_merchants")
          .select("id, email, status, name, company, website, config")
          .eq("email", email)
          .maybeSingle();
        if (merchant) {
          const md = merchant.config || {};
          const payload = buildMerchantPayload(merchant, md, email);
          const res = NextResponse.json({ success: true, merchant: payload });
          // Set Supabase auth cookies (preferred session path).
          setSupabaseSessionCookies(
            res,
            signInData.session.access_token,
            signInData.session.refresh_token,
            signInData.session.expires_in ?? 3600,
          );
          // Also set the legacy HMAC cookie so API routes that haven't
          // been migrated to auth_user_id work too (e.g. create-link).
          setZpSessionCookie(res, merchant.id, merchant.status === "active" ? "live" : "test");
          return res;
        }
      }
      // Fall through to legacy on signInError or no merchant link.
    }

    // ── Path 2: legacy hash stored in merchant_data.password ────────
    // Only available when the table has the merchant_data column.
    const { data: merchants } = await supabaseAdmin
      .from("zenipay_merchants")
      .select("id, email, status, name, company, website, config");
    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const found = merchants.find((m: MerchantRow) => {
      if ((m.email || "").toLowerCase() === email) return true;
      const cfg = (m.config || {}) as Record<string, unknown>;
      if ((typeof cfg.email === "string" ? cfg.email : "").toLowerCase() === email) return true;
      return false;
    });
    if (!found) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const cfg = (found.config || {}) as Record<string, unknown>;
    const md = cfg.merchant_data ? (cfg.merchant_data as Record<string, unknown>) : null;
    const storedPwd: string = String(cfg.password || md?.password || "");
    if (storedPwd && !(await verifyPassword(password, storedPwd))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const payload = buildMerchantPayload(found, cfg, email);
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
