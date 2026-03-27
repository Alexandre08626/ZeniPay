export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
function getSupabase() { return createClient("https://mjkvkibdfteonvlahtag.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4"); }
export async function POST(req: NextRequest) {
  try {
    const { merchant_id, step, data } = await req.json();
    if (!merchant_id || !step) return NextResponse.json({ error: "merchant_id and step required" }, { status: 400 });
    const supabase = getSupabase();
    const { data: m } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchant_id).single();
    const md = m?.merchant_data || {};
    const updated = { ...md, ["setup_" + step]: data };
    const top: Record<string, unknown> = { merchant_data: updated, updated_at: new Date().toISOString() };
    if (step === "business" && data) { if (data.business_name) top.business_name = data.business_name; if (data.email) top.email = data.email; if (data.phone) top.phone = data.phone; if (data.website) top.website = data.website; if (data.business_type) top.business_type = data.business_type; if (data.country) top.country = data.country; }
    await supabase.from("zenipay_merchants").update(top).eq("id", merchant_id);
    return NextResponse.json({ ok: true, step });
  } catch (err: unknown) { return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }); }
}
