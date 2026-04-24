// PATCH  /api/v1/agents/settings/approval-rules/[id]
// DELETE /api/v1/agents/settings/approval-rules/[id]
//
// Toggle is_active, update threshold/approver, or delete a rule.
// Guards that the rule belongs to the merchant linked to the caller org.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

async function resolveMerchantId(organizationId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.merchant_id ?? null;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const merchantId = await resolveMerchantId(auth.organizationId);
  if (!merchantId) return NextResponse.json({ error: "merchant_not_linked" }, { status: 403 });

  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({})) as {
    threshold_units?: number | string;
    currency?: string;
    approver_email?: string;
    approver_name?: string;
    is_active?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (body.threshold_units !== undefined) {
    const n = Number(body.threshold_units);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "threshold_units must be >= 0" }, { status: 400 });
    patch.threshold_units = n;
  }
  if (body.currency !== undefined)       patch.currency = String(body.currency).toUpperCase();
  if (body.approver_email !== undefined) patch.approver_email = String(body.approver_email).trim();
  if (body.approver_name !== undefined)  patch.approver_name = body.approver_name ? String(body.approver_name).trim() : null;
  if (body.is_active !== undefined)      patch.is_active = !!body.is_active;

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "no fields to update" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_approval_rules")
    .update(patch)
    .eq("id", id)
    .eq("merchant_id", merchantId)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "rule_not_found" }, { status: 404 });
  return NextResponse.json({ rule: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const merchantId = await resolveMerchantId(auth.organizationId);
  if (!merchantId) return NextResponse.json({ error: "merchant_not_linked" }, { status: 403 });

  const { id } = await Promise.resolve(ctx.params);
  const { error } = await getSupabaseAdmin()
    .from("zenipay_approval_rules")
    .delete()
    .eq("id", id)
    .eq("merchant_id", merchantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
