// GET /api/v1/bank/connect-url?merchant_id=...&type=business|personal
//
// Returns a signed MX Connect widget URL + the mx_user_guid. The
// frontend drops the URL into an iframe in a Dialog. When the user
// finishes connecting, MX posts a memberConnected message; the page
// passes it to /api/v1/bank/callback.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isMXEnabled, getConnectWidgetUrl } from "@/lib/mx/mx-client";

export async function GET(req: NextRequest) {
  if (!isMXEnabled()) {
    return NextResponse.json({ available: false, provider: "mx" });
  }

  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  const type = (req.nextUrl.searchParams.get("type") ?? "business").toLowerCase() as "business" | "personal";

  try {
    const { url, userGuid } = await getConnectWidgetUrl({ merchantId, connectionType: type });
    return NextResponse.json({ available: true, provider: "mx", url, user_guid: userGuid });
  } catch (e) {
    return NextResponse.json({
      error: { code: "mx_error", message: e instanceof Error ? e.message : String(e) },
    }, { status: 502 });
  }
}
