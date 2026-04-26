// POST /api/v1/merchant/cards/[id]/reveal
//
// Reveals PAN + CVV + expiry for 30 seconds. PCI-sensitive:
//   - Stripe provider: returns an ephemeral key so the browser can
//     render Stripe's secure iframe (we never touch the PAN).
//   - Finix provider: returns the raw values from Finix's reveal
//     endpoint (PCI-scope stays with Finix).
//
// Always logs an audit row (severity=warning) with the actor +
// merchant_id. The response is never cached.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getCardIssuingProvider } from "@/lib/card-issuing/provider-factory";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
interface Body { merchant_id?: string }

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const provider = getCardIssuingProvider();
  if (!provider) return err("coming_soon", "card_issuing_not_enabled", 503);

  const { id } = await Promise.resolve(ctx.params);
  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* empty body allowed */ }
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const db = getSupabaseAdmin();
  const { data: card, error: fetchErr } = await db
    .from("zenipay_merchant_cards")
    .select("id, merchant_id, provider, provider_card_id, status, last4")
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (fetchErr) return err("server_error", fetchErr.message, 500);
  if (!card) return err("not_found", "card_not_found", 404);
  if (card.status === "cancelled") return err("unprocessable", "card_cancelled", 422);

  auditAsync({
    merchant_id: merchantId,
    actor_type:  "merchant_user",
    actor_id:    merchantId,
    action:      "card.pan_revealed",
    resource_type: "zenipay_merchant_cards",
    resource_id:   id,
    new_value: { provider: card.provider, last4: card.last4, ttl_seconds: 30 },
    ip_address:  req.headers.get("x-forwarded-for") ?? null,
    user_agent:  req.headers.get("user-agent") ?? null,
    severity:    "warning",
  });

  const expiresAt = Math.floor(Date.now() / 1000) + 30;
  const headers = { "cache-control": "no-store", "pragma": "no-cache" };

  if (card.provider === "stripe") {
    try {
      const Stripe = (await import("stripe")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = new Stripe(process.env.STRIPE_ISSUING_API_KEY!, { apiVersion: "2024-06-20" as any });
      const ek = await s.ephemeralKeys.create(
        { issuing_card: card.provider_card_id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { apiVersion: "2024-06-20" } as any,
      );
      return NextResponse.json({
        success: true,
        mode: "stripe_iframe",
        card_id: card.provider_card_id,
        ephemeral_key_secret: ek.secret,
        expires_at: expiresAt,
      }, { headers });
    } catch (e) {
      return err("bad_gateway", "stripe_ephemeral_key_failed", 502, e instanceof Error ? e.message : String(e));
    }
  }

  // finix — full PAN/CVV returned by Finix API
  try {
    const details = await provider.getCardDetails(card.provider_card_id);
    return NextResponse.json({
      success: true,
      mode: "inline",
      pan: details.pan,
      cvv: details.cvv,
      exp: details.exp,
      expires_at: expiresAt,
    }, { headers });
  } catch (e) {
    return err("bad_gateway", "provider_reveal_failed", 502, e instanceof Error ? e.message : String(e));
  }
}
