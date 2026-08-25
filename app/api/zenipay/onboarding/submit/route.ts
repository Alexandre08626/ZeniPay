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

    const missing: string[] = [];
    if (!business.phone || !/^\+?\d{10,15}$/.test(business.phone)) missing.push("business.phone");
    if (!business.tax_id || !/^(\d{9}|\d{2}-\d{7})$/.test(business.tax_id)) missing.push("business.tax_id");
    if (!owner.dob_month || !owner.dob_day || !owner.dob_year) missing.push("owner DOB");
    if (!owner.line1) missing.push("owner.line1");
    if (!business.line1) missing.push("business.line1");
    if (!business.city) missing.push("business.city");
    if (!business.region) missing.push("business.region");
    if (!business.postal_code) missing.push("business.postal_code");
    if (missing.length > 0) return NextResponse.json({ error: "Missing or invalid required fields", fields: missing }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    await supabase.from("zenipay_merchants").upsert({
      id: merchant_id,
      merchant_data: { ...business, owner, bank, pending_review: true, submitted_at: now },
      updated_at: now,
    });

    if (!process.env.FINIX_API_USERNAME || !process.env.FINIX_API_PASSWORD) {
      return NextResponse.json({ success: true, identity_id: null, finix_merchant_id: null, bank_instrument_id: null, onboarding_state: "pending_finix_config", warning: "Finix credentials not configured — merchant saved locally." });
    }

    let identityId: string | null = null;
    let finixMerchantId: string | null = null;
    let bankInstrumentId: string | null = null;
    let onboardingState = "pending_finix_config";

    try {
      const identity = await finixPost("/identities", { entity: { type: "BUSINESS", business_name: business.business_name, business_type: business.business_type || "LIMITED_LIABILITY_COMPANY", doing_business_as: business.doing_business_as || business.business_name, first_name: owner.first_name, last_name: owner.last_name, title: owner.title || "CEO", email: business.email, phone: business.phone, business_phone: business.phone, business_address: { line1: business.line1, city: business.city, region: business.region, postal_code: business.postal_code, country: business.country || "USA" }, personal_address: { line1: owner.line1, city: owner.city || business.city, region: owner.region || business.region, postal_code: owner.postal_code || business.postal_code, country: business.country || "USA" }, tax_id: business.tax_id, dob: { month: parseInt(owner.dob_month), day: parseInt(owner.dob_day), year: parseInt(owner.dob_year) }, ownership_percentage: parseInt(owner.ownership_pct)||100, mcc: business.mcc || "4722", url: business.website || "https://zenipay.ca", max_transaction_amount: parseInt(business.max_transaction)||1500000, annual_card_volume: parseInt(business.annual_volume)||1000000, default_statement_descriptor: "ZENIPAY" } });
      if (identity.status >= 400) throw new Error(identity.data?._embedded?.errors?.[0]?.message || "Identity error");
      identityId = identity.data.id;

      const merchant = await finixPost("/merchants", { identity: identityId, processor: process.env.FINIX_ENV === "production" ? "FINIX_V1" : "DUMMY_V1", tags: { zenipay_merchant_id: merchant_id } });
      if (merchant.status >= 400) throw new Error(merchant.data?._embedded?.errors?.[0]?.message || "Merchant error");
      finixMerchantId = merchant.data.id;
      onboardingState = (merchant.data.onboarding_state || "PROVISIONING").toLowerCase();

      if (bank?.account_number && bank?.routing_number) {
        const b = await finixPost("/payment_instruments", { identity: identityId, type: "BANK_ACCOUNT", account_number: bank.account_number, bank_code: bank.routing_number, account_type: (bank.account_type||"CHECKING").toUpperCase(), name: business.business_name, country: business.country||"USA", currency: "USD" });
        if (b.data?.id) bankInstrumentId = b.data.id;
      }
    } catch (finixErr: unknown) {
      console.error("[Onboarding] Finix API error (non-fatal):", finixErr);
    }

    const updatedMd = { ...business, pending_review: true, submitted_at: now, identity_id: identityId, finix_merchant_id: finixMerchantId, onboarding_state: onboardingState };
    if (bankInstrumentId) updatedMd.bank_instrument_id = bankInstrumentId;
    await supabase.from("zenipay_merchants").update({ merchant_data: updatedMd, updated_at: now }).eq("id", merchant_id);

    return NextResponse.json({ success: true, identity_id: identityId, finix_merchant_id: finixMerchantId, bank_instrument_id: bankInstrumentId, onboarding_state: onboardingState });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}