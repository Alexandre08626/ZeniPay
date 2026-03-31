export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";
const FINIX_BASE = process.env.FINIX_ENV === "production" ? "https://finix.live-payments-api.com" : "https://finix.sandbox-payments-api.com";
function finixAuth() { return "Basic " + Buffer.from((process.env.FINIX_API_USERNAME||"")+":"+(process.env.FINIX_API_PASSWORD||"")).toString("base64"); }
async function finixPost(path: string, body: object) { const r = await fetch(FINIX_BASE+path, { method: "POST", headers: { Authorization: finixAuth(), "Content-Type": "application/json", "Finix-Version": "2022-02-01" }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }
export async function POST(req: NextRequest) {
  try {
    const { business, owner, bank, merchant_id } = await req.json();
    if (!business?.business_name || !owner?.first_name || !merchant_id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Validate KYC-critical fields
    const missing: string[] = [];
    if (!business.phone || !/^\+?\d{10,15}$/.test(business.phone)) missing.push("business.phone (must match +?XXXXXXXXXX, 10-15 digits)");
    if (!business.tax_id || !/^(\d{9}|\d{2}-\d{7})$/.test(business.tax_id)) missing.push("business.tax_id (must be 9 digits or XX-XXXXXXX format)");
    if (!owner.dob_month || !owner.dob_day || !owner.dob_year) missing.push("owner DOB (dob_month, dob_day, dob_year are all required)");
    else {
      const m = parseInt(owner.dob_month), d = parseInt(owner.dob_day), y = parseInt(owner.dob_year);
      if (isNaN(m) || m < 1 || m > 12 || isNaN(d) || d < 1 || d > 31 || isNaN(y) || y < 1900 || y > 2010) missing.push("owner DOB (invalid month/day/year values)");
    }
    if (!owner.line1) missing.push("owner.line1");
    if (!owner.city && !business.city) missing.push("owner.city (or business.city)");
    if (!owner.region && !business.region) missing.push("owner.region (or business.region)");
    if (!owner.postal_code && !business.postal_code) missing.push("owner.postal_code (or business.postal_code)");
    if (!business.line1) missing.push("business.line1 (business address)");
    if (!business.city) missing.push("business.city (business address)");
    if (!business.region) missing.push("business.region (business address)");
    if (!business.postal_code) missing.push("business.postal_code (business address)");
    if (missing.length > 0) return NextResponse.json({ error: "Missing or invalid required fields", fields: missing }, { status: 400 });

    const identity = await finixPost("/identities", { entity: { type: "BUSINESS", business_name: business.business_name, business_type: business.business_type || "LIMITED_LIABILITY_COMPANY", doing_business_as: business.doing_business_as || business.business_name, first_name: owner.first_name, last_name: owner.last_name, title: owner.title || "CEO", email: business.email, phone: business.phone, business_phone: business.phone, business_address: { line1: business.line1, city: business.city, region: business.region, postal_code: business.postal_code, country: business.country || "USA" }, personal_address: { line1: owner.line1, city: owner.city || business.city, region: owner.region || business.region, postal_code: owner.postal_code || business.postal_code, country: business.country || "USA" }, tax_id: business.tax_id, dob: { month: parseInt(owner.dob_month), day: parseInt(owner.dob_day), year: parseInt(owner.dob_year) }, ownership_percentage: parseInt(owner.ownership_pct)||100, mcc: business.mcc || "4722", url: business.website || "https://zenipay.ca", max_transaction_amount: parseInt(business.max_transaction)||1500000, annual_card_volume: parseInt(business.annual_volume)||1000000, default_statement_descriptor: "ZENIPAY" } });
    if (identity.status >= 400) return NextResponse.json({ error: identity.data?._embedded?.errors?.[0]?.message || "Identity error" }, { status: 400 });
    const identityId = identity.data.id;
    const merchant = await finixPost("/merchants", { identity: identityId, processor: process.env.FINIX_ENV === "production" ? "FINIX_V1" : "DUMMY_V1", tags: { zenipay_merchant_id: merchant_id } });
    if (merchant.status >= 400) return NextResponse.json({ error: merchant.data?._embedded?.errors?.[0]?.message || "Merchant error", identity_id: identityId }, { status: 400 });
    const finixMerchantId = merchant.data.id;
    const onboardingState = (merchant.data.onboarding_state || "PROVISIONING").toLowerCase();
    let bankInstrumentId = null;
    if (bank?.account_number && bank?.routing_number) { const b = await finixPost("/payment_instruments", { identity: identityId, type: "BANK_ACCOUNT", account_number: bank.account_number, bank_code: bank.routing_number, account_type: (bank.account_type||"CHECKING").toUpperCase(), name: business.business_name, country: business.country||"USA", currency: "USD" }); if (b.data?.id) bankInstrumentId = b.data.id; }
    const supabase = getSupabaseAdmin();
    await supabase.from("zenipay_merchants").update({ finix_identity_id: identityId, finix_merchant_id: finixMerchantId, onboarding_state: onboardingState, updated_at: new Date().toISOString() }).eq("id", merchant_id);
    return NextResponse.json({ success: true, identity_id: identityId, finix_merchant_id: finixMerchantId, bank_instrument_id: bankInstrumentId, onboarding_state: onboardingState });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
