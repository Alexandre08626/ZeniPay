export const dynamic = "force-dynamic";

/**
 * ZeniPay — Pay Links API
 * GET  — list pay links from Supabase
 * POST — create a new pay link (linked to merchant via api_key)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId, getZpSession } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
    if (r instanceof NextResponse) return r;
    const merchantId = r;
    const supabase = getSupabaseAdmin();

    let links: unknown[] = [];

    // Try zenipay_pay_links table first
    const { data, error } = await supabase
      .from("zenipay_pay_links")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table doesn't exist yet (42P01) — fall through to JSONB
      if (error.code !== "42P01") {
        console.warn("[pay-links] table error:", error.message);
      }
    } else if (data?.length) {
      links = data;
      return NextResponse.json({ links });
    }

    // Fall back to merchant_data.payLinks array
    const { data: merchant } = await supabase
      .from("zenipay_merchants")
      .select("merchant_data")
      .eq("id", merchantId)
      .single();

    const md = (merchant?.merchant_data || {}) as Record<string, unknown>;
    links = (md.payLinks as unknown[]) || [];

    // If we found links in JSONB, return them sorted by created_at DESC
    const sortedLinks = [...links].sort((a: any, b: any) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ links: sortedLinks });
  } catch (err) {
    console.error("[pay-links GET] error:", err);
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = "CAD", description, expiry, merchant, merchant_id: directMerchantId, api_key } = await req.json();

    if (!amount || parseFloat(String(amount)) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const id = `LINK-${Date.now().toString(36).toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
    const merchantParam = merchant ? `&m=${encodeURIComponent(merchant)}` : "";
    const url = `${baseUrl}/pay/${id}?amount=${amount}&currency=${currency}&desc=${encodeURIComponent(description || "")}${merchantParam}`;
    const now = new Date().toISOString();

    // Resolve merchant: prefer session auth, fall back to api_key for
    // server-to-server calls (e.g. from Zeniva Travel backend).
    const session = await getZpSession(req);
    let merchantId: string | null = session?.merchant_id || null;

    // Cross-tenant guard when session is available.
    if (session && directMerchantId) {
      const guard = resolveMerchantId(session, directMerchantId);
      if (guard instanceof NextResponse) return guard;
    }

    if (!merchantId && api_key) {
      // Server-to-server call (no session). Resolve via api_key.
      const { data: merchants } = await supabase
        .from("zenipay_merchants")
        .select("id, api_keys, merchant_data")
        .limit(10);
      const merchantRow = merchants?.find((m: Record<string, unknown>) => {
        const keys = (m.api_keys as Record<string, unknown>) || {};
        const md = (m.merchant_data as Record<string, unknown>) || {};
        const cfgKeys = (md.apiKeys as string[]) || [];
        return Object.values(keys).includes(api_key) || cfgKeys.includes(api_key);
      });
      if (merchantRow) {
        merchantId = merchantRow.id as string;
      }
    }

    if (!merchantId) {
      // API key wasn't provided or didn't match — try full session auth
      // to give a clearer error than "unauthorized".
      const sessionCheck = await requireZpSession(req);
      if (sessionCheck instanceof NextResponse) return sessionCheck;
      merchantId = sessionCheck.merchant_id;
    }

    // ── Save pay link in the zenipay_pay_links table (canonical store) ──
    // Also save to merchant_data.payLinks JSONB for backward compatibility
    // with existing routes that scan JSONB arrays.
    const linkRow = {
      id, url,
      amount: parseFloat(String(amount)), currency,
      description: description || "",
      merchant_id: merchantId,
      status: "active", uses: 0,
      expires_at: expiry || null,
      created_at: now,
      updated_at: now,
    };

    // Try table insert first (may fail if table doesn't exist yet)
    const { error: tableError } = await supabase
      .from("zenipay_pay_links")
      .upsert(linkRow, { onConflict: "id" });

    if (tableError) {
      console.warn("[create-link] table insert error (table may not exist):", tableError.message);
    }

    // Always save to merchant_data.payLinks JSONB as fallback
    const { data: merchantRow } = await supabase
      .from("zenipay_merchants")
      .select("merchant_data")
      .eq("id", merchantId)
      .single();

    const existingMd = (merchantRow?.merchant_data || {}) as Record<string, unknown>;
    const existingLinks = (existingMd.payLinks as unknown[]) || [];
    const newLinkMeta = { id, url, amount: linkRow.amount, currency, description: linkRow.description, status: linkRow.status, uses: linkRow.uses, expires_at: linkRow.expires_at, created_at: now };
    const updatedMd = {
      ...existingMd,
      payLinks: [newLinkMeta, ...existingLinks],
    };

    const { error: updateError } = await supabase
      .from("zenipay_merchants")
      .update({ merchant_data: updatedMd, updated_at: now })
      .eq("id", merchantId);

    if (updateError) {
      console.warn("[create-link] merchant_data save error:", updateError);
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
