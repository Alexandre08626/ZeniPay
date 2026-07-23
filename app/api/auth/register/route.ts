// POST /api/auth/register
//
// Banking-grade signup. Creates a Supabase Auth user, inserts the
// merchant row (status='pending_kyb'), seeds a primary business
// account with a ZP account number, generates BOTH a test key and a
// live key (live_key activates automatically once an admin approves
// KYB), and finally signs the new user in so the response carries
// the Supabase session cookies.
//
// Rate limit: 5 / IP / hour to keep automated signup floods off
// the door.
//
// Roll-back protocol (best-effort):
//   * createUser fails → 500 / 409
//   * merchant INSERT fails → delete the auth user
//   * account INSERT fails → delete merchant + auth user
//
// Email delivery (welcome / approval) is wired in lib/email/* once
// a provider key (RESEND or BREVO) is set; fires non-blocking.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { setSupabaseSessionCookies } from "@/lib/auth/zp-session";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  CA: "CAD",
  US: "USD",
};

const COUNTRY_TO_ROUTING: Record<string, string> = {
  CA: "ZPCA0001",
  US: "ZPUS0001",
};

const ALLOWED_BUSINESS_TYPES = new Set([
  "corporation", "llc", "sole_proprietorship", "partnership", "non_profit",
]);

const ALLOWED_INDUSTRIES = new Set([
  "technology", "ecommerce", "travel", "real_estate",
  "healthcare", "legal", "finance", "other",
]);

const ALLOWED_VOLUMES = new Set([
  "under_10k", "10k_50k", "50k_250k", "over_250k",
]);

function err(code: string, message: string, status: number, detail?: unknown) {
  const b: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) b.error.detail = detail;
  return NextResponse.json(b, { status });
}

interface Body {
  email?: string;
  password?: string;
  business_name?: string;
  legal_business_name?: string;
  business_type?: string;
  ein_bn?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string; // "CA" | "US"
  industry?: string;
  monthly_volume?: string;
  owner_name?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_dob?: string; // ISO date
  owner_ssn_last4?: string;
  owner_sin_last3?: string;
  identity_consent?: boolean;
  terms_accepted?: boolean;
}

