export const dynamic = "force-dynamic";

// EMERGENCY (2026-09-29): Supabase is restricted (egress quota), so the
// normal ZeniPay checkout can't read pay links. This creates a Finix-hosted
// payment link directly (money lands on the same Finix merchant); the
// payment is recorded in ZeniPay once the database is back.
// Token-protected (ZP_DIAG_TOKEN). POST { amount, name, description }.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { finixRequest } from "@/lib/finix/client";
import { FINIX_CONFIG } from "@/lib/finix/config";

export async function POST(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const b = await req.json().catch(() => ({}));
  const cents = Math.round(Number(b.amount) * 100);
  if (!(cents > 0) || cents > 5_000_000) return NextResponse.json({ error: "amount" }, { status: 400 });
  const name = String(b.name || "Paiement ZeniCorp").slice(0, 80);
  const description = String(b.description || name).slice(0, 200);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";

  const body = {
    merchant_id: FINIX_CONFIG.merchantId,
    application_id: FINIX_CONFIG.applicationId,
    payment_frequency: "ONE_TIME",
    is_multiple_use: false,
    allowed_payment_methods: ["PAYMENT_CARD"],
    nickname: name,
    items: [{
      name, description, quantity: "1",
      image_details: { primary_image_url: `${base}/zenipay-logo.png` },
      price_details: { sale_amount: cents, currency: "CAD", price_type: "PROMOTIONAL", regular_amount: cents },
    }],
    amount_details: { amount_type: "FIXED", total_amount: cents, currency: "CAD", amount_breakdown: { subtotal_amount: cents } },
    branding: { brand_color: "#15B8C9", accent_color: "#7B4FBF", logo: `${base}/zenipay-logo.png`, icon: `${base}/zenipay-logo.png` },
    additional_details: {
      collect_name: true, collect_email: true, collect_phone_number: true, collect_billing_address: false,
      success_return_url: `${base}/`, unsuccessful_return_url: `${base}/`, expired_session_url: `${base}/`,
      expiration_in_minutes: 10080,
    },
    tags: { source: "zenipay_emergency", merchant: String(b.merchant || "zenicorp") },
  };
  const r = await finixRequest<Record<string, any>>({ method: "POST", path: "/payment_links", body });
  if (r.status >= 400) return NextResponse.json({ error: "finix", status: r.status, detail: r.data }, { status: 502 });
  return NextResponse.json({ id: r.data.id, url: r.data.link_url, state: r.data.state, amount: cents / 100 });
}
