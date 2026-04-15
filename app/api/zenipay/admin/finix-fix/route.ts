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

async function finixReq(method: string, path: string, body?: object): Promise<{status:number;data:Record<string,unknown>}> {
  const res = await fetch(`${FINIX_BASE}${path}`, {
    method,
    headers: { Authorization: finixAuth(), "Content-Type": "application/json", "Finix-Version": "2022-02-01" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}

export async function GET(req: NextRequest) {
  const R: Record<string, unknown> = {};

  const merchantId = process.env.FINIX_MERCHANT_ID;
  if (!merchantId) {
    return NextResponse.json({ error: "FINIX_MERCHANT_ID not configured" }, { status: 500 });
  }
  const identityId = process.env.FINIX_MERCHANT_IDENTITY_ID;
  if (!identityId) {
    return NextResponse.json({ error: "FINIX_MERCHANT_IDENTITY_ID not configured" }, { status: 500 });
  }

  // Raise max transaction limit to $50,000
  const limitUpdate = await finixReq("PUT", "/identities/" + identityId, { entity: { max_transaction_amount: 5000000 } });
  R.limit_update = { status: limitUpdate.status, max: (limitUpdate.data as any)?.entity?.max_transaction_amount };

  // 1. Fix webhook URL to zenipay.ca
  const whId = "WHovuxGUDVmyanagrRxnD3FF";
  const whFix = await finixReq("PUT", `/webhooks/${whId}`, { url: "https://zenipay.ca/api/zenipay/webhooks/finix" });
  R.webhook_fix = { status: whFix.status, url: whFix.data?.url, enabled: whFix.data?.enabled };

  // 2. Verify webhook
  const whCheck = await finixReq("GET", `/webhooks/${whId}`);
  R.webhook_verified = { url: whCheck.data?.url, enabled: whCheck.data?.enabled, accepting: whCheck.data?.is_accepting_events };

  // 3. Fee profile
  const fp = await finixReq("GET", "/fee_profiles/FPmtT4MYmiAs1qjLjneQmk4d");
  R.fee_profile = fp;

  // Server-side payment instrument creation removed for PCI compliance.
  // Test payments must be made through the checkout page with Finix.js tokenization.
  R.test_payments = {
    message: "Server-side payment instrument creation has been removed for PCI compliance",
    note: "Test payments must be made through the checkout page using Finix.js tokenization",
    test_url: "/pay/test-link?amount=1&currency=USD&desc=Test",
  };

  return NextResponse.json(R);
}
