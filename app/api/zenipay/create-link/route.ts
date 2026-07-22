export const dynamic = "force-dynamic";

/**
 * ZeniPay — Pay Links API
 * GET  — list pay links from Supabase
 * POST — create a new pay link (linked to merchant via api_key)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
    if (r instanceof NextResponse) return r;
    const merchantId = r;
    const supabase = getSupabaseAdmin();

    // Try zenipay_pay_links table first, fall back to config.payLinks
    const { data, error } = await supabase
      .from("zenipay_pay_links")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data?.length) {
      return NextResponse.json({ links: data });
    }

    // Fall back to config.payLinks array
    const { data: merchant } = await supabase
      .from("zenipay_merchants")
      .select("config")
      .eq("id", merchantId)
      .single();

    const cfg = (merchant?.config || {}) as Record<string, unknown>;
    const links = (cfg.payLinks as unknown[]) || [];
    return NextResponse.json({ links: links as Record<string, unknown>[] });
  } catch (err) {
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const { amount, currency = "CAD", description, expiry, merchant, merchant_id: directMerchantId, api_key } = await req.json();

    if (!amount || parseFloat(String(amount)) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    // Cross-tenant guard — directMerchantId, if sent, must match the session.
    const r = resolveMerchantId(session, directMerchantId ?? null);
    if (r instanceof NextResponse) return r;

    const supabase = getSupabaseAdmin();
    const id = `LINK-${Date.now().toString(36).toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
    const merchantParam = merchant ? `&m=${encodeURIComponent(merchant)}` : "";
    const url = `${baseUrl}/pay/${id}?amount=${amount}&currency=${currency}&desc=${encodeURIComponent(description || "")}${merchantParam}`;
    const now = new Date().toISOString();

    // Always bind the new pay link to the authenticated merchant. The
    // legacy api_key lookup is kept only as a sanity check that the key
    // belongs to the same session merchant.
    let merchantId: string = session.merchant_id;
    if (api_key) {
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data")
        .or(`sandbox_key.eq.${api_key},live_key.eq.${api_key}`)
        .limit(1);
      const merchantRow = merchants?.[0];
      if (merchantRow && merchantRow.id === session.merchant_id) {
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

    // ── Save pay link in merchant's config JSONB ─────────────────────────
    // The zenipay_pay_links table may not exist yet; store the link in the
    // merchant's `config.payLinks` array which is always available.
    const newLink = {
      id, url,
      amount: parseFloat(String(amount)), currency,
      description: description || "",
      status: "active", uses: 0,
      expires_at: expiry || null,
      created_at: now,
    };

    // Read existing config, append link
    const { data: merchantRow } = await supabase
      .from("zenipay_merchants")
      .select("config")
      .eq("id", merchantId)
      .single();

    const existingConfig = (merchantRow?.config || {}) as Record<string, unknown>;
    const existingLinks = (existingConfig.payLinks as unknown[]) || [];
    const updatedConfig = {
      ...existingConfig,
      payLinks: [newLink, ...existingLinks],
    };

    const { error: updateError } = await supabase
      .from("zenipay_merchants")
      .update({ config: updatedConfig, updated_at: now })
      .eq("id", merchantId);

    if (updateError) {
      console.warn("[create-link] config save error:", updateError);
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


export async function DELETE(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supabase = getSupabaseAdmin();
    // Restrict to links owned by the session merchant.
    const { error } = await supabase
      .from("zenipay_pay_links")
      .delete()
      .eq("id", id)
      .eq("merchant_id", session.merchant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
