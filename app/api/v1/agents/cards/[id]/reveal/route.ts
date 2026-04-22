// POST /api/v1/agents/cards/[id]/reveal
//
// Returns an ephemeral URL to view the PAN + CVC. TTL 60s.
//
// - stripe_issuing: calls stripe.ephemeralKeys.create + returns the secret
//   so the client can render Stripe's secure iframe.
// - mock:           returns a signed URL to /agents/cards/[id]/mock-reveal
//   with HMAC token (60s TTL) that resolves to a fake PAN.
//
// We NEVER put the PAN into our API response or our database. Rule 3.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import { stripeIssuingAvailable } from "@/lib/agents/issuing/stripe-issuing/provider";
import type { IssuerProvider } from "@/lib/agents/issuing/types";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

const TTL_SECONDS = 60;

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();

  const { data: card } = await db
    .from("issued_cards")
    .select("id, issuer_provider, external_card_id, status, organization_id")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const c = card as { id: string; issuer_provider: IssuerProvider; external_card_id: string | null; status: string };

  if (c.status !== "active" && c.status !== "paused") {
    return NextResponse.json({ error: "card_not_revealable", status: c.status }, { status: 422 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;

  let resp: Record<string, unknown>;
  if (c.issuer_provider === "stripe_issuing" && stripeIssuingAvailable() && c.external_card_id) {
    const stripe = (await import("@/lib/agents/issuing/stripe-issuing/provider"));
    // Use require-style access into the cached Stripe instance.
    // (Provider module re-exposes a helper only if needed — we call the REST API directly.)
    const Stripe = (await import("stripe")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = new Stripe(process.env.STRIPE_ISSUING_SECRET_KEY!, { apiVersion: "2024-06-20" as any });
    const ek = await s.ephemeralKeys.create(
      { issuing_card: c.external_card_id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { apiVersion: "2024-06-20" } as any,
    );
    resp = {
      provider: "stripe_issuing",
      ephemeral_key_secret: ek.secret,
      card_id: c.external_card_id,
      expires_at: expiresAt,
    };
    void stripe; // keep imports used
  } else {
    // Mock: HMAC-signed token the reveal page can verify.
    const secret = process.env.ZP_CARD_REVEAL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const payload = `${c.id}.${expiresAt}`;
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    resp = {
      provider: "mock",
      url: `/agents/cards/${c.id}/mock-reveal?token=${sig}&exp=${expiresAt}`,
      expires_at: expiresAt,
    };
  }

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "card.reveal_url_generated",
    payload: { card_id: id, expires_at: expiresAt, provider: c.issuer_provider },
  });

  return NextResponse.json(resp);
}
