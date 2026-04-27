// POST /api/auth/register/personal
//
// Personal-account signup. Creates a Supabase Auth user, a light
// merchant row with status='personal_only' (no KYB), a personal
// profile row, and a primary personal checking account. Posts the
// Supabase session cookies on success so the user lands on
// /personal/overview already signed in.
//
// Why a merchant row at all: zenipay_personal_profiles.merchant_id
// is NOT NULL, and the entire app — sessions, transfers, ledger —
// keys off merchant_id. A "personal_only" merchant with empty
// business fields is the cheapest way to wire personal users into
// that plumbing without a schema migration.
//
// Rate limit: 5 / IP / hour, same envelope as the business endpoint.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { setSupabaseSessionCookies } from "@/lib/auth/zp-session";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";

const COUNTRY_TO_CURRENCY: Record<string, string> = { CA: "CAD", US: "USD" };
const COUNTRY_TO_ROUTING:  Record<string, string> = { CA: "ZPCA0001", US: "ZPUS0001" };

function err(code: string, message: string, status: number, detail?: unknown) {
  const b: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) b.error.detail = detail;
  return NextResponse.json(b, { status });
}

interface Body {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  owner_dob?: string;
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
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(`register-personal:${ip}`, 5, 3_600_000)) {
    return err("rate_limited", "Too many signup attempts. Please try again in an hour.", 429);
  }

  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const email           = String(body.email ?? "").trim().toLowerCase();
  const password        = String(body.password ?? "");
  const firstName       = String(body.first_name ?? "").trim();
  const lastName        = String(body.last_name ?? "").trim();
  const country         = String(body.country ?? "CA").trim().toUpperCase();
  const phone           = body.phone ? String(body.phone).trim() : null;
  const addressLine1    = body.address_line1 ? String(body.address_line1).trim() : null;
  const addressLine2    = body.address_line2 ? String(body.address_line2).trim() : null;
  const city            = body.city ? String(body.city).trim() : null;
  const stateProvince   = body.state_province ? String(body.state_province).trim() : null;
  const postalCode      = body.postal_code ? String(body.postal_code).trim() : null;
  const ownerDob        = body.owner_dob ? String(body.owner_dob).trim() : null;
  const ownerSsnLast4   = body.owner_ssn_last4 ? String(body.owner_ssn_last4).replace(/\D/g, "").slice(-4) : null;
  const ownerSinLast3   = body.owner_sin_last3 ? String(body.owner_sin_last3).replace(/\D/g, "").slice(-3) : null;
  const identityConsent = !!body.identity_consent;
  const termsAccepted   = !!body.terms_accepted;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return err("bad_request", "invalid_email", 400);
  if (password.length < 12 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))
    return err("bad_request", "password_weak", 400, { need: "min 12 chars, 1 uppercase, 1 digit, 1 symbol" });
  if (firstName.length < 1) return err("bad_request", "first_name_required", 400);
  if (lastName.length < 1)  return err("bad_request", "last_name_required", 400);
  if (!["CA", "US"].includes(country)) return err("bad_request", "country_must_be_CA_or_US", 400);
  if (!ownerDob || !isAdult(ownerDob)) return err("bad_request", "owner_must_be_18_plus", 400);
  if (country === "CA" && (!ownerSinLast3 || ownerSinLast3.length !== 3))
    return err("bad_request", "sin_last_3_required", 400);
  if (country === "US" && (!ownerSsnLast4 || ownerSsnLast4.length !== 4))
    return err("bad_request", "ssn_last_4_required", 400);
  if (!identityConsent) return err("bad_request", "identity_consent_required", 400);
  if (!termsAccepted)   return err("bad_request", "terms_must_be_accepted", 400);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return err("server_error", "supabase_env_missing", 500);
  const sbAuth = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = getSupabaseAdmin();

  const ownerName = `${firstName} ${lastName}`.trim();

  // ─── 1. Create Supabase Auth user ───────────────────────────────────
  const { data: authData, error: authErr } = await sbAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, country, account_kind: "personal" },
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
  const profileId  = `pprof_${crypto.randomUUID()}`;
  const currency = COUNTRY_TO_CURRENCY[country] ?? "CAD";
  const zpRouting = COUNTRY_TO_ROUTING[country] ?? "ZPCA0001";
  const zpAccountNumber = `ZP${genRandomDigits(9)}`;

  // ─── 2. Insert light merchant row (status='personal_only') ──────────
  // business_name mirrors the owner so legacy header / display fall-backs
  // don't render an empty string. No API keys are minted (personal-only
  // merchants don't accept payments).
  const { error: merchErr } = await db.from("zenipay_merchants").insert({
    id:                merchantId,
    auth_user_id:      authUserId,
    business_name:     ownerName,
    email,
    phone,
    address_line1:     addressLine1,
    address_line2:     addressLine2,
    city,
    state_province:    stateProvince,
    postal_code:       postalCode,
    country,
    owner_name:        ownerName,
    owner_dob:         ownerDob,
    owner_ssn_last4:   country === "US" ? ownerSsnLast4 : null,
    owner_sin_last3:   country === "CA" ? ownerSinLast3 : null,
    terms_accepted_at: nowIso,
    status:            "personal_only",
    onboarding_state:  "personal_complete",
    plan:              "Personal",
    balance:           0,
    tx_count:          0,
    created_at:        nowIso,
    updated_at:        nowIso,
    merchant_data: {
      account_kind:        "personal",
      owner_first_name:    firstName,
      owner_last_name:     lastName,
      identity_consent_at: nowIso,
    },
  });
  if (merchErr) {
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "merchant_insert_failed", 500, { detail: merchErr.message });
  }

  // ─── 3. Insert personal profile ─────────────────────────────────────
  const { error: profErr } = await db.from("zenipay_personal_profiles").insert({
    id:             profileId,
    merchant_id:    merchantId,
    auth_user_id:   authUserId,
    first_name:     firstName,
    last_name:      lastName,
    email,
    phone,
    dob:            ownerDob,
    address_line1:  addressLine1,
    address_line2:  addressLine2,
    city,
    state_province: stateProvince,
    postal_code:    postalCode,
    country,
    status:         "active",
    kyc_status:     "pending",
    created_at:     nowIso,
  });
  if (profErr) {
    await db.from("zenipay_merchants").delete().eq("id", merchantId);
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "profile_insert_failed", 500, { detail: profErr.message });
  }

  // ─── 4. Seed primary personal checking account ──────────────────────
  const { error: acctErr } = await db.from("zenipay_personal_accounts").insert({
    profile_id:        profileId,
    merchant_id:       merchantId,
    account_name:      "Personal Checking",
    account_type:      "personal_checking",
    balance:           0,
    currency,
    is_primary:        true,
    zp_account_number: zpAccountNumber,
    zp_routing_code:   zpRouting,
  });
  if (acctErr) {
    await db.from("zenipay_personal_profiles").delete().eq("id", profileId);
    await db.from("zenipay_merchants").delete().eq("id", merchantId);
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "account_insert_failed", 500, { detail: acctErr.message });
  }

  // ─── 5. Sign the new user in so we can post a Supabase session ──────
  let session: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  try {
    const sb = createClient(url, anonKey || serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signed } = await sb.auth.signInWithPassword({ email, password });
    if (signed?.session) {
      session = {
        access_token:  signed.session.access_token,
        refresh_token: signed.session.refresh_token,
        expires_in:    signed.session.expires_in ?? 3600,
      };
    }
  } catch { /* non-fatal */ }

  // ─── 6. Audit ───────────────────────────────────────────────────────
  try {
    await db.from("zenipay_audit_log").insert({
      merchant_id:   merchantId,
      actor_type:    "merchant_user",
      actor_id:      merchantId,
      action:        "personal.registered",
      resource_type: "zenipay_personal_profiles",
      resource_id:   profileId,
      severity:      "info",
      ip_address:    ip,
      user_agent:    req.headers.get("user-agent") ?? null,
      new_value:     { country },
    });
  } catch { /* non-fatal */ }

  const res = NextResponse.json({
    success:     true,
    merchant_id: merchantId,
    profile_id:  profileId,
    redirect:    "/personal/overview",
  });
  if (session) {
    setSupabaseSessionCookies(res, session.access_token, session.refresh_token, session.expires_in);
  }
  return res;
}
