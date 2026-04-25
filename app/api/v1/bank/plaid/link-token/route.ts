// GET /api/v1/bank/plaid/link-token?merchant_id=...
//
// Returns { available, link_token } for the Plaid Link widget. The
// link_token is short-lived (~30 min) and tied to the merchant via
// client_user_id.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isPlaidEnabled, createLinkToken } from "@/lib/plaid/plaid-client";

export async function GET(req: NextRequest) {
  if (!isPlaidEnabled()) {
    return NextResponse.json({ available: false, provider: "plaid" });
  }
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  try {
    const { link_token } = await createLinkToken({ merchantId });
    return NextResponse.json({ available: true, provider: "plaid", link_token });
  } catch (e) {
    return NextResponse.json({
      error: { code: "plaid_error", message: e instanceof Error ? e.message : String(e) },
    }, { status: 502 });
  }
}
