export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { verifyPassword } from "../../../../modules/zenipay/services/auth";
import { rateLimit } from "../../../../modules/zenipay/services/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`login:${ip}`, 5, 60000)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Query ALL merchants and check merchant_data JSONB (visible to PostgREST)
    const { data: merchants } = await supabase
      .from("zenipay_merchants")
      .select("id, merchant_data, sandbox_key, live_key");

    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Find merchant by email in merchant_data JSONB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = merchants.find((m: any) => {
      const md = m.merchant_data;
      if (!md) return false;
      return md.email === email;
    });

    if (!found) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const md = found.merchant_data;
    // Validate password
    if (!(await verifyPassword(password, md.password || ""))) {
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
