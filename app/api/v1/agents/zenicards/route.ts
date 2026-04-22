// GET  /api/v1/agents/zenicards
// POST /api/v1/agents/zenicards          { agent_id?, product_tier, currency, limit_per_tx?, limit_daily? }
// PATCH /api/v1/agents/zenicards         { card_id, action: 'pause'|'resume'|'cancel' }
//
// All paths require the authenticated session (agents API key OR dashboard
// session with org id). GET never returns the full PAN or CVV. POST returns
// the full PAN + CVV plaintext ONCE — displayed to the CFO, never persisted
// client-side. PATCH flips status through the public.zcards_update_status
// wrapper (no refund of in-flight holds — canceling a card doesn't free
// pending_debit).
//
// The `zenicards` schema is not exposed to PostgREST, so every call routes
// through the public.zcards_* SECURITY DEFINER wrappers shipped in
// migration 20260422184457_zenicore_zenicards_public_wrappers.

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

interface ZcCardRow {
  id: string;
  card_number_last4: string;
  expiry_month: number;
  expiry_year: number;
  organization_id: string;
  agent_id: string | null;
  zenicore_account_id: string;
  status: string;
  spending_limit_per_tx_micro: string | number | null;
  spending_limit_daily_micro: string | number | null;
  spending_limit_monthly_micro: string | number | null;
  allowed_merchant_types: string[];
  balance_micro: string | number;
  currency: string;
  created_at: string;
  canceled_at: string | null;
  created_by: string | null;
}

// ---------------------------------------------------------------------------
// GET — list org's cards. No PAN/CVV.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("zcards_get_cards", {
      p_organization_id: auth.organizationId,
    });
    if (error) return errorResponse("server_error", error.message);

    // The zcards_get_cards wrapper does NOT join bin_ranges (no wrapper
    // exists for that table). The BIN prefix can still be inferred from
    // the `currency` column + the 6-digit prefix convention: 991001/991002/
    // 991003 are CAD, 991101 is USD. For now the UI shows "BIN 991xxx" —
    // good enough; we can add zcards_get_bin_ranges() later if needed.
    const cards = ((data ?? []) as ZcCardRow[]).map((c) => ({
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
      currency: c.currency.trim(),
      balance_micro: c.balance_micro,
      bin: null,   // bin_ranges not reachable through a public wrapper yet
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
    const { data, error } = await supabase.rpc("zcards_issue_card", {
      p_organization_id: auth.organizationId,
      p_agent_id: agent_id,
      p_product_tier: product_tier,
      p_currency: currency,
      p_spending_limit_per_tx_units: limit_per_tx,
      p_spending_limit_daily_units: limit_daily,
      p_created_by: postedBy,
    });
    if (error) return errorResponse("server_error", error.message);
    const row = (data as Array<{
      card_id: string;
      card_number_full: string;
      card_number_last4: string;
      expiry_month: number;
      expiry_year: number;
      cvv_plaintext: string;
      zenicore_account_id: string;
    }>)?.[0];
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

    // Org-scope the card by loading it first through zcards_get_cards and
    // verifying the card belongs to the caller's org. Cheap (~hundreds of
    // cards at worst) and avoids trusting the client.
    const { data: listed, error: listErr } = await supabase.rpc("zcards_get_cards", {
      p_organization_id: auth.organizationId,
    });
    if (listErr) return errorResponse("server_error", listErr.message);
    const owned = ((listed ?? []) as Array<{ id: string; status: string }>)
      .find((c) => c.id === card_id);
    if (!owned) return errorResponse("not_found", "card_not_found");
    const current = owned.status;
    if (current === "canceled") return errorResponse("unprocessable", "card_already_canceled");

    const next = action === "pause" ? "paused"
               : action === "resume" ? "active"
               : "canceled";

    const { data: updated, error } = await supabase.rpc("zcards_update_status", {
      p_card_id: card_id,
      p_new_status: next,
    });
    if (error) return errorResponse("server_error", error.message);
    const updatedRow = (updated as Array<{ id: string; status: string; updated_at: string }>)?.[0] ?? null;

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? auth.userId ?? null,
      eventType: `zenicard.${action}d`,
      payload: { card_id, action, prev_status: current, next_status: next },
    });

    return NextResponse.json({
      card: updatedRow
        ? { id: updatedRow.id, status: updatedRow.status, canceled_at: next === "canceled" ? updatedRow.updated_at : null }
        : null,
    });
  } catch (e) { return serverError(e); }
}
