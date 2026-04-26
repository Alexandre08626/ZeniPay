// PATCH /api/v1/merchant/cards/[id]
//
// Actions:
//   { action: 'freeze' | 'unfreeze' | 'cancel' | 'update_limits',
//     daily?, monthly? }
//
// Every mutation goes through the provider first so the local DB and
// Stripe/Finix stay in lockstep. A provider failure aborts before we
// touch our row.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getCardIssuingProvider } from "@/lib/card-issuing/provider-factory";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
interface Body {
  merchant_id?: string;
  action?: "freeze" | "unfreeze" | "cancel" | "update_limits";
  daily?: number | null;
  monthly?: number | null;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const provider = getCardIssuingProvider();
  if (!provider) return err("coming_soon", "card_issuing_not_enabled", 503);

  const { id } = await Promise.resolve(ctx.params);
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const action = body.action;
  if (!action) return err("bad_request", "action_required", 400);

  const db = getSupabaseAdmin();
  const { data: card, error: fetchErr } = await db
    .from("zenipay_merchant_cards")
    .select("*")
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (fetchErr) return err("server_error", fetchErr.message, 500);
  if (!card) return err("not_found", "card_not_found", 404);

  try {
    if (action === "freeze") await provider.freezeCard(card.provider_card_id);
    else if (action === "unfreeze") await provider.unfreezeCard(card.provider_card_id);
    else if (action === "cancel") await provider.cancelCard(card.provider_card_id);
    else if (action === "update_limits") {
      await provider.updateSpendingLimit({
        provider_card_id: card.provider_card_id,
        daily: body.daily ?? null,
        monthly: body.monthly ?? null,
      });
    } else {
      return err("bad_request", "action_invalid", 400);
    }
  } catch (e) {
    return err("bad_gateway", "provider_mutation_failed", 502, e instanceof Error ? e.message : String(e));
  }

  const update: Record<string, unknown> = {};
  if (action === "freeze")   update.status = "frozen";
  if (action === "unfreeze") update.status = "active";
  if (action === "cancel") { update.status = "cancelled"; update.cancelled_at = new Date().toISOString(); }
  if (action === "update_limits") {
    if (body.daily   != null) update.spending_limit_daily   = body.daily;
    if (body.monthly != null) update.spending_limit_monthly = body.monthly;
  }

  const { data: updated, error: updErr } = await db
    .from("zenipay_merchant_cards")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (updErr) return err("server_error", updErr.message, 500);

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: `card.${action}`,
    resource_type: "zenipay_merchant_cards",
    resource_id: id,
    new_value: update,
    ip_address: req.headers.get("x-forwarded-for") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
    severity: action === "cancel" ? "warning" : "info",
  });

  return NextResponse.json({ success: true, card: updated });
}
