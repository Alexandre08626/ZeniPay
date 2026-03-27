export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const FINIX_BASE = "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identity_id, account_number, routing_number, account_type, name } = body;

    if (!identity_id || !account_number || !routing_number) {
      return NextResponse.json(
        { error: "identity_id, account_number, and routing_number are required" },
        { status: 400 },
      );
    }

    const finixBody = {
      identity: identity_id,
      type: "BANK_ACCOUNT",
      account_number,
      bank_code: routing_number,
      account_type: account_type || "CHECKING",
      name: name || "",
      country: "USA",
      currency: "USD",
    };

    const res = await fetch(`${FINIX_BASE}/payment_instruments`, {
      method: "POST",
      headers: {
        Authorization: finixAuth(),
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
      },
      body: JSON.stringify(finixBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Finix API error", details: data },
        { status: res.status },
      );
    }

    return NextResponse.json({
      instrument_id: data.id,
      instrument: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
