// GET /api/v1/personal/budget?merchant_id=...
// POST: { merchant_id, name, monthly_limit, icon?, color? }
// PATCH: { merchant_id, id, monthly_limit?, archived? }
//
// Budget categories — table created in 20260424180000_personal_savings_budget.
// Seeds 8 default categories the first time a merchant lands on the page.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

const DEFAULTS: Array<{ name: string; icon: string; color: string; limit: number }> = [
  { name: "Housing",       icon: "🏠", color: "#FF6B9D", limit: 1500 },
  { name: "Food",          icon: "🍽️", color: "#10B981", limit: 600 },
  { name: "Transport",     icon: "🚗", color: "#15B8C9", limit: 250 },
  { name: "Entertainment", icon: "🎬", color: "#7B4FBF", limit: 200 },
  { name: "Health",        icon: "💊", color: "#EF4444", limit: 150 },
  { name: "Shopping",      icon: "🛍️", color: "#FFA500", limit: 300 },
  { name: "Savings",       icon: "💰", color: "#0EA5E9", limit: 500 },
  { name: "Other",         icon: "📦", color: "#64748B", limit: 200 },
];

async function ensureDefaults(db: ReturnType<typeof getSupabaseAdmin>, merchantId: string) {
  const { data: existing } = await db
    .from("zenipay_budget_categories")
    .select("id")
    .eq("merchant_id", merchantId)
    .limit(1);
  if (existing && existing.length > 0) return;
  const rows = DEFAULTS.map((d) => ({
    id: `bcat_${crypto.randomUUID()}`,
    merchant_id: merchantId,
    name: d.name,
    monthly_limit: d.limit,
    icon: d.icon,
    color: d.color,
    currency: "CAD",
  }));
  await db.from("zenipay_budget_categories").insert(rows);
}

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const db = getSupabaseAdmin();
  try { await ensureDefaults(db, merchantId); } catch { /* table may not be applied yet */ }
  const { data, error } = await db
    .from("zenipay_budget_categories")
    .select("*")
    .eq("merchant_id", merchantId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ categories: data ?? [] });
}

interface CreateBody {
  merchant_id?: string;
  name?: string;
  monthly_limit?: number;
  icon?: string;
  color?: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: CreateBody;
  try { body = await req.json() as CreateBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const name = String(body.name ?? "").trim();
  const limit = Number(body.monthly_limit ?? 0);
  if (!name || limit <= 0) {
    return NextResponse.json({ error: { code: "bad_request", message: "missing_required_fields" } }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("zenipay_budget_categories").insert({
    id: `bcat_${crypto.randomUUID()}`,
    merchant_id: merchantId,
    name,
    monthly_limit: limit,
    icon: body.icon ?? "📦",
    color: body.color ?? "#64748B",
    currency: (body.currency ?? "CAD").toUpperCase(),
  }).select("*").single();
  if (error) return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ category: data });
}

interface PatchBody {
  merchant_id?: string;
  id?: string;
  monthly_limit?: number;
  archived?: boolean;
}

export async function PATCH(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: PatchBody;
  try { body = await req.json() as PatchBody; } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "invalid_json" } }, { status: 400 });
  }
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: { code: "bad_request", message: "id_required" } }, { status: 400 });
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.monthly_limit != null) update.monthly_limit = Number(body.monthly_limit);
  if (body.archived === true)     update.archived_at = new Date().toISOString();
  const db = getSupabaseAdmin();
  const { error } = await db.from("zenipay_budget_categories").update(update).eq("id", id).eq("merchant_id", merchantId);
  if (error) return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  return NextResponse.json({ success: true });
}
