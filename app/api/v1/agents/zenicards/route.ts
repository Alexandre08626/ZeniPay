// GET  /api/v1/agents/zenicards
// POST /api/v1/agents/zenicards          { agent_id?, product_tier, currency, limit_per_tx?, limit_daily? }
// PATCH /api/v1/agents/zenicards         { card_id, action: 'pause'|'resume'|'cancel' }
//
// All paths require the authenticated session (agents API key OR dashboard
// session with org id). GET never returns the full PAN or CVV. POST returns
// the full PAN + CVV plaintext ONCE — displayed to the CFO, never persisted
// client-side. PATCH flips status via a direct UPDATE; the underlying
// zenicore account is NOT released here (existing holds stay until they
// naturally expire / settle — that's correct: canceling a card shouldn't
// refund in-flight auths).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../_lib/auth";
import { errorResponse, serverError } from "../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { logEvent } from "@/lib/agents/audit-log";

const PRODUCT_TIERS = ["standard", "premium", "enterprise"] as const;
const CURRENCIES = ["USD", "CAD", "EUR", "USDC"] as const;
const ACTIONS = ["pause", "resume", "cancel"] as const;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_env_missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ---------------------------------------------------------------------------
// GET — list org's cards. No PAN/CVV.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).schema("zenicards").from("cards")
      .select("id, card_number_last4, expiry_month, expiry_year, organization_id, agent_id, zenicore_account_id, status, spending_limit_per_tx_micro, spending_limit_daily_micro, spending_limit_monthly_micro, allowed_merchant_types, created_at, canceled_at, bin_range_id")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return errorResponse("server_error", error.message);

    // Pull the bin-range meta for display (product_tier, currency).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bins } = await (supabase as any).schema("zenicards").from("bin_ranges")
      .select("id, bin_prefix, name, product_tier, currency")
      .eq("active", true);
    const binById = new Map<string, { bin_prefix: string; name: string; product_tier: string; currency: string }>(
      ((bins ?? []) as Array<{ id: string; bin_prefix: string; name: string; product_tier: string; currency: string }>)
        .map((b) => [b.id, b]),
    );

    const cards = ((data ?? []) as Array<{
      id: string; card_number_last4: string; expiry_month: number; expiry_year: number;
      organization_id: string; agent_id: string | null; zenicore_account_id: string;
      status: string; spending_limit_per_tx_micro: string | null;
      spending_limit_daily_micro: string | null; spending_limit_monthly_micro: string | null;
      allowed_merchant_types: string[]; created_at: string; canceled_at: string | null;
      bin_range_id: string;
    }>).map((c) => ({
      id: c.id,
      last4: c.card_number_last4,
      expiry_month: c.expiry_month,
      expiry_year: c.expiry_year,
      agent_id: c.agent_id,
      status: c.status,
      zenicore_account_id: c.zenicore_account_id,
      limit_per_tx_micro: c.spending_limit_per_tx_micro,
      limit_daily_micro: c.spending_limit_daily_micro,
      allowed_merchant_types: c.allowed_merchant_types,
      bin: binById.get(c.bin_range_id) ?? null,
      created_at: c.created_at,
      canceled_at: c.canceled_at,
    }));

    return NextResponse.json({ cards });
  } catch (e) { return serverError(e); }
}

// ---------------------------------------------------------------------------
// POST — issue. Returns PAN + CVV ONCE.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const body = await req.json().catch(() => ({}));

    const product_tier = String(body?.product_tier ?? "standard");
    if (!PRODUCT_TIERS.includes(product_tier as typeof PRODUCT_TIERS[number])) {
      return errorResponse("bad_request", `product_tier must be one of ${PRODUCT_TIERS.join(", ")}`);
    }
    const currency = String(body?.currency ?? "CAD");
    if (!CURRENCIES.includes(currency as typeof CURRENCIES[number])) {
      return errorResponse("bad_request", `currency must be one of ${CURRENCIES.join(", ")}`);
    }
    const agent_id = body?.agent_id ? String(body.agent_id) : null;
    const limit_per_tx = body?.limit_per_tx ? Number(body.limit_per_tx) : null;
    const limit_daily  = body?.limit_daily  ? Number(body.limit_daily)  : null;
    if ((limit_per_tx != null && !Number.isFinite(limit_per_tx)) ||
        (limit_daily  != null && !Number.isFinite(limit_daily))) {
      return errorResponse("bad_request", "limit values must be numeric units");
    }

    const supabase = getSupabase();
    const postedBy = auth.userId ? `user:${auth.userId}` : auth.apiKeyId ? `api_key:${auth.apiKeyId}` : "zenipay_system";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).schema("zenicards").rpc("issue_card", {
      p_organization_id: auth.organizationId,
      p_agent_id: agent_id,
      p_product_tier: product_tier,
      p_currency: currency,
      p_spending_limit_per_tx_units: limit_per_tx,
      p_spending_limit_daily_units: limit_daily,
      p_created_by: postedBy,
    });
    if (error) return errorResponse("server_error", error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (data as any[])?.[0];
    if (!row) return errorResponse("server_error", "issue_card returned no row");

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? auth.userId ?? null,
      eventType: "zenicard.issued",
      payload: {
        card_id: row.card_id,
        last4: row.card_number_last4,
        product_tier,
        currency,
        agent_id,
      },
    });

    return NextResponse.json({
      card: {
        card_id:   row.card_id,
        last4:     row.card_number_last4,
        expiry_month: row.expiry_month,
        expiry_year:  row.expiry_year,
        zenicore_account_id: row.zenicore_account_id,
      },
      // Sensitive — shown ONCE, never returned again.
      reveal_once: {
        card_number_full: row.card_number_full,
        cvv_plaintext:    row.cvv_plaintext,
      },
    });
  } catch (e) { return serverError(e); }
}

// ---------------------------------------------------------------------------
// PATCH — state change (pause / resume / cancel).
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const body = await req.json().catch(() => ({}));
    const card_id = String(body?.card_id ?? "");
    const action = String(body?.action ?? "") as typeof ACTIONS[number];
    if (!card_id || !ACTIONS.includes(action)) {
      return errorResponse("bad_request", `card_id + action (${ACTIONS.join("|")}) required`);
    }

    const supabase = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: card } = await (supabase as any).schema("zenicards").from("cards")
      .select("id, status").eq("id", card_id).eq("organization_id", auth.organizationId)
      .maybeSingle();
    if (!card) return errorResponse("not_found", "card_not_found");
    const current = (card as { status: string }).status;
    if (current === "canceled") return errorResponse("unprocessable", "card_already_canceled");

    let next: string;
    if (action === "pause")       next = "paused";
    else if (action === "resume") next = "active";
    else                          next = "canceled";

    const patch: Record<string, unknown> = { status: next };
    if (action === "cancel") patch.canceled_at = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase as any).schema("zenicards").from("cards")
      .update(patch).eq("id", card_id).eq("organization_id", auth.organizationId)
      .select("id, status, canceled_at").maybeSingle();
    if (error) return errorResponse("server_error", error.message);

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? auth.userId ?? null,
      eventType: `zenicard.${action}d`,
      payload: { card_id, action, prev_status: current, next_status: next },
    });

    return NextResponse.json({ card: updated });
  } catch (e) { return serverError(e); }
}
