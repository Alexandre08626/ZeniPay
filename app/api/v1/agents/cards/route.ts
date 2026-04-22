// GET  /api/v1/agents/cards           list cards for org (filter: agent_id, status)
// POST /api/v1/agents/cards           issue a new card (routes to issuer by org default)

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getIssuer, defaultIssuerName } from "@/lib/agents/issuing/registry";
import { logEvent } from "@/lib/agents/audit-log";
import type { SpendingControls, IssuerProvider } from "@/lib/agents/issuing/types";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");

  const db = getAgentsDb();
  let q = db
    .from("issued_cards")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (agentId) q = q.eq("agent_id", agentId);
  if (status)  q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key header required" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));

  const agentId: string | undefined = body?.agent_id;
  const cardholderType = (body?.cardholder_type ?? "agent") as "agent" | "human_employee" | "org_generic";
  const currency: SpendingControls["currency"] = (body?.currency ?? "USD") as SpendingControls["currency"];
  const cardType: "virtual" | "physical" = body?.card_type === "physical" ? "physical" : "virtual";
  const controls: Partial<SpendingControls> = body?.spending_controls ?? {};

  if (cardholderType === "agent" && !agentId) {
    return NextResponse.json({ error: "agent_id required when cardholder_type='agent'" }, { status: 400 });
  }

  const db = getAgentsDb();

  // Idempotency replay via external_card_id (we use idempotencyKey as a
  // card_authorizations-style key; for card issuance we encode the key into
  // metadata and search by our internal cardholder_ref+key pair).
  const { data: priorCard } = await db
    .from("issued_cards")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .contains("spending_controls", { _idem: idempotencyKey })
    .is("deleted_at", null)
    .maybeSingle();
  if (priorCard) return NextResponse.json({ card: priorCard, replayed: true });

  // Scope check: agent must belong to org (if provided).
  let agentName: string | null = null;
  if (agentId) {
    const { data: agent } = await db
      .from("agents")
      .select("id, name, organization_id")
      .eq("id", agentId)
      .maybeSingle();
    if (!agent || agent.organization_id !== auth.organizationId) {
      return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
    }
    agentName = agent.name;
  }

  // Resolve (or create) a wallet to back the card.
  let ledgerWalletId: string | null = null;
  if (agentId) {
    const { data: wallet } = await db.from("agent_wallets").select("id").eq("agent_id", agentId).maybeSingle();
    ledgerWalletId = wallet?.id ?? null;
  }

  // Spending controls — merge defaults (blocked travel MCCs are applied at
  // issuer layer). Ensure currency is set.
  const fullControls: SpendingControls = {
    currency,
    per_tx_cap_cents: controls.per_tx_cap_cents,
    daily_cap_cents: controls.daily_cap_cents,
    weekly_cap_cents: controls.weekly_cap_cents,
    monthly_cap_cents: controls.monthly_cap_cents,
    allowed_mcc: controls.allowed_mcc,
    blocked_mcc: controls.blocked_mcc,
    allowed_merchants: controls.allowed_merchants,
    blocked_merchants: controls.blocked_merchants,
    allowed_countries: controls.allowed_countries,
  };

  // Issue via the default issuer.
  const providerName = defaultIssuerName();
  const issuer = getIssuer(providerName);

  const cardholderName = agentName ?? "ZeniPay Agent";
  const cardholder = await issuer.createCardholder({
    name: cardholderName,
    type: "company",
  });
  const issuerCard = await issuer.createCard({
    cardholder_id: cardholder.id,
    card_type: cardType,
    currency,
    spending_controls: fullControls,
    metadata: { organization_id: auth.organizationId, agent_id: agentId ?? "", idempotency_key: idempotencyKey },
  });

  // Persist in our DB.
  const persistedControls = { ...fullControls, _idem: idempotencyKey };
  const { data: persisted, error: insertErr } = await db
    .from("issued_cards")
    .insert({
      organization_id: auth.organizationId,
      agent_id: agentId ?? null,
      cardholder_type: cardholderType,
      cardholder_ref: agentId ?? cardholder.id,
      issuer_provider: providerName as IssuerProvider,
      external_card_id: issuerCard.id,
      external_cardholder_id: cardholder.id,
      network: issuerCard.network,
      card_type: issuerCard.card_type,
      currency: issuerCard.currency,
      status: "active",
      spending_controls: persistedControls,
      ledger_wallet_id: ledgerWalletId,
      last4: issuerCard.last4,
      expiry_month: issuerCard.expiry_month,
      expiry_year: issuerCard.expiry_year,
      activated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (insertErr || !persisted) return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "card.issued",
    payload: { card_id: persisted.id, agent_id: agentId, provider: providerName, last4: issuerCard.last4 },
  });

  return NextResponse.json({ card: persisted, replayed: false });
}
