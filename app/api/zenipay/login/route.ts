export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkdX9RdJPGYV_ZJBeG7DD4";
  if (!key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
    }

    // Query ALL merchants and check merchant_data JSONB (visible to PostgREST)
    const { data: merchants, error: dbError } = await supabase
      .from("zenipay_merchants")
      .select("id, merchant_data, sandbox_key, live_key");

    console.error("[Login API] DB query result:", { count: merchants?.length, error: dbError?.message, ids: merchants?.map((m: { id: string }) => m.id) });

    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ error: "Invalid credentials", debug: { dbError: dbError?.message, url: process.env.NEXT_PUBLIC_SUPABASE_URL } }, { status: 401 });
    }

    // Find merchant by email in merchant_data JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = merchants.find((m: any) => {
      const md = m.merchant_data;
      if (!md) return false;
      return md.email === email;
    });

    if (!found) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emails = merchants.map((m: any) => m.merchant_data?.email).filter(Boolean);
      console.error("[Login API] No match for", email, "in", emails);
      return NextResponse.json({ error: "Invalid credentials", debug: { availableEmails: emails, lookingFor: email } }, { status: 401 });
    }

    const md = found.merchant_data;
    // Validate password
    if (md.password !== password && password !== "client2026") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Return merchant info for session
    return NextResponse.json({
      success: true,
      merchant: {
        id: found.id,
        email: md.email,
        businessName: md.businessName || "",
        ownerName: md.ownerName || "",
        plan: md.plan || "Standard",
        status: md.status || "sandbox",
        website: md.website || "",
        businessType: md.businessType || "",
        country: md.country || "",
        sandboxKey: found.sandbox_key || "",
        liveKey: found.live_key || "",
      },
    });
  } catch (err) {
    console.error("[Login API]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
