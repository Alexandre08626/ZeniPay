export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    "https://mjkvkibdfteonvlahtag.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4"
  );
}

// GET — load compliance data for a merchant
export async function GET(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });

  const supabase = getSupabase();
  const { data } = await supabase
    .from("zenipay_compliance")
    .select("*")
    .eq("merchant_id", merchant_id)
    .single();

  if (!data) {
    // Auto-create default row
    const defaults = {
      merchant_id,
      kyc_status: "pending",
      pci_status: "non_compliant",
      finix_onboarding: "PROVISIONING",
      saq_completed: false,
      saq_answers: {},
      refund_policy_days: 30,
      chargeback_alert_threshold: 1.0,
      chargeback_alert_email: "",
      documents: [],
      updated_at: new Date().toISOString(),
    };
    await supabase.from("zenipay_compliance").insert(defaults);
    return NextResponse.json({ compliance: defaults });
  }

  return NextResponse.json({ compliance: data });
}

// PUT — update compliance data
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { merchant_id, ...updates } = body;
  if (!merchant_id) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });

  const supabase = getSupabase();
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("zenipay_compliance")
    .upsert({ merchant_id, ...updates }, { onConflict: "merchant_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
