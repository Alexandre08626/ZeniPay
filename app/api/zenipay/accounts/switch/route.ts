export const dynamic = "force-dynamic";

// GET  /api/zenipay/accounts/switch — accounts signed in on this browser.
// POST /api/zenipay/accounts/switch { merchant_id } — make one active.
// Only accounts that were signed into (with their own password) on this
// browser can be activated; see rememberAccount in lib/auth/zp-session.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getZpSession, readRememberedAccounts, rememberAccount, activateAccount } from "@/lib/auth/zp-session";

async function describe(ids: string[]) {
  if (!ids.length) return new Map<string, { email: string; name: string }>();
  const { data } = await getSupabaseAdmin().from("zenipay_merchants").select("id, email, name, company, config").in("id", ids);
  return new Map((data || []).map((m: any) => [String(m.id), {
    email: String(m.email || m.config?.email || ""),
    name: String(m.config?.businessName || m.config?.business_name || m.name || m.company || m.email || "Compte"),
  }]));
}

export async function GET(req: NextRequest) {
  const session = await getZpSession(req);
  if (!session) return NextResponse.json({ accounts: [] }, { status: 401 });
  const remembered = readRememberedAccounts(req);
  const ids = Array.from(new Set([session.merchant_id, ...remembered.map((a) => a.merchant_id)]));
  const info = await describe(ids);
  const res = NextResponse.json({
    current: session.merchant_id,
    accounts: ids.filter((id) => info.has(id)).map((id) => ({ merchant_id: id, ...info.get(id)!, current: id === session.merchant_id })),
  }, { headers: { "Cache-Control": "no-store" } });
  // The signed-in account is always switchable-back-to from here on.
  rememberAccount(req, res, session.merchant_id, session.mode);
  return res;
}

export async function POST(req: NextRequest) {
  const session = await getZpSession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const target = readRememberedAccounts(req).find((a) => a.merchant_id === String(body.merchant_id || ""));
  if (!target) return NextResponse.json({ error: "Connectez-vous d'abord à ce compte sur cet appareil." }, { status: 403 });
  const res = NextResponse.json({ success: true, merchant_id: target.merchant_id });
  rememberAccount(req, res, session.merchant_id, session.mode); // keep the one we leave
  activateAccount(res, target.merchant_id, target.mode);
  return res;
}
