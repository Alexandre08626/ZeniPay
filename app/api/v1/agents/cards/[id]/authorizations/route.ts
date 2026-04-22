// GET /api/v1/agents/cards/[id]/authorizations — paginated auth history.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 100)));

  const db = getAgentsDb();
  // Scope check: card must belong to org.
  const { data: card } = await db
    .from("issued_cards").select("id, organization_id")
    .eq("id", id).eq("organization_id", auth.organizationId).is("deleted_at", null)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await db
    .from("card_authorizations")
    .select("id, amount_cents, currency, merchant_name, merchant_category, merchant_country, decision, decision_reason, occurred_at, created_at, transaction_id")
    .eq("card_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ authorizations: data ?? [] });
}
