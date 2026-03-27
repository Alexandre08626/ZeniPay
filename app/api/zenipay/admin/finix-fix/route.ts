export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

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

export async function GET() {
  const R: Record<string, unknown> = {};
  // Raise max transaction limit to 0,000
  const identityId2 = process.env.FINIX_MERCHANT_IDENTITY_ID || "IDoCxHhKh8e1M1MjeW3RDoKD";
  const limitUpdate = await finixReq("PUT", "/identities/" + identityId2, { entity: { max_transaction_amount: 5000000 } });
  R.limit_update = { status: limitUpdate.status, max: (limitUpdate.data as any)?.entity?.max_transaction_amount };

  const merchantId = process.env.FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc";
  const identityId = process.env.FINIX_MERCHANT_IDENTITY_ID || "IDoCxHhKh8e1M1MjeW3RDoKD";

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

  // 4. Test SUCCESS payment
  const inst = await finixReq("POST", "/payment_instruments", {
    type: "PAYMENT_CARD", number: "4111111111111111", expiration_month: 12, expiration_year: 2029,
    security_code: "123", name: "Finix Test", address: { postal_code: "94404" }, identity: identityId,
  });
  R.test_card = { id: inst.data?.id, brand: inst.data?.brand, last4: inst.data?.last_four };
  if (inst.data?.id) {
    const tx = await finixReq("POST", "/transfers", {
      merchant: merchantId, amount: 100, currency: "USD", source: inst.data.id,
      operation_key: "SALE", tags: { test: "approval_e2e", source: "zenipay" },
    });
    R.test_success = { id: tx.data?.id, state: tx.data?.state, amount: tx.data?.amount };
  }

  // 5. Test FAIL payment
  const failInst = await finixReq("POST", "/payment_instruments", {
    type: "PAYMENT_CARD", number: "4000000000000002", expiration_month: 12, expiration_year: 2029,
    security_code: "123", name: "Fail Test", address: { postal_code: "94404" }, identity: identityId,
  });
  if (failInst.data?.id) {
    const failTx = await finixReq("POST", "/transfers", {
      merchant: merchantId, amount: 100, currency: "USD", source: failInst.data.id,
      operation_key: "SALE", tags: { test: "approval_fail_test" },
    });
    R.test_fail = { id: failTx.data?.id, state: failTx.data?.state, failure_code: failTx.data?.failure_code };
  }

  return NextResponse.json(R);
}
