export const dynamic = "force-dynamic";

/**
 * GET /api/zenipay/merchant-info?email=...  or  ?id=...
 * Reads merchant_data JSONB (PostgREST-safe — no ALTER TABLE column issues)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const id = req.nextUrl.searchParams.get("id");

    const supabase = getSupabaseAdmin();

    // If looking up by id directly
    if (id) {
      const { data } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data, sandbox_key, live_key, created_at")
        .eq("id", id)
        .single();

      if (data?.merchant_data) {
        const md = data.merchant_data;
        return NextResponse.json({
          merchant: {
            id: data.id,
            email: md.email || "",
            businessName: md.businessName || "",
            ownerName: md.ownerName || "",
            plan: md.plan || "Standard",
            status: md.status || "sandbox",
            website: md.website || "",
            businessType: md.businessType || "",
            country: md.country || "",
            phone: md.phone || "",
            monthlyVolume: md.monthlyVolume || "",
            sandboxKey: data.sandbox_key || "",
            liveKey: data.live_key || "",
            createdAt: data.created_at,
            // Finix onboarding fields
            doingBusinessAs: md.doingBusinessAs || "",
            taxId: md.taxId || "",
            businessAddress: md.businessAddress || "",
            businessCity: md.businessCity || "",
            businessRegion: md.businessRegion || "",
            businessPostalCode: md.businessPostalCode || "",
            ownerFirstName: md.ownerFirstName || "",
            ownerLastName: md.ownerLastName || "",
            ownerTitle: md.ownerTitle || "",
            ownerDobMonth: md.ownerDobMonth || "",
            ownerDobDay: md.ownerDobDay || "",
            ownerDobYear: md.ownerDobYear || "",
            ownerAddress: md.ownerAddress || "",
            ownerCity: md.ownerCity || "",
            ownerRegion: md.ownerRegion || "",
            ownerPostalCode: md.ownerPostalCode || "",
          },
        });
      }
    }

    // If looking up by email — scan merchant_data JSONB
    if (email) {
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data, sandbox_key, live_key, created_at");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = (merchants || []).find((m: any) => m.merchant_data?.email === email);

      if (found) {
        const md = found.merchant_data;
        return NextResponse.json({
          merchant: {
            id: found.id,
            email: md.email || email,
            businessName: md.businessName || "",
            ownerName: md.ownerName || "",
            plan: md.plan || "Standard",
            status: md.status || "sandbox",
            website: md.website || "",
            businessType: md.businessType || "",
            country: md.country || "",
            sandboxKey: found.sandbox_key || "",
            liveKey: found.live_key || "",
            createdAt: found.created_at,
          },
        });
      }
    }

    return NextResponse.json({ merchant: null });
  } catch (err) {
    console.error("[Merchant Info]", err);
    return NextResponse.json({ merchant: null });
  }
}

/**
 * PATCH /api/zenipay/merchant-info
 * Updates merchant business info in merchant_data JSONB + top-level columns.
 * Used from Settings page to edit business details before Finix onboarding.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, ...fields } = body;

    if (!merchant_id) {
      return NextResponse.json({ error: "merchant_id is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Read current merchant_data
    const { data: current } = await supabase
      .from("zenipay_merchants")
      .select("merchant_data")
      .eq("id", merchant_id)
      .single();

    if (!current) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Merge new fields into merchant_data
    const md = { ...(current.merchant_data || {}), ...fields, updated_at: new Date().toISOString() };

    // Also update top-level columns where they exist
    const topLevel: Record<string, unknown> = {
      merchant_data: md,
      updated_at: new Date().toISOString(),
    };
    if (fields.businessName) topLevel.business_name = fields.businessName;
    if (fields.ownerName) topLevel.owner_name = fields.ownerName;
    if (fields.email) topLevel.email = fields.email;
    if (fields.phone) topLevel.phone = fields.phone;
    if (fields.website) topLevel.website = fields.website;
    if (fields.businessType) topLevel.business_type = fields.businessType;
    if (fields.country) topLevel.country = fields.country;

    const { error } = await supabase
      .from("zenipay_merchants")
      .update(topLevel)
      .eq("id", merchant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, merchant_data: md });
  } catch (err) {
    console.error("[Merchant Info PATCH]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
