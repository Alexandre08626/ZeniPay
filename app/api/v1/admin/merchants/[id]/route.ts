// GET   /api/v1/admin/merchants/[id]
// PATCH /api/v1/admin/merchants/[id]
//
// Detail + approve / reject / reset for KYB review.
// Body on PATCH: { action: 'approve' | 'reject' | 'reset', reason?: string }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["info@zeniva.ca", "alexandreblais26@gmail.com"]);

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await Promise.resolve(ctx.params);
  const db = getSupabaseAdmin();
  const { data: merchant } = await db.from("zenipay_merchants").select("*").eq("id", id).maybeSingle();
  if (!merchant) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: docs } = await db.from("zenipay_kyb_documents").select("*").eq("merchant_id", id).order("created_at", { ascending: false });
  return NextResponse.json({ merchant, documents: docs ?? [] });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({})) as { action?: string; reason?: string };
  const action = String(body.action ?? "").trim();
  const reason = body.reason ? String(body.reason).slice(0, 500) : null;
  const nowIso = new Date().toISOString();

  const patch: Record<string, unknown> = { updated_at: nowIso };
  if (action === "approve") {
    patch.status = "active";
    patch.onboarding_state = "approved";
    patch.kyb_approved_at = nowIso;
    patch.kyb_rejection_reason = null;
  } else if (action === "reject") {
    patch.status = "rejected";
    patch.onboarding_state = "rejected";
    patch.kyb_rejection_reason = reason ?? "Verification denied.";
  } else if (action === "reset") {
    patch.status = "pending_kyb";
    patch.onboarding_state = "submitted";
    patch.kyb_rejection_reason = null;
    patch.kyb_approved_at = null;
  } else {
    return NextResponse.json({ error: "action must be approve | reject | reset" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_merchants")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ merchant: data });
}
