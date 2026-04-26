// GET /api/v1/accounting/connect-url?merchant_id=&provider=&type=
//
// Returns the OAuth start URL for a given provider. The real OAuth
// flows will be wired per-provider in follow-up commits; for now we
// return 503 "coming_soon" when the env flag isn't set, so the UI
// shows a polite "Get notified" CTA instead of a broken redirect.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

type Provider = "quickbooks" | "xero" | "wave" | "freshbooks";
const FLAGS: Record<Provider, string> = {
  quickbooks: "QUICKBOOKS_OAUTH_ENABLED",
  xero:       "XERO_OAUTH_ENABLED",
  wave:       "WAVE_OAUTH_ENABLED",
  freshbooks: "FRESHBOOKS_OAUTH_ENABLED",
};

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const provider   = (req.nextUrl.searchParams.get("provider") ?? "").toLowerCase() as Provider;
  if (!FLAGS[provider]) {
    return NextResponse.json({ error: { code: "bad_request", message: "unknown_provider" } }, { status: 400 });
  }
  if (process.env[FLAGS[provider]] !== "true") {
    return NextResponse.json({
      error: { code: "coming_soon", message: `${provider} OAuth not enabled yet` },
    }, { status: 503 });
  }

  // When wiring a real OAuth adapter, build the authorize URL here and
  // return { url }. e.g. for QuickBooks:
  //   const url = new URL("https://appcenter.intuit.com/connect/oauth2");
  //   url.searchParams.set("client_id", process.env.QB_CLIENT_ID!);
  //   url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  //   url.searchParams.set("redirect_uri", `${base}/api/v1/accounting/callback`);
  //   url.searchParams.set("response_type", "code");
  //   url.searchParams.set("state", signedState({ merchantId, provider }));
  //   return NextResponse.json({ url: url.toString() });
  return NextResponse.json({
    error: { code: "not_implemented", message: `${provider} adapter stubbed — wire the OAuth start URL here` },
  }, { status: 501 });
}
