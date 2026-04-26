// GET /api/v1/personal/savings?merchant_id=...
// POST same path: { merchant_id, name, target_amount, target_date?, icon?, color? }
// PATCH same path: { merchant_id, id, action: 'add_funds'|'archive', amount? }
//
// Savings goals — table created in 20260424180000_personal_savings_budget.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_savings_goals")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ goals: data ?? [] });
}

interface CreateBody {
  merchant_id?: string;
  name?: string;
  target_amount?: number;
  target_date?: string | null;
  icon?: string;
  color?: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: CreateBody;
  try { body = await req.json() as CreateBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const name       = String(body.name ?? "").trim();
  const target     = Number(body.target_amount ?? 0);
  if (!name || target <= 0) {
    return NextResponse.json({ error: { code: "bad_request", message: "missing_required_fields" } }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("zenipay_savings_goals").insert({
    id: `goal_${crypto.randomUUID()}`,
    merchant_id: merchantId,
    name,
    target_amount: target,
    target_date: body.target_date ?? null,
    icon: body.icon ?? "🎯",
    color: body.color ?? "#FF6B9D",
    currency: (body.currency ?? "CAD").toUpperCase(),
  }).select("*").single();
  if (error) return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ goal: data });
}

interface PatchBody {
  merchant_id?: string;
  id?: string;
  action?: "add_funds" | "archive";
  amount?: number;
}

export async function PATCH(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: PatchBody;
  try { body = await req.json() as PatchBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const id = String(body.id ?? "").trim();
  const action = body.action;
  if (!id || !action) {
    return NextResponse.json({ error: { code: "bad_request", message: "missing_required_fields" } }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data: goal } = await db.from("zenipay_savings_goals").select("*").eq("id", id).eq("merchant_id", merchantId).maybeSingle();
  if (!goal) return NextResponse.json({ error: { code: "not_found", message: "goal_not_found" } }, { status: 404 });

  if (action === "add_funds") {
    const amount = Number(body.amount ?? 0);
    if (amount <= 0) return NextResponse.json({ error: { code: "bad_request", message: "amount_must_be_positive" } }, { status: 400 });
    const newAmount = Number(goal.current_amount ?? 0) + amount;
    const completed = newAmount >= Number(goal.target_amount ?? 0);
    await db.from("zenipay_savings_goals").update({
      current_amount: newAmount,
      status: completed ? "completed" : "active",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    return NextResponse.json({ success: true, current_amount: newAmount, completed });
  }

  if (action === "archive") {
    await db.from("zenipay_savings_goals").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: { code: "bad_request", message: "action_invalid" } }, { status: 400 });
}
