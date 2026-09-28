// POST /api/zenipay/account/delete
//
// Self-service account deletion (App Store guideline 5.1.1(v)).
// The merchant row is closed and de-identified so neither login path can
// find it again; the Supabase Auth user and every API key are removed.
// Payments, invoices and ledger entries are kept: payment records must be
// retained for regulatory purposes (FINTRAC, tax), which the privacy policy
// states.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireZpSession, clearAllSessionCookies, isAdminSession } from "@/lib/auth/zp-session";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { updateTolerant } from "@/lib/zenipay/db-tolerant";

const CONFIRM_WORDS = new Set(["SUPPRIMER", "DELETE"]);

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch {}
  if (!CONFIRM_WORDS.has(String(body.confirm || "").trim().toUpperCase())) {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }
  // The platform owner's account holds the corporate wallet — never self-delete it.
  if (await isAdminSession(req)) {
    return NextResponse.json({ error: "admin_account_cannot_be_deleted" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const merchantId = session.merchant_id;
  const { data: merchant, error: readErr } = await admin
    .from("zenipay_merchants")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();
  if (readErr || !merchant) return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });

  const email = String(merchant.email || session.email || "").toLowerCase().trim();
  const deletedAt = new Date().toISOString();
  const tombstone = `deleted+${merchantId}@deleted.zenipay.ca`;

  // Keep only what is needed to reconcile past payments; drop credentials,
  // keys, contact and KYB details.
  const oldCfg = (merchant.config && typeof merchant.config === "object" ? merchant.config : {}) as Record<string, unknown>;
  const config: Record<string, unknown> = {
    status: "deleted",
    zp_deleted_at: deletedAt,
    zp_deleted_email_sha256: email ? await sha256(email) : null,
  };
  if (oldCfg.plan) config.plan = oldCfg.plan;

  const { error: updErr } = await updateTolerant(
    admin,
    "zenipay_merchants",
    {
      status: "deleted",
      email: tombstone,
      name: "Compte supprimé",
      company: null,
      website: null,
      phone: null,
      auth_user_id: null,
      merchant_data: null,
      config,
      deleted_at: deletedAt,
    },
    (q) => q.eq("id", merchantId),
  );
  if (updErr) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  // Revoke every API key (table may not exist on legacy deployments).
  await admin.from("zenipay_api_keys").update({ is_active: false }).eq("merchant_id", merchantId).then(() => {}, () => {});

  // Remove the Supabase Auth identity so the password stops working.
  const authUserId = session.auth_user_id || (merchant.auth_user_id as string | undefined);
  if (authUserId) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
  } else if (email) {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      const hit = data.users.find((u) => (u.email || "").toLowerCase() === email);
      if (hit) { await admin.auth.admin.deleteUser(hit.id).catch(() => {}); break; }
      if (data.users.length < 1000) break;
    }
  }

  const res = NextResponse.json({ success: true });
  clearAllSessionCookies(res);
  return res;
}

async function sha256(s: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(s).digest("hex");
}
