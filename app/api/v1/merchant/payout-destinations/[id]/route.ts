// PATCH  /api/v1/merchant/payout-destinations/[id]
// DELETE /api/v1/merchant/payout-destinations/[id]
//
// Supports: toggle default, rename, mark verified, or delete.
// Guard: merchant_id required in body (PATCH) / query (DELETE).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({})) as {
    merchant_id?: string;
    nickname?: string;
    is_default?: boolean;
  };
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const db = getSupabaseAdmin();

  if (body.is_default === true) {
    // Unset any other default for this merchant first.
    await db.from("zenipay_payout_destinations")
      .update({ is_default: false })
      .eq("merchant_id", merchantId);
  }

  const patch: Record<string, unknown> = {};
  if (body.nickname !== undefined)   patch.nickname = String(body.nickname).trim();
  if (body.is_default !== undefined) patch.is_default = !!body.is_default;

  if (Object.keys(patch).length === 0) return err("bad_request", "no fields to update", 400);

  const { data, error } = await db
    .from("zenipay_payout_destinations")
    .update(patch)
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .select()
    .maybeSingle();
  if (error) return err("server_error", error.message, 500);
  if (!data)  return err("not_found", "destination_not_found", 404);
  return NextResponse.json({ destination: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await Promise.resolve(ctx.params);
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const { error } = await getSupabaseAdmin()
    .from("zenipay_payout_destinations")
    .delete()
    .eq("id", id)
    .eq("merchant_id", merchantId);
  if (error) return err("server_error", error.message, 500);
  return NextResponse.json({ deleted: true });
}
