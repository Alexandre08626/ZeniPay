export const dynamic = "force-dynamic";

/**
 * GET /api/zenipay/merchant-info?email=...  or  ?id=...
 * Reads merchant_data JSONB (PostgREST-safe — no ALTER TABLE column issues)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  if (!key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const id = req.nextUrl.searchParams.get("id");

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ merchant: null });

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
            sandboxKey: data.sandbox_key || "",
            liveKey: data.live_key || "",
            createdAt: data.created_at,
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
