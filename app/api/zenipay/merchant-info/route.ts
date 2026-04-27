// /api/zenipay/merchant-info
//
// GET   ?id=...   — full merchant payload for the current user. Reads
//                   top-level columns first, falls back to merchant_data
//                   JSONB for legacy fields. Returns a stable camelCase
//                   shape the Settings UI consumes verbatim.
//       ?email=…  — legacy bootstrap lookup used during sign-in flows.
//
// PATCH           — update editable business / contact fields. Body
//                   uses camelCase keys; we map the well-known ones to
//                   their top-level columns and keep everything else in
//                   the merchant_data JSONB. Session-bound: a request
//                   that supplies a merchant_id different from the
//                   session's merchant gets 403 forbidden_cross_tenant
//                   (consistent with the PR #10 cross-tenant lockdown).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

// Columns we read straight from the merchants table for the GET payload.
const READ_COLUMNS = [
  "id",
  "business_name", "legal_business_name", "email", "business_type", "ein_bn",
  "phone", "website",
  "address_line1", "address_line2", "city", "state_province", "postal_code", "country",
  "monthly_volume",
  "owner_name", "owner_dob", "owner_ssn_last4", "owner_sin_last3",
  "status", "plan", "onboarding_state",
  "merchant_data", "sandbox_key", "live_key",
  "auth_user_id",
  "created_at",
].join(", ");

interface MerchantRow {
  id: string;
  business_name?: string | null;
  legal_business_name?: string | null;
  email?: string | null;
  business_type?: string | null;
  ein_bn?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  monthly_volume?: string | null;
  owner_name?: string | null;
  owner_dob?: string | null;
  owner_ssn_last4?: string | null;
  owner_sin_last3?: string | null;
  status?: string | null;
  plan?: string | null;
  onboarding_state?: string | null;
  merchant_data?: Record<string, unknown> | null;
  sandbox_key?: string | null;
  live_key?: string | null;
  auth_user_id?: string | null;
  created_at?: string | null;
}

