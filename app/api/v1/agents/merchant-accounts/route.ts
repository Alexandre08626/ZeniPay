// GET /api/v1/agents/merchant-accounts
//
// Returns the merchant-side ZeniPay accounts linked to the caller's
// org (via zenipay_merchant_agent_org_map). Powers the "Return to
// merchant" destination picker on /agents/treasury.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const db = getSupabaseAdmin();

  const { data: mappings } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId);
  const merchantIds = ((mappings ?? []) as Array<{ merchant_id: string }>).map((m) => m.merchant_id);
  if (merchantIds.length === 0) return NextResponse.json({ accounts: [] });

  const { data: accounts } = await db
    .from("zenipay_accounts")
    .select("id, account_name, balance, currency, is_primary, status, merchant_id")
    .in("merchant_id", merchantIds)
    .eq("status", "active")
    .order("is_primary", { ascending: false });

  return NextResponse.json({ accounts: accounts ?? [] });
}
