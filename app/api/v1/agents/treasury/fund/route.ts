// POST /api/v1/agents/treasury/fund
//   Body: { funding_source_id, amount_cents, currency? }
//   Headers: Idempotency-Key (required for money-moving calls)
//
//   Routes to the concrete FundingSourceProvider. Synchronous sources
//   (finix_card, zenipay_merchant_wallet) settle immediately; async sources
//   (usdc_wallet, wire_ach, sepa) return deposit instructions + a
//   pending topup intent.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getProvider } from "@/lib/agents/treasury/funding-sources/registry";
import { FundingSourceNotImplemented } from "@/lib/agents/treasury/funding-sources/interface";
import { logEvent } from "@/lib/agents/audit-log";
import type { Currency, FundingSource } from "@/lib/agents/treasury/types";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const sourceId: string | undefined = body?.funding_source_id;
  const amountCents = Number(body?.amount_cents);
  const currency: Currency = (body?.currency ?? "USD") as Currency;
  const idempotencyKey = req.headers.get("idempotency-key") ?? body?.idempotency_key ?? null;

  if (!sourceId) return NextResponse.json({ error: "funding_source_id required" }, { status: 400 });
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "amount_cents must be a positive integer" }, { status: 400 });
  }
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header required for money-moving calls" }, { status: 400 });
  }

  const db = getAgentsDb();
  const { data: source } = await db
    .from("funding_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!source) return NextResponse.json({ error: "funding_source_not_found" }, { status: 404 });
  if ((source as FundingSource).status !== "verified") {
    return NextResponse.json({ error: "funding_source_not_verified", status: (source as FundingSource).status }, { status: 422 });
  }

  try {
    const provider = getProvider((source as FundingSource).type);
    const result = await provider.initiate({
      source: source as FundingSource,
      organizationId: auth.organizationId,
      amountCents,
      currency,
      idempotencyKey,
      actor: auth.via === "api_key" ? null : null,
    });

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? null,
      eventType: "treasury.funded",
      payload: { funding_source_id: sourceId, amount_cents: amountCents, currency, result },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FundingSourceNotImplemented) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
