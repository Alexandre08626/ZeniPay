export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ merchant_id: null });

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id")
      .eq("id", id)
      .single();

    return NextResponse.json({ merchant_id: data?.merchant_id || null });
  } catch {
    return NextResponse.json({ merchant_id: null });
  }
}
