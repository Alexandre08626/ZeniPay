export const dynamic = "force-dynamic";

/**
 * ZeniPay — Pay Links API
 * GET  — list pay links from Supabase
 * POST — create a new pay link (linked to merchant via api_key)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkdX9RdJPGYV_ZJBeG7DD4";
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
    const { amount, currency = "USD", description, expiry, merchant, api_key } = await req.json();

    if (!amount || parseFloat(String(amount)) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const supabase = getSupabase();
    const id = `LINK-${Date.now().toString(36).toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
    const merchantParam = merchant ? `&m=${encodeURIComponent(merchant)}` : "";
    const url = `${baseUrl}/pay/${id}?amount=${amount}&currency=${currency}&desc=${encodeURIComponent(description || "")}${merchantParam}`;
    const now = new Date().toISOString();

    // ── Look up merchant by API key → add link to their dashboard ────────
    let merchantId: string | null = null;
    if (supabase && api_key) {
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data")
        .or(`sandbox_key.eq.${api_key},live_key.eq.${api_key}`)
        .limit(1);
      const merchantRow = merchants?.[0];
      if (merchantRow) {
        merchantId = merchantRow.id;
        const existing = merchantRow.merchant_data || {};
        const existingLinks: unknown[] = existing.payLinks || [];
        const newLink = { id, url, amount: parseFloat(String(amount)), currency, description: description || "", status: "active", uses: 0, createdAt: now };
        await supabase
          .from("zenipay_merchants")
          .update({ merchant_data: { ...existing, payLinks: [newLink, ...existingLinks] }, updated_at: now })
          .eq("id", merchantRow.id);
      }
    }

    // ── Save pay link to zenipay_pay_links table ─────────────────────────
    if (supabase) {
      await supabase.from("zenipay_pay_links").insert({
        id, url, amount: parseFloat(String(amount)), currency,
        description: description || "", merchant_id: merchantId,
        status: "active", uses: 0,
        expires_at: expiry ? new Date(expiry).toISOString() : null,
        created_at: now, updated_at: now,
      });
    }

    return NextResponse.json({
      success: true, id, url,
      amount: parseFloat(String(amount)), currency,
      description: description || "",
      expires_at: expiry ? new Date(expiry).toISOString() : null,
    });
  } catch (err) {
    console.error("[ZeniPay PayLinks POST] Error:", err);
    return NextResponse.json({ error: "Failed to create pay link" }, { status: 500 });
  }
}
