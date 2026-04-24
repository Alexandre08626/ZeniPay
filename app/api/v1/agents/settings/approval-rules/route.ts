// GET  /api/v1/agents/settings/approval-rules
// POST /api/v1/agents/settings/approval-rules
//
// List and create merchant-scope approval rules (zenipay_approval_rules).
// PR 12 — rules live on the merchant side; the caller org is mapped to
// its merchant via zenipay_merchant_agent_org_map.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const RULE_TYPES = new Set(["agent_distribution", "agent_spend", "merchant_transfer"]);

async function resolveMerchantId(organizationId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.merchant_id ?? null;
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const merchantId = await resolveMerchantId(auth.organizationId);
  if (!merchantId) return NextResponse.json({ rules: [] });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_approval_rules")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const merchantId = await resolveMerchantId(auth.organizationId);
  if (!merchantId) return NextResponse.json({ error: "merchant_not_linked" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    rule_type?: string;
    threshold_units?: number | string;
    currency?: string;
    approver_email?: string;
    approver_name?: string;
    is_active?: boolean;
  };

  const ruleType = String(body.rule_type ?? "").trim();
  const threshold = Number(body.threshold_units);
  const currency = (body.currency ?? "CAD").toUpperCase();
  const approverEmail = String(body.approver_email ?? "").trim();
  const approverName = body.approver_name ? String(body.approver_name).trim() : null;
  const isActive = body.is_active !== false;

  if (!RULE_TYPES.has(ruleType))        return NextResponse.json({ error: `rule_type must be one of ${Array.from(RULE_TYPES).join(", ")}` }, { status: 400 });
  if (!Number.isFinite(threshold) || threshold < 0)
                                        return NextResponse.json({ error: "threshold_units must be >= 0" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail))
                                        return NextResponse.json({ error: "approver_email invalid" }, { status: 400 });

  const id = `rule_${crypto.randomUUID()}`;
  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_approval_rules")
    .insert({
      id,
      merchant_id:     merchantId,
      rule_type:       ruleType,
      threshold_units: threshold,
      currency,
      approver_email:  approverEmail,
      approver_name:   approverName,
      is_active:       isActive,
      created_at:      new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rule: data });
}
