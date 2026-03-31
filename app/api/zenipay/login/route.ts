export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: merchants } = await supabase
      .from("zenipay_merchants")
      .select("id, email, merchant_data, sandbox_key, live_key");

    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Find merchant by email in merchant_data JSONB OR top-level email column
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = merchants.find((m: any) => {
      if (m.merchant_data?.email === email) return true;
      if (m.email === email) return true;
      return false;
    });

    if (!found) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const md = found.merchant_data || {};
    const storedPwd = md.password || "";

    if (!storedPwd || storedPwd !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      merchant: {
        id: found.id,
        email: md.email || found.email || email,
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
