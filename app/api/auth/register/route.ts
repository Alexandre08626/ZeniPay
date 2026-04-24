// POST /api/auth/register
//
// Multi-merchant signup: creates a Supabase Auth user, inserts a
// zenipay_merchants row scoped to that auth_user_id, seeds a primary
// CAD/USD business account, and provisions an agents.organizations
// mapping via zenipay_merchant_agent_org_map.
//
// On failure we roll back by best-effort: delete the Supabase Auth user
// if the merchant INSERT fails; delete the merchant + its agent org
// mapping if the account INSERT fails. A successful response yields a
// { success: true, merchant_id, redirect } payload for the client.
//
// NO email delivery wired here — provider selection (Brevo / Resend) is
// a follow-up; the welcome email will fire from
// `lib/email/send-welcome.ts` once the provider key lands in env.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  CA: "CAD",
  US: "USD",
};

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
  owner_name?: string;
  owner_dob?: string; // ISO date
  owner_ssn_last4?: string;
  owner_sin_last3?: string;
  terms_accepted?: boolean;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const email              = String(body.email ?? "").trim().toLowerCase();
  const password           = String(body.password ?? "");
  const businessName       = String(body.business_name ?? "").trim();
  const legalBusinessName  = body.legal_business_name ? String(body.legal_business_name).trim() : businessName;
  const businessType       = body.business_type ? String(body.business_type).trim() : null;
  const einBn              = body.ein_bn ? String(body.ein_bn).trim() : null;
  const phone              = body.phone ? String(body.phone).trim() : null;
  const website            = body.website ? String(body.website).trim() : null;
  const addressLine1       = body.address_line1 ? String(body.address_line1).trim() : null;
  const addressLine2       = body.address_line2 ? String(body.address_line2).trim() : null;
  const city               = body.city ? String(body.city).trim() : null;
  const stateProvince      = body.state_province ? String(body.state_province).trim() : null;
  const postalCode         = body.postal_code ? String(body.postal_code).trim() : null;
  const country            = String(body.country ?? "CA").trim().toUpperCase();
  const ownerName          = body.owner_name ? String(body.owner_name).trim() : null;
  const ownerDob           = body.owner_dob ? String(body.owner_dob).trim() : null;
  const ownerSsnLast4      = body.owner_ssn_last4 ? String(body.owner_ssn_last4).replace(/\D/g, "").slice(-4) : null;
  const ownerSinLast3      = body.owner_sin_last3 ? String(body.owner_sin_last3).replace(/\D/g, "").slice(-3) : null;
  const termsAccepted      = !!body.terms_accepted;

  // ─── Input validation ───────────────────────────────────────────────
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return err("bad_request", "invalid_email", 400);
  if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password))
    return err("bad_request", "password_weak", 400, { need: "min 8 chars, 1 uppercase, 1 digit" });
  if (businessName.length < 2)
    return err("bad_request", "business_name_required", 400);
  if (!["CA", "US"].includes(country))
    return err("bad_request", "country_must_be_CA_or_US", 400);
  if (!termsAccepted)
    return err("bad_request", "terms_must_be_accepted", 400);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return err("server_error", "supabase_env_missing", 500);
  const sbAuth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = getSupabaseAdmin();

  // ─── 1. Create Supabase Auth user ───────────────────────────────────
  const { data: authData, error: authErr } = await sbAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
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
  const sandboxKey = `zpk_test_${crypto.randomUUID().replace(/-/g, "")}`;

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
    owner_name:          ownerName,
    owner_dob:           ownerDob,
    owner_ssn_last4:     country === "US" ? ownerSsnLast4 : null,
    owner_sin_last3:     country === "CA" ? ownerSinLast3 : null,
    terms_accepted_at:   nowIso,
    kyb_submitted_at:    nowIso,
    status:              "pending_kyb",
    onboarding_state:    "submitted",
    plan:                "Starter",
    sandbox_key:         sandboxKey,
    balance:             0,
    tx_count:            0,
    created_at:          nowIso,
    updated_at:          nowIso,
  });
  if (merchErr) {
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "merchant_insert_failed", 500, { detail: merchErr.message });
  }

  // ─── 3. Seed primary business account ───────────────────────────────
  const { error: acctErr } = await db.from("zenipay_accounts").insert({
    id:               accountId,
    merchant_id:      merchantId,
    account_type:     "business_checking",
    account_name:     "Business Checking",
    account_number:   String(Math.floor(Math.random() * 9e9) + 1e9),
    balance:          0,
    currency,
    is_primary:       true,
    interest_rate:    0,
    status:           "active",
    created_at:       nowIso,
    updated_at:       nowIso,
  });
  if (acctErr) {
    await db.from("zenipay_merchants").delete().eq("id", merchantId);
    await sbAuth.auth.admin.deleteUser(authUserId).catch(() => {});
    return err("server_error", "account_insert_failed", 500, { detail: acctErr.message });
  }

  // ─── 4. Provision an agents.organizations mapping ───────────────────
  // Best-effort: if the agents schema isn't present on this deploy, or
  // the org insert fails, we log and continue. Merchants can still use
  // the core product; agents features get enabled on next sign-in once
  // the mapping is backfilled.
  try {
    const orgId = `org_${crypto.randomUUID()}`;
    const { error: orgErr } = await db.schema("agents").from("organizations").insert({
      id:        orgId,
      name:      businessName,
      email,
      created_at: nowIso,
    });
    if (!orgErr) {
      await db.from("zenipay_merchant_agent_org_map").insert({
        merchant_id:     merchantId,
        organization_id: orgId,
        created_at:      nowIso,
      });
    }
  } catch {
    // Agents mapping is non-critical for signup success.
  }

  return NextResponse.json({
    success:     true,
    merchant_id: merchantId,
    redirect:    "/app/overview",
  });
}
