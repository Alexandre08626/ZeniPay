// POST /api/v1/agents/_dev/simulate-authorization
//
// Drives the same authorizeCardSpend() engine as the real Stripe webhook,
// but without requiring a Stripe account. Used by:
//   - Demo flows (show an auth decision + audit log on camera)
//   - E2E tests (deterministic scenarios)
//
// Gate: NODE_ENV !== 'production' OR the request carries
//       x-zp-dev-simulation: <shared-secret-from-env>.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { authorizeCardSpend } from "@/lib/agents/issuing/authorize";

function devAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const want = process.env.ZP_DEV_SIMULATION_SECRET;
  const got = req.headers.get("x-zp-dev-simulation");
  return !!(want && got && want === got);
}

export async function POST(req: NextRequest) {
  if (!devAllowed(req)) return NextResponse.json({ error: "not_allowed_in_production" }, { status: 403 });
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const cardId: string | undefined = body?.card_id;
  const amountCents = Number(body?.amount_cents);
  if (!cardId || !Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "card_id + positive amount_cents required" }, { status: 400 });
  }

  const result = await authorizeCardSpend({
    cardId,
    amountCents,
    currency: String(body?.currency ?? "USD"),
    merchantName: body?.merchant_name ?? undefined,
    merchantCategory: body?.merchant_category ?? undefined,
    merchantNetworkId: body?.merchant_network_id ?? undefined,
    merchantCountry: body?.merchant_country ?? undefined,
    idempotencyKey: body?.idempotency_key ?? undefined,
  });
  return NextResponse.json(result);
}
