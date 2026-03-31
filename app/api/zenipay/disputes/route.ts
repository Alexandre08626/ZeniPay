export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

// GET — list disputes for a merchant
export async function GET(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ disputes: [] });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("zenipay_disputes")
    .select("*")
    .eq("merchant_id", merchant_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Stats
  const all = data || [];
  const open = all.filter(d => d.status === "open").length;
  const won = all.filter(d => d.status === "won").length;
  const lost = all.filter(d => d.status === "lost").length;
  const totalAmount = all.reduce((s, d) => s + Number(d.amount || 0), 0);

  return NextResponse.json({
    disputes: all,
    stats: { total: all.length, open, won, lost, total_amount: totalAmount },
  });
}

// POST — create or update a dispute
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ...payload } = body;
  const supabase = getSupabaseAdmin();

  if (action === "create") {
    const { merchant_id, payment_id, customer_name, customer_email, amount, currency, reason, card_network, card_last4 } = payload;
    if (!merchant_id || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from("zenipay_disputes").insert({
      merchant_id,
      payment_id: payment_id || null,
      customer_name: customer_name || "",
      customer_email: customer_email || "",
      amount: Number(amount),
      currency: currency || "USD",
      reason: reason || "Unrecognized charge",
      card_network: card_network || "VISA",
      card_last4: card_last4 || "",
      status: "open",
      deadline,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dispute: data });
  }

  if (action === "respond") {
    const { id, merchant_response, evidence } = payload;
    if (!id) return NextResponse.json({ error: "Missing dispute id" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), status: "under_review" };
    if (merchant_response) updates.merchant_response = merchant_response;
    if (evidence) updates.evidence = evidence;

    await supabase.from("zenipay_disputes").update(updates).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "resolve") {
    const { id, resolution, status } = payload;
    if (!id) return NextResponse.json({ error: "Missing dispute id" }, { status: 400 });

    await supabase.from("zenipay_disputes").update({
      resolution: resolution || "",
      status: status || "won",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
