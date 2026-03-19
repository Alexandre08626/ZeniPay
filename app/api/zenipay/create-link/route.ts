export const dynamic = "force-dynamic";

/**
 * ZeniPay — Pay Links API
 * GET  — list pay links from Supabase
 * POST — create a new pay link
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

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ links: [] });

    const { data, error } = await supabase
      .from("zenipay_pay_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ links: [], error: error.message });
    return NextResponse.json({ links: data || [] });
  } catch (err) {
    console.error("[ZeniPay PayLinks GET] Error:", err);
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = "USD", description, expiry } = await req.json();

    if (!amount || parseFloat(String(amount)) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const id = `LINK-${Date.now().toString(36).toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://zenivatravel.com";
    const url = `${baseUrl}/pay/${id}?amount=${amount}&currency=${currency}&desc=${encodeURIComponent(description || "")}`;

    const linkData = {
      id,
      url,
      amount: parseFloat(String(amount)),
      currency,
      description: description || "",
      status: "active",
      uses: 0,
      expires_at: expiry ? new Date(expiry).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from("zenipay_pay_links").insert(linkData);
    }

    return NextResponse.json({
      success: true,
      id,
      url,
      amount: parseFloat(String(amount)),
      currency,
      description: description || "",
      expires_at: expiry ? new Date(expiry).toISOString() : null,
    });
  } catch (err) {
    console.error("[ZeniPay PayLinks POST] Error:", err);
    return NextResponse.json({ error: "Failed to create pay link" }, { status: 500 });
  }
}
