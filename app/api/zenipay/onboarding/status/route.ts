export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

const FINIX_BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";
const FINIX_USER = process.env.FINIX_API_USERNAME || "";
const FINIX_PASS = process.env.FINIX_API_PASSWORD || "";
const finixAuth = "Basic " + Buffer.from(`${FINIX_USER}:${FINIX_PASS}`).toString("base64");

export async function GET(req: NextRequest) {
  try {
    const mid = req.nextUrl.searchParams.get("merchant_id");
    if (!mid) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: m } = await supabase.from("zenipay_merchants").select("id, business_name, email, status, onboarding_state, finix_identity_id, finix_merchant_id, merchant_data").eq("id", mid).single();
    if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const md = m.merchant_data || {};
    let onboardingState = m.onboarding_state || "pending";

    // Poll Finix for real merchant status if we have a finix_merchant_id and state is not yet approved
    if (m.finix_merchant_id && onboardingState !== "approved") {
      try {
        const res = await fetch(`${FINIX_BASE}/merchants/${m.finix_merchant_id}`, {
          headers: { Authorization: finixAuth, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const finixData = await res.json();
          const finixState = finixData.onboarding_state || finixData.processing_enabled;
          if (finixState === "APPROVED" || finixData.processing_enabled === true) {
            onboardingState = "approved";
            await supabase.from("zenipay_merchants").update({ onboarding_state: "approved", updated_at: new Date().toISOString() }).eq("id", mid);
          } else if (finixState === "REJECTED") {
            onboardingState = "rejected";
            await supabase.from("zenipay_merchants").update({ onboarding_state: "rejected", updated_at: new Date().toISOString() }).eq("id", mid);
          } else if (finixState === "PROVISIONING" || onboardingState === "pending") {
            onboardingState = "provisioning";
            if (m.onboarding_state !== "provisioning") {
              await supabase.from("zenipay_merchants").update({ onboarding_state: "provisioning", updated_at: new Date().toISOString() }).eq("id", mid);
            }
          }
        }
      } catch {
        // Finix unreachable — keep current state
      }
    }

    return NextResponse.json({
      merchant_id: m.id,
      business_name: m.business_name,
      status: m.status,
      onboarding_state: onboardingState,
      finix_identity_id: m.finix_identity_id,
      finix_merchant_id: m.finix_merchant_id,
      setup_progress: {
        business: !!(md.setup_business),
        owner: !!(md.setup_owner),
        bank: !!(md.setup_bank),
        tests: !!(md.setup_tests_passed),
        submitted: !!(m.finix_merchant_id),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST — Go Live action: switch merchant from sandbox to live
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, action } = body;
    if (!merchant_id) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    if (action === "go_live") {
      const { data: m } = await supabase.from("zenipay_merchants").select("onboarding_state, live_key, merchant_data").eq("id", merchant_id).single();
      if (!m) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
      if (m.onboarding_state !== "approved") {
        return NextResponse.json({ error: "Merchant not yet approved" }, { status: 403 });
      }

      // Generate live key if not set
      const genKey = (prefix: string) => `${prefix}_${Array.from({ length: 24 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("")}`;
      const liveKey = m.live_key || genKey("zpk_live");

      // Update status to live, keep ALL merchant_data intact
      const { error } = await supabase.from("zenipay_merchants").update({
        status: "live",
        live_key: liveKey,
        updated_at: new Date().toISOString()
      }).eq("id", merchant_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, status: "live", liveKey });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
