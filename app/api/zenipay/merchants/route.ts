export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchants API
 * GET  — list all merchants from Supabase
 * POST — save a new merchant signup to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ merchants: [] });

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
      password:      m.password,
      createdAt:     m.created_at,
      volume:        m.volume   ?? 0,
      txCount:       m.tx_count ?? 0,
      balance:       m.balance  ?? 0,
      notes:         m.notes    ?? "",
    }));

    return NextResponse.json({ merchants });
  } catch (err) {
    console.error("[ZeniPay Merchants GET] Error:", err);
    return NextResponse.json({ merchants: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id, businessName, ownerName, email, phone, website,
      businessType, country, monthlyVolume, status, plan,
      sandboxKey, sandboxSecret, liveKey,
    } = body;

    if (!id || !email || !businessName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const merchant = {
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
    };

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const { error } = await supabase.from("zenipay_merchants").insert(merchant);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[ZeniPay Merchants POST] Error:", err);
    return NextResponse.json({ error: "Failed to save merchant" }, { status: 500 });
  }
}
