// POST /api/v1/agents/cards/[id]/pause  — issuer + DB

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getIssuer } from "@/lib/agents/issuing/registry";
import { logEvent } from "@/lib/agents/audit-log";
import type { IssuerProvider } from "@/lib/agents/issuing/types";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();

  const { data: card } = await db
    .from("issued_cards")
    .select("id, issuer_provider, external_card_id, organization_id, status")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((card as { status: string }).status === "canceled") {
    return NextResponse.json({ error: "cannot_pause_canceled_card" }, { status: 422 });
  }

  const provider = (card as { issuer_provider: IssuerProvider }).issuer_provider;
  const external = (card as { external_card_id: string | null }).external_card_id;
  if (external) {
    try { await getIssuer(provider).pauseCard(external); } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "issuer pause failed" }, { status: 502 });
    }
  }

  const { data: updated, error } = await db
    .from("issued_cards")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "card.paused",
    payload: { card_id: id },
  });
  return NextResponse.json({ card: updated });
}
