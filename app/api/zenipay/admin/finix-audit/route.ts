export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const FINIX_BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function finixGet(path: string) {
  const res = await fetch(`${FINIX_BASE}${path}`, {
    headers: {
      Authorization: finixAuth(),
      "Content-Type": "application/json",
      "Finix-Version": "2022-02-01",
    },
  });
  return { status: res.status, data: await res.json() };
}

export async function GET(req: NextRequest) {
  try {
    const merchantId = process.env.FINIX_MERCHANT_ID;
    if (!merchantId) {
      return NextResponse.json({ error: "FINIX_MERCHANT_ID not configured" }, { status: 500 });
    }
    const identityId = process.env.FINIX_MERCHANT_IDENTITY_ID;
    if (!identityId) {
      return NextResponse.json({ error: "FINIX_MERCHANT_IDENTITY_ID not configured" }, { status: 500 });
    }

    const merchant = await finixGet(`/merchants/${merchantId}`);
    const verifications = await finixGet(`/merchants/${merchantId}/verifications`);
    const webhooks = await finixGet(`/webhooks`);
    const settlements = await finixGet(`/settlements?limit=5`);
    const transfers = await finixGet(`/transfers?limit=5&sort=created_at,desc`);

    return NextResponse.json({
      env: process.env.FINIX_ENV || "sandbox",
      base_url: FINIX_BASE,
      merchant_id: merchantId,
      identity_id: identityId,
      has_credentials: !!(process.env.FINIX_API_USERNAME && process.env.FINIX_API_PASSWORD),
      merchant,
      verifications,
      webhooks,
      settlements,
      transfers,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