function shape(row: MerchantRow) {
  const md = (row.merchant_data || {}) as Record<string, unknown>;
  const mdStr = (k: string): string => (typeof md[k] === "string" ? (md[k] as string) : "");
  const accountKind =
    (mdStr("account_kind") || mdStr("accountKind") || (row.status === "personal_only" ? "personal" : "business")) as
      | "personal" | "business";
  return {
    id:                 row.id,
    accountKind,
    email:              row.email || mdStr("email"),
    businessName:       row.business_name || mdStr("businessName"),
    legalBusinessName:  row.legal_business_name || mdStr("legalBusinessName"),
    businessType:       row.business_type || mdStr("businessType"),
    einBn:              row.ein_bn || mdStr("einBn") || mdStr("ein_bn"),
    phone:              row.phone || mdStr("phone"),
    website:            row.website || mdStr("website"),
    addressLine1:       row.address_line1 || mdStr("addressLine1") || mdStr("address_line1"),
    addressLine2:       row.address_line2 || mdStr("addressLine2") || mdStr("address_line2"),
    city:               row.city || mdStr("city"),
    stateProvince:      row.state_province || mdStr("stateProvince") || mdStr("state_province"),
    postalCode:         row.postal_code || mdStr("postalCode") || mdStr("postal_code"),
    country:            row.country || mdStr("country") || "CA",
    industry:           mdStr("industry"),
    monthlyVolume:      row.monthly_volume || mdStr("monthlyVolume") || mdStr("monthly_volume"),
    ownerName:          row.owner_name || mdStr("ownerName"),
    ownerFirstName:     mdStr("owner_first_name") || mdStr("ownerFirstName"),
    ownerLastName:      mdStr("owner_last_name") || mdStr("ownerLastName"),
    ownerDob:           row.owner_dob || mdStr("ownerDob"),
    ownerSsnLast4:      row.owner_ssn_last4 || "",
    ownerSinLast3:      row.owner_sin_last3 || "",
    status:             row.status || "pending_kyb",
    plan:               row.plan || "Starter",
    onboardingState:    row.onboarding_state || "",
    sandboxKey:         row.sandbox_key || "",
    liveKey:            row.live_key || "",
    createdAt:          row.created_at || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const id = req.nextUrl.searchParams.get("id");
    const supabase = getSupabaseAdmin();

    if (id) {
      const { data } = await supabase
        .from("zenipay_merchants")
        .select(READ_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (data) return NextResponse.json({ merchant: shape(data as unknown as MerchantRow) });
    }

    if (email) {
      // Email lookups are used during the legacy bootstrap (no session
      // available yet). We scan by both the top-level column and the
      // legacy merchant_data.email fallback.
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select(READ_COLUMNS);
      const found = ((merchants || []) as unknown as MerchantRow[]).find((m) => {
        const mdEmail = (m.merchant_data as Record<string, unknown> | null)?.email;
        const mdEmailStr = typeof mdEmail === "string" ? mdEmail.toLowerCase() : "";
        return (m.email?.toLowerCase() === email.toLowerCase()) || mdEmailStr === email.toLowerCase();
      });
      if (found) return NextResponse.json({ merchant: shape(found as unknown as MerchantRow) });
    }

    return NextResponse.json({ merchant: null });
  } catch (err) {
    console.error("[Merchant Info GET]", err);
    return NextResponse.json({ merchant: null });
  }
}

// Fields the Settings UI is allowed to mutate. Anything outside this
// list is silently dropped — keeps callers from sneaking in fields like
// `status`, `plan`, `sandbox_key`, `auth_user_id`, etc.
const EDITABLE_FIELDS = new Set([
  "businessName", "legalBusinessName", "businessType", "einBn",
  "phone", "website",
  "addressLine1", "addressLine2", "city", "stateProvince", "postalCode",
  "industry", "monthlyVolume",
  "ownerName", "ownerFirstName", "ownerLastName",
]);

// Map of camelCase field → top-level column. Keys not in this map are
// stored in merchant_data only.
const TOP_LEVEL_MAP: Record<string, string> = {
  businessName:       "business_name",
  legalBusinessName:  "legal_business_name",
  businessType:       "business_type",
  einBn:              "ein_bn",
  phone:              "phone",
  website:            "website",
  addressLine1:       "address_line1",
  addressLine2:       "address_line2",
  city:               "city",
  stateProvince:      "state_province",
  postalCode:         "postal_code",
  monthlyVolume:      "monthly_volume",
  ownerName:          "owner_name",
};

export async function PATCH(req: NextRequest) {
  // Cross-tenant lockdown: derive merchant_id from the session, not from
  // the request body. Mirrors the pattern PR #10 established for the 55
  // other routes.
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const claimed = typeof body.merchant_id === "string" ? body.merchant_id : null;
  const r = resolveMerchantId(session, claimed);
  if (r instanceof NextResponse) return r;
  const merchant_id = r;

  // Filter incoming fields to the editable allow-list.
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE_FIELDS.has(k)) fields[k] = v === "" ? null : v;
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ success: true, noop: true });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: readErr } = await supabase
    .from("zenipay_merchants")
    .select("merchant_data")
    .eq("id", merchant_id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  // Merge edits into merchant_data so legacy readers (the Finix flow,
  // older UI surfaces) keep finding the latest values where they expect.
  const md = {
    ...(existing.merchant_data || {}),
    ...fields,
    updated_at: nowIso,
  };

  const update: Record<string, unknown> = {
    merchant_data: md,
    updated_at: nowIso,
  };
  for (const [k, col] of Object.entries(TOP_LEVEL_MAP)) {
    if (k in fields) update[col] = fields[k];
  }

  const { error: updErr } = await supabase
    .from("zenipay_merchants")
    .update(update)
    .eq("id", merchant_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Return the freshly-shaped merchant so the client can refresh
  // without a follow-up GET.
  const { data: fresh } = await supabase
    .from("zenipay_merchants")
    .select(READ_COLUMNS)
    .eq("id", merchant_id)
    .maybeSingle();
  return NextResponse.json({
    success:  true,
    merchant: fresh ? shape(fresh as unknown as MerchantRow) : null,
  });
}
