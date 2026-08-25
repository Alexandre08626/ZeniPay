export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  try {
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");
    if (!merchant_id) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("zenipay_quotes")
      .select("*")
      .eq("merchant_id", merchant_id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ quotes: data || [] });
  } catch (err) {
    console.error("[Quotes GET]", err);
    return NextResponse.json({ error: "Failed to load quotes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, ...quote } = body;

    if (!merchant_id) return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    if (!quote.customer_name) return NextResponse.json({ error: "customer_name required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const now = new Date().toISOString();
    const validityDays = quote.validity_days || 30;
    const expiresAt = new Date(Date.now() + validityDays * 86400000).toISOString();

    const payload = {
      id: quote.id || "QTE-" + Date.now().toString(36).toUpperCase(),
      merchant_id,
      quote_number: quote.quote_number || "",
      customer_name: quote.customer_name,
      customer_email: quote.customer_email || "",
      customer_address: quote.customer_address || "",
      items: quote.items || [],
      subtotal: quote.subtotal || 0,
      tax: quote.tax || 0,
      total: quote.total || 0,
      currency: quote.currency || "USD",
      status: quote.status || "draft",
      notes: quote.notes || "",
      validity_days: validityDays,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("zenipay_quotes").upsert(payload, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, quote: payload });
  } catch (err) {
    console.error("[Quotes POST]", err);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const updates = { ...fields, updated_at: new Date().toISOString() };

    const { error } = await supabase.from("zenipay_quotes").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Quotes PATCH]", err);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("zenipay_quotes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Quotes DELETE]", err);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
