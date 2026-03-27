export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
function getSupabase() { return createClient("https://mjkvkibdfteonvlahtag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4"); }
export async function GET(req: NextRequest) {
  try {
    const mid = req.nextUrl.searchParams.get("merchant_id");
    if (!mid) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    const supabase = getSupabase();
    const { data: m } = await supabase.from("zenipay_merchants").select("id, business_name, email, status, onboarding_state, finix_identity_id, finix_merchant_id, merchant_data").eq("id", mid).single();
    if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const md = m.merchant_data || {};
    return NextResponse.json({ merchant_id: m.id, business_name: m.business_name, status: m.status, onboarding_state: m.onboarding_state || "pending", finix_identity_id: m.finix_identity_id, finix_merchant_id: m.finix_merchant_id, setup_progress: { business: !!(md.setup_business), owner: !!(md.setup_owner), bank: !!(md.setup_bank), tests: !!(md.setup_tests_passed), submitted: !!(m.finix_merchant_id) } });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
