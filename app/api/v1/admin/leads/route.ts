// GET /api/v1/admin/leads
//
// Access requests (leads) from the public contact form, registration, etc.
// Auth: x-admin-email header against allowlist (same as /admin/merchants).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const statusFilter = req.nextUrl.searchParams.get("status") || "";
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 100, 500);
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);

  let query = db
    .from("zenipay_access_requests")
    .select("*", { count: "exact" });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[admin/leads] query error:", error.message);
    return NextResponse.json({ leads: [], total: 0, error: error.message });
  }

  // Client-side search filter if q is provided (simple text match on email/company/message)
  let leads = data || [];
  if (q.trim()) {
    const ql = q.trim().toLowerCase();
    leads = leads.filter((l: Record<string, unknown>) =>
      String(l.email || "").toLowerCase().includes(ql) ||
      String(l.company || "").toLowerCase().includes(ql) ||
      String(l.message || "").toLowerCase().includes(ql) ||
      String(l.source || "").toLowerCase().includes(ql)
    );
  }

  return NextResponse.json({
    leads,
    total: count ?? leads.length,
    limit,
    offset,
  });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, note } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const validStatuses = ["new", "contacted", "qualified", "closed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (note) updateData.notes = note;

  const { error } = await db
    .from("zenipay_access_requests")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}