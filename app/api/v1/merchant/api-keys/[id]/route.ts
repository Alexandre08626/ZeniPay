// DELETE /api/v1/merchant/api-keys/[id]?merchant_id=X  (revoke)
// PATCH  /api/v1/merchant/api-keys/[id]                 (rename)

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { revokeMerchantApiKey } from "@/lib/merchant/api-keys";

interface Ctx { params: Promise<{ id: string }> | { id: string }; }

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);
  const mid = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!mid) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });
  await revokeMerchantApiKey(id, mid);
  return NextResponse.json({ revoked: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({})) as { merchant_id?: string; name?: string };
  const mid = String(body.merchant_id ?? "").trim();
  if (!mid) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("zenipay_api_keys").update(patch).eq("id", id).eq("merchant_id", mid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
