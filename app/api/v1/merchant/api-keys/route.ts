// GET  /api/v1/merchant/api-keys?merchant_id=X
// POST /api/v1/merchant/api-keys

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { createMerchantApiKey, type KeyEnv, type KeyPermission } from "@/lib/merchant/api-keys";

const PERMS = new Set<KeyPermission>(["read", "write", "admin"]);
const ENVS  = new Set<KeyEnv>(["live", "test"]);

export async function GET(req: NextRequest) {
  const mid = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!mid) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_api_keys")
    .select("id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at")
    .eq("merchant_id", mid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    merchant_id?: string; name?: string; environment?: string; permissions?: string[];
  };
  const merchantId = String(body.merchant_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const env = (String(body.environment ?? "live").trim() as KeyEnv);
  const perms = ((body.permissions ?? []) as string[]).filter((p): p is KeyPermission => PERMS.has(p as KeyPermission));

  if (!merchantId) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });
  if (!name)       return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (!ENVS.has(env)) return NextResponse.json({ error: "environment must be live|test" }, { status: 400 });
  if (perms.length === 0) return NextResponse.json({ error: "at least one permission required" }, { status: 400 });

  try {
    const created = await createMerchantApiKey({ merchant_id: merchantId, name, environment: env, permissions: perms });
    // `raw` is the plaintext — returned ONCE so the caller can copy it.
    return NextResponse.json({ key: created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "create_failed" }, { status: 500 });
  }
}
