export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const FINIX_BASE = process.env.FINIX_ENV === "production" ? "https://finix.live-payments-api.com" : "https://finix.sandbox-payments-api.com";
function finixAuth() { return "Basic " + Buffer.from((process.env.FINIX_API_USERNAME||"")+":"+(process.env.FINIX_API_PASSWORD||"")).toString("base64"); }
function getSupabase() { return createClient("https://mjkvkibdfteonvlahtag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4"); }
async function finixPost(path: string, body: object) { const r = await fetch(FINIX_BASE+path, { method: "POST", headers: { Authorization: finixAuth(), "Content-Type": "application/json", "Finix-Version": "2022-02-01" }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json() }; }
export async function POST(req: NextRequest) {
  try {
    const { business, owner, bank, merchant_id } = await req.json();
    if (!business?.business_name || !owner?.first_name || !merchant_id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    const identity = await finixPost("/identities", { entity: { type: "BUSINESS", business_name: business.business_name, business_type: business.business_type || "LIMITED_LIABILITY_COMPANY", doing_business_as: business.doing_business_as || business.business_name, first_name: owner.first_name, last_name: owner.last_name, title: owner.title || "CEO", email: business.email, phone: business.phone || "0000000000", business_phone: business.phone || "0000000000", business_address: { line1: business.line1 || "123 Main St", city: business.city || "Miami", region: business.region || "FL", postal_code: business.postal_code || "33101", country: business.country || "USA" }, personal_address: { line1: owner.line1 || business.line1 || "123 Main St", city: owner.city || business.city || "Miami", region: owner.region || business.region || "FL", postal_code: owner.postal_code || business.postal_code || "33101", country: business.country || "USA" }, tax_id: business.tax_id || "000000000", dob: { month: parseInt(owner.dob_month)||1, day: parseInt(owner.dob_day)||1, year: parseInt(owner.dob_year)||1990 }, ownership_percentage: parseInt(owner.ownership_pct)||100, mcc: business.mcc || "4722", url: business.website || "https://zenipay.ca", max_transaction_amount: parseInt(business.max_transaction)||1500000, annual_card_volume: parseInt(business.annual_volume)||1000000, default_statement_descriptor: "ZENIPAY" } });
    if (identity.status >= 400) return NextResponse.json({ error: identity.data?._embedded?.errors?.[0]?.message || "Identity error" }, { status: 400 });
    const identityId = identity.data.id;
    const merchant = await finixPost("/merchants", { identity: identityId, processor: process.env.FINIX_ENV === "production" ? "FINIX_V1" : "DUMMY_V1", tags: { zenipay_merchant_id: merchant_id } });
    if (merchant.status >= 400) return NextResponse.json({ error: merchant.data?._embedded?.errors?.[0]?.message || "Merchant error", identity_id: identityId }, { status: 400 });
    const finixMerchantId = merchant.data.id;
    const onboardingState = (merchant.data.onboarding_state || "PROVISIONING").toLowerCase();
    let bankInstrumentId = null;
    if (bank?.account_number && bank?.routing_number) { const b = await finixPost("/payment_instruments", { identity: identityId, type: "BANK_ACCOUNT", account_number: bank.account_number, bank_code: bank.routing_number, account_type: (bank.account_type||"CHECKING").toUpperCase(), name: business.business_name, country: business.country||"USA", currency: "USD" }); if (b.data?.id) bankInstrumentId = b.data.id; }
    const supabase = getSupabase();
    await supabase.from("zenipay_merchants").update({ finix_identity_id: identityId, finix_merchant_id: finixMerchantId, onboarding_state: onboardingState, updated_at: new Date().toISOString() }).eq("id", merchant_id);
    return NextResponse.json({ success: true, identity_id: identityId, finix_merchant_id: finixMerchantId, bank_instrument_id: bankInstrumentId, onboarding_state: onboardingState });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