function isAdult(dobIso: string): boolean {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

function genRandomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(`register:${ip}`, 5, 3_600_000)) {
    return err("rate_limited", "Too many signup attempts. Please try again in an hour.", 429);
  }

  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const email              = String(body.email ?? "").trim().toLowerCase();
  const password           = String(body.password ?? "");
  const businessName       = String(body.business_name ?? "").trim();
  const legalBusinessName  = body.legal_business_name ? String(body.legal_business_name).trim() : businessName;
  const businessType       = body.business_type ? String(body.business_type).trim().toLowerCase() : null;
  const einBn              = body.ein_bn ? String(body.ein_bn).trim() : null;
  const phone              = body.phone ? String(body.phone).trim() : null;
  const website            = body.website ? String(body.website).trim() : null;
  const addressLine1       = body.address_line1 ? String(body.address_line1).trim() : null;
  const addressLine2       = body.address_line2 ? String(body.address_line2).trim() : null;
  const city               = body.city ? String(body.city).trim() : null;
  const stateProvince      = body.state_province ? String(body.state_province).trim() : null;
  const postalCode         = body.postal_code ? String(body.postal_code).trim() : null;
  const country            = String(body.country ?? "CA").trim().toUpperCase();
  const industry           = body.industry ? String(body.industry).trim().toLowerCase() : null;
  const monthlyVolume      = body.monthly_volume ? String(body.monthly_volume).trim().toLowerCase() : null;
  const firstName          = body.owner_first_name ? String(body.owner_first_name).trim() : null;
  const lastName           = body.owner_last_name ? String(body.owner_last_name).trim() : null;
  const ownerName          = (body.owner_name && String(body.owner_name).trim()) ||
                              [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const ownerDob           = body.owner_dob ? String(body.owner_dob).trim() : null;
  const ownerSsnLast4      = body.owner_ssn_last4 ? String(body.owner_ssn_last4).replace(/\D/g, "").slice(-4) : null;
  const ownerSinLast3      = body.owner_sin_last3 ? String(body.owner_sin_last3).replace(/\D/g, "").slice(-3) : null;
  const identityConsent    = !!body.identity_consent;
  const termsAccepted      = !!body.terms_accepted;

  // ─── Input validation ───────────────────────────────────────────────
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return err("bad_request", "invalid_email", 400);
  // Banking-grade: 12+ chars, 1 upper, 1 digit, 1 symbol.
  if (password.length < 12 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))
    return err("bad_request", "password_weak", 400, { need: "min 12 chars, 1 uppercase, 1 digit, 1 symbol" });
  if (businessName.length < 2)
    return err("bad_request", "business_name_required", 400);
  if (!["CA", "US"].includes(country))
    return err("bad_request", "country_must_be_CA_or_US", 400);
  if (businessType && !ALLOWED_BUSINESS_TYPES.has(businessType))
    return err("bad_request", "business_type_invalid", 400);
  if (industry && !ALLOWED_INDUSTRIES.has(industry))
    return err("bad_request", "industry_invalid", 400);
  if (monthlyVolume && !ALLOWED_VOLUMES.has(monthlyVolume))
    return err("bad_request", "monthly_volume_invalid", 400);
  if (!ownerName)
    return err("bad_request", "owner_name_required", 400);
  if (!ownerDob || !isAdult(ownerDob))
    return err("bad_request", "owner_must_be_18_plus", 400);
  if (country === "CA" && (!ownerSinLast3 || ownerSinLast3.length !== 3))
    return err("bad_request", "sin_last_3_required", 400);
  if (country === "US" && (!ownerSsnLast4 || ownerSsnLast4.length !== 4))
    return err("bad_request", "ssn_last_4_required", 400);
  if (!identityConsent)
    return err("bad_request", "identity_consent_required", 400);
  if (!termsAccepted)
    return err("bad_request", "terms_must_be_accepted", 400);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return err("server_error", "supabase_env_missing", 500);
  const sbAuth = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = getSupabaseAdmin();

  // ─── 1. Create Supabase Auth user ───────────────────────────────────
  const { data: authData, error: authErr } = await sbAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Allow immediate sign-in; verification email handled by lib/email later.
    user_metadata: { business_name: businessName, country },
  });
  if (authErr || !authData?.user) {
    const msg = authErr?.message ?? "auth_signup_failed";
    const status = /already.*registered|already.*exists|duplicate/i.test(msg) ? 409 : 500;
    return err(
      status === 409 ? "email_already_registered" : "auth_signup_failed",
      status === 409 ? "This email is already registered. Sign in instead." : msg,
      status,
    );
  }
  const authUserId = authData.user.id;

  const nowIso = new Date().toISOString();
  const merchantId = `merch_${crypto.randomUUID()}`;
  const accountId = `ACC-${crypto.randomUUID()}`;
  const currency = COUNTRY_TO_CURRENCY[country] ?? "CAD";
  const zpRouting = COUNTRY_TO_ROUTING[country] ?? "ZPCA0001";
  const zpAccountNumber = `ZP${genRandomDigits(9)}`;

  // Both keys are minted at signup. Internal column names still read
  // `sandbox_key` / `live_key` — the UI surfaces them as Test/Live.
  const testKey = `zpk_test_${crypto.randomUUID().replace(/-/g, "")}`;
  const liveKey = `zpk_live_${crypto.randomUUID().replace(/-/g, "")}`;

  // ─── 2. Insert merchant row ─────────────────────────────────────────
  const { error: merchErr } = await db.from("zenipay_merchants").insert({
    id:                  merchantId,
    auth_user_id:        authUserId,
    business_name:       businessName,
    legal_business_name: legalBusinessName,
    email,
    business_type:       businessType,
    ein_bn:              einBn,
    phone,
    website,
    address_line1:       addressLine1,
    address_line2:       addressLine2,
    city,
    state_province:      stateProvince,
    postal_code:         postalCode,
    country,
    monthly_volume:      monthlyVolume,
    owner_name:          ownerName,
    owner_dob:           ownerDob,
    owner_ssn_last4:     country === "US" ? ownerSsnLast4 : null,
    owner_sin_last3:     country === "CA" ? ownerSinLast3 : null,
    terms_accepted_at:   nowIso,
    kyb_submitted_at:    nowIso,
    status:              "pending_kyb",
    onboarding_state:    "submitted",
    plan:                "Starter",
    sandbox_key:         testKey,   // surfaced as "Test Mode" in UI
    live_key:            liveKey,   // activates automatically when status flips to 'active'
    balance:             0,
    tx_count:            0,
    created_at:          nowIso,
    updated_at:          nowIso,
    merchant_data: {
      industry,
      monthly_volume: monthlyVolume,
      owner_first_name: firstName,
      owner_last_name: lastName,
      identity_consent_at: nowIso,
    },
  });
  if (merchErr) {
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "merchant_insert_failed", 500, { detail: merchErr.message });
  }

  // ─── 3. Seed primary business account ───────────────────────────────
  const { error: acctErr } = await db.from("zenipay_accounts").insert({
    id:                accountId,
    merchant_id:       merchantId,
    account_type:      "business_checking",
    account_name:      "Business Checking",
    account_number:    String(Math.floor(Math.random() * 9e9) + 1e9),
    balance:           0,
    currency,
    is_primary:        true,
    interest_rate:     0,
    status:            "active",
    zp_account_number: zpAccountNumber,
    zp_routing_code:   zpRouting,
    created_at:        nowIso,
    updated_at:        nowIso,
  });
  if (acctErr) {
    await db.from("zenipay_merchants").delete().eq("id", merchantId);
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "account_insert_failed", 500, { detail: acctErr.message });
  }

  // ─── 4. Provision an agents organization mapping (best-effort) ──────
  // The previous version targeted agents.organizations (non-existent)
  // and skipped the NOT NULL columns on agent_organizations, so every
  // business merchant created since signup launched ended up with no
  // org link. The agents auth helper now lazy-provisions on first
  // request as a safety net — but doing it at signup keeps the link
  // immediate for the user's first agents-page visit.
  try {
    const orgId = `org_${crypto.randomUUID()}`;
    const { error: orgErr } = await db.from("agent_organizations").insert({
      id:            orgId,
      name:          businessName,
      owner_user_id: authUserId,
      plan_tier:     "free",
      status:        "active",
    });
    if (!orgErr) {
      await db.from("zenipay_merchant_agent_org_map").insert({
        merchant_id:     merchantId,
        organization_id: orgId,
        created_at:      nowIso,
      });
    } else {
      console.error("[register] org provision failed:", orgErr.message);
    }
  } catch (e) {
    console.error("[register] org provision threw:", e instanceof Error ? e.message : String(e));
    // Agents mapping is non-critical for signup success.
  }

  // ─── 5. Sign the new user in so we can post a Supabase session ──────
  // We use the anon key here to mirror what a regular sign-in would do.
  // Failure is non-fatal — the user can still sign in manually.
  let session: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  try {
    const sb = createClient(url, anonKey || serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signed } = await sb.auth.signInWithPassword({ email, password });
    if (signed?.session) {
      session = {
        access_token: signed.session.access_token,
        refresh_token: signed.session.refresh_token,
        expires_in: signed.session.expires_in ?? 3600,
      };
    }
  } catch {
    /* non-fatal */
  }

  // ─── 6. Audit ───────────────────────────────────────────────────────
  try {
    await db.from("zenipay_audit_log").insert({
      merchant_id: merchantId,
      actor_type: "merchant_user",
      actor_id: merchantId,
      action: "merchant.registered",
      resource_type: "zenipay_merchants",
      resource_id: merchantId,
      severity: "info",
      ip_address: ip,
      user_agent: req.headers.get("user-agent") ?? null,
      new_value: { country, industry, monthly_volume: monthlyVolume },
    });
  } catch { /* table may not exist on all environments */ }

  const res = NextResponse.json({
    success:     true,
    merchant_id: merchantId,
    redirect:    "/app/overview",
  });
  if (session) {
    setSupabaseSessionCookies(res, session.access_token, session.refresh_token, session.expires_in);
  }
  return res;
}
