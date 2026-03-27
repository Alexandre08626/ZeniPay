export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
const FINIX_BASE = process.env.FINIX_ENV === "production" ? "https://finix.live-payments-api.com" : "https://finix.sandbox-payments-api.com";
function finixAuth() { return "Basic " + Buffer.from((process.env.FINIX_API_USERNAME||"")+":"+(process.env.FINIX_API_PASSWORD||"")).toString("base64"); }
export async function GET() {
  const identityId = process.env.FINIX_MERCHANT_IDENTITY_ID || "IDoCxHhKh8e1M1MjeW3RDoKD";
  const res = await fetch(FINIX_BASE + "/identities/" + identityId, {
    method: "PUT",
    headers: { Authorization: finixAuth(), "Content-Type": "application/json", "Finix-Version": "2022-02-01" },
    body: JSON.stringify({ entity: { max_transaction_amount: 5000000 } }),
  });
  const data = await res.json();
  return NextResponse.json({ status: res.status, max_transaction_amount: data?.entity?.max_transaction_amount, data });
}
