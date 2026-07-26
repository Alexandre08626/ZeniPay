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
// Production schema: id, name, email, company, website, status, config JSONB, …
// The codebase migration lists business_name / owner_name / merchant_data etc,
// but production was created manually with a different layout.
const READ_COLUMNS = [
  "id",
  "name", "email", "company", "website",
  "status", "config", "created_at",
].join(", ");

interface MerchantRow {
  id: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
  website?: string | null;
  status?: string | null;
  config?: Record<string, unknown> | null;
  created_at?: string | null;
}

function shape(row: MerchantRow) {
  const cfg = (row.config || {}) as Record<string, unknown>;
  const cfgStr = (k: string): string => (typeof cfg[k] === "string" ? (cfg[k] as string) : "");
  const accountKind =
    (cfgStr("account_kind") || cfgStr("accountKind") || (row.status === "personal_only" ? "personal" : "business")) as
      | "personal" | "business";
  return {
    id:                 row.id,
    accountKind,
    email:              row.email || "",
    businessName:       row.name || cfgStr("business_name") || cfgStr("businessName"),
    legalBusinessName:  row.company || cfgStr("legal_business_name") || cfgStr("legalBusinessName") || "",
    businessType:       cfgStr("business_type") || cfgStr("businessType") || "",
    einBn:              cfgStr("ein_bn") || cfgStr("einBn") || "",
    phone:              cfgStr("phone") || "",
    website:            row.website || "",
    addressLine1:       cfgStr("address_line1") || cfgStr("addressLine1") || "",
    addressLine2:       cfgStr("address_line2") || cfgStr("addressLine2") || "",
    city:               cfgStr("city") || "",
    stateProvince:      cfgStr("state_province") || cfgStr("stateProvince") || "",
    postalCode:         cfgStr("postal_code") || cfgStr("postalCode") || "",
    country:            cfgStr("country") || "CA",
    industry:           cfgStr("industry") || "",
    monthlyVolume:      cfgStr("monthly_volume") || cfgStr("monthlyVolume") || cfgStr("monthlyVolume") || "",
    ownerName:          cfgStr("owner_name") || cfgStr("ownerName") || "",
    ownerFirstName:     cfgStr("owner_first_name") || cfgStr("ownerFirstName") || "",
    ownerLastName:      cfgStr("owner_last_name") || cfgStr("ownerLastName") || "",
    ownerDob:           cfgStr("owner_dob") || cfgStr("ownerDob") || "",
    ownerSsnLast4:      cfgStr("owner_ssn_last4") || "",
    ownerSinLast3:      cfgStr("owner_sin_last3") || "",
    status:             row.status || "pending_kyb",
    plan:               (cfgStr("plan") || "Starter") as string,
    onboardingState:    cfgStr("onboarding_state") || "",
    sandboxKey:         cfgStr("sandbox_key") || "",
    liveKey:            cfgStr("live_key") || "",
    createdAt:          row.created_at || null,
  };
}

/** Strip-sensitive variant of shape() for unauthenticated email lookups. */
function shapePublic(row: MerchantRow) {
  const s = shape(row);
  return {
    ...s,
    ownerSsnLast4: "",
    ownerSinLast3: "",
    sandboxKey:    "",
    liveKey:       "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const id = req.nextUrl.searchParams.get("id");
    const supabase = getSupabaseAdmin();

    // 1. Authenticated path — require a valid ZP session.
    const session = await requireZpSession(req);
    const authed = !(session instanceof NextResponse);

    // 2. id= lookup — session-gated.
    if (id) {
      if (!authed) return session; // 401
      const r = resolveMerchantId(session, id);
      if (r instanceof NextResponse) return r;
      const { data } = await supabase
        .from("zenipay_merchants")
        .select(READ_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (data) return NextResponse.json({ merchant: shape(data as unknown as MerchantRow) });
    }

    // 3. Email lookup — allowed without session for legacy bootstrap,
    //    but sensitive fields are stripped.
    if (email) {
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select(READ_COLUMNS);
      const found = ((merchants || []) as unknown as MerchantRow[]).find((m) => {
        const cfg = (m.config || {}) as Record<string, unknown>;
        const cfgEmail = typeof cfg.email === "string" ? cfg.email.toLowerCase() : "";
        return (m.email?.toLowerCase() === email.toLowerCase()) || cfgEmail === email.toLowerCase();
      });
      if (found) return NextResponse.json({ merchant: shapePublic(found as unknown as MerchantRow) });
    }

    // 4. No recognised parameter — 401.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
// stored in config only.
const TOP_LEVEL_MAP: Record<string, string> = {
  businessName:       "name",
  legalBusinessName:  "company",
  website:            "website",
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
    .select("config")
    .eq("id", merchant_id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  // Merge edits into config JSONB — this is the canonical store for
  // contact/owner/profile fields in the production schema.
  const md = {
    ...((existing as Record<string, unknown>).config as Record<string, unknown> || {}),
    ...fields,
    updated_at: nowIso,
  };

  const update: Record<string, unknown> = {
    config: md,
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
