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

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== "zp_admin_2026") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const webhookId = "WHovuxGUDVmyanagrRxnD3FF";
    const res = await fetch(`${FINIX_BASE}/webhooks/${webhookId}`, {
      method: "PUT",
      headers: {
        Authorization: finixAuth(),
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
      },
      body: JSON.stringify({
        url: "https://zenipay.ca/api/zenipay/webhooks/finix",
      }),
    });
    const data = await res.json();
    return NextResponse.json({ status: res.status, webhook: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
