// GET /api/v1/bank/plaid/link-token?merchant_id=...
//
// Returns { available, link_token } for the Plaid Link widget. The
// link_token is short-lived (~30 min) and tied to the merchant via
// client_user_id.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isPlaidEnabled, createLinkToken } from "@/lib/plaid/plaid-client";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  if (!isPlaidEnabled()) {
    return NextResponse.json({ available: false, provider: "plaid" });
  }
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  try {
    const { link_token } = await createLinkToken({ merchantId });
    return NextResponse.json({ available: true, provider: "plaid", link_token });
  } catch (e) {
    return NextResponse.json({
      error: { code: "plaid_error", message: e instanceof Error ? e.message : String(e) },
    }, { status: 502 });
  }
}
