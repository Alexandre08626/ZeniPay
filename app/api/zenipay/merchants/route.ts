export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchants API
 * GET  — list all merchants from Supabase
 * POST — save a new merchant signup to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { hashPassword } from "../../../../modules/zenipay/services/auth";
import { rateLimit } from "../../../../modules/zenipay/services/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const email = req.nextUrl.searchParams.get("email");

    let query = supabase
      .from("zenipay_merchants")
      .select("*")
      .order("created_at", { ascending: false });

    if (email) query = query.eq("email", email).limit(1);

    const { data, error } = await query;

    if (error) return NextResponse.json({ merchants: [], error: error.message });

    // Map snake_case to camelCase for the client
    const merchants = (data || []).map((m: Record<string, unknown>) => ({
      id:            m.id,
      businessName:  m.business_name,
      ownerName:     m.owner_name,
      email:         m.email,
      phone:         m.phone,
      website:       m.website,
      businessType:  m.business_type,
      country:       m.country,
      monthlyVolume: m.monthly_volume,
      status:        m.status,
      plan:          m.plan,
      sandboxKey:    m.sandbox_key,
      sandboxSecret: m.sandbox_secret,
      liveKey:       m.live_key,
      createdAt:     m.created_at,
      volume:        m.volume   ?? 0,
      txCount:       m.tx_count ?? 0,
      balance:       m.balance  ?? 0,
      notes:         m.notes    ?? "",
      onboardingState: m.onboarding_state || "pending",
      merchantData: m.merchant_data || {},
    }));

    return NextResponse.json({ merchants });
  } catch (err) {
    console.error("[ZeniPay Merchants GET] Error:", err);
    return NextResponse.json({ merchants: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`signup:${ip}`, 3, 300000)) {
      return NextResponse.json({ error: "Too many signups. Try again later." }, { status: 429 });
    }

    const body = await req.json();

    // ── Roll sandbox keys action ──
    if (body.action === "roll_sandbox_keys" && body.merchant_id) {
      const supabase = getSupabaseAdmin();
      const genKey = (prefix: string) => `${prefix}_${Array.from({ length: 24 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]).join("")}`;
      const newKey = genKey("zpk_sb");
      const newSecret = genKey("zps_sb");
      const { error } = await supabase.from("zenipay_merchants").update({ sandbox_key: newKey, sandbox_secret: newSecret, updated_at: new Date().toISOString() }).eq("id", body.merchant_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, sandboxKey: newKey, sandboxSecret: newSecret });
    }

    const {
      id, businessName, ownerName, email, phone, website,
      businessType, country, monthlyVolume, status, plan,
      sandboxKey, sandboxSecret, liveKey, password,
    } = body;

    if (!id || !email || !businessName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    const merchant: Record<string, unknown> = {
      id,
      business_name:  businessName,
      owner_name:     ownerName   || null,
      email,
      phone:          phone        || null,
      website:        website      || null,
      business_type:  businessType || null,
      country:        country      || null,
      monthly_volume: monthlyVolume || null,
      status:         status       || "sandbox",
      plan:           plan         || "Standard",
      sandbox_key:    sandboxKey   || null,
      sandbox_secret: sandboxSecret || null,
      live_key:       liveKey      || null,
      volume:   0,
      tx_count: 0,
      balance:  0,
      notes:    "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      merchant_data: {
        email,
        businessName: businessName || "",
        ownerName: ownerName || "",
        phone: phone || "",
        website: website || "",
        businessType: businessType || "",
        country: country || "",
        monthlyVolume: monthlyVolume || "",
        plan: plan || "Standard",
        status: status || "sandbox",
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
    };

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("zenipay_merchants").insert(merchant);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[ZeniPay Merchants POST] Error:", err);
    return NextResponse.json({ error: "Failed to save merchant" }, { status: 500 });
  }
}
