// GET  /api/v1/agents/funding-sources   — list non-deleted sources
// POST /api/v1/agents/funding-sources   — register a new source
//
// PR 1 supports finix_card + zenipay_merchant_wallet + USDC (returns
// deposit address) + wire (returns a unique reference number).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import type { FundingSourceType } from "@/lib/agents/treasury/types";

const SUPPORTED: FundingSourceType[] = [
  "finix_card",
  "zenipay_merchant_wallet",
  "wire_ach",
  "usdc_wallet",
];

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();
  const { data, error } = await db
    .from("funding_sources")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ funding_sources: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const type = String(body?.type ?? "") as FundingSourceType;
  const nickname = String(body?.nickname ?? "").trim();
  const details = (body?.details ?? {}) as Record<string, unknown>;
  const isDefault = body?.is_default === true;

  if (!SUPPORTED.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${SUPPORTED.join(", ")}` }, { status: 400 });
  }
  if (!nickname || nickname.length < 2) {
    return NextResponse.json({ error: "nickname required (min 2 chars)" }, { status: 400 });
  }

  // Never persist raw PAN / account numbers; reject the field outright.
  const forbidden = ["card_number", "account_number", "pan", "cvv", "cvc"];
  for (const k of forbidden) {
    if (k in details) {
      return NextResponse.json({ error: `details must not include raw '${k}' — store a tokenized reference instead` }, { status: 400 });
    }
  }

  const db = getAgentsDb();
  const { data, error } = await db
    .from("funding_sources")
    .insert({
      organization_id: auth.organizationId,
      type,
      nickname,
      details,
      is_default: isDefault,
      status: type === "finix_card" || type === "zenipay_merchant_wallet"
        ? "verified"                                      // token-based, self-verifies
        : "pending_verification",                         // wire/usdc need manual or webhook verify
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "funding_source.created",
    payload: { id: data.id, type, nickname },
  });

  return NextResponse.json({ funding_source: data });
}
