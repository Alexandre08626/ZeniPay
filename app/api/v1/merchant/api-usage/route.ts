// GET /api/v1/merchant/api-usage?merchant_id=X[&days=30]
//
// Powers the /app/settings API Usage section. Returns aggregate stats
// for the last N days plus a per-day bucketed array and the most
// recent request rows.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const mid = r;
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? "30") || 30, 1), 90);

  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await getSupabaseAdmin()
    .from("zenipay_api_usage")
    .select("endpoint, method, status_code, response_ms, created_at")
    .eq("merchant_id", mid)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as Array<{ endpoint: string; method: string; status_code: number; response_ms: number; created_at: string }>;

  const total = rows.length;
  const ok = rows.filter((r) => r.status_code >= 200 && r.status_code < 400).length;
  const avgMs = total > 0 ? Math.round(rows.reduce((s, r) => s + (Number(r.response_ms) || 0), 0) / total) : 0;

  const byEndpoint = new Map<string, number>();
  for (const r of rows) byEndpoint.set(r.endpoint, (byEndpoint.get(r.endpoint) ?? 0) + 1);
  const top = Array.from(byEndpoint.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([endpoint, count]) => ({ endpoint, count }));

  const buckets = Array.from({ length: days }, () => 0);
  const dayStart = new Date(since).getTime();
  for (const r of rows) {
    const idx = Math.floor((new Date(r.created_at).getTime() - dayStart) / 86400_000);
    if (idx >= 0 && idx < days) buckets[idx]++;
  }

  return NextResponse.json({
    days,
    total_requests: total,
    success_rate: total > 0 ? Math.round((ok / total) * 100) : 0,
    avg_response_ms: avgMs,
    top_endpoints: top,
    per_day: buckets,
    recent: rows.slice(0, 20),
  });
}
