export const dynamic = "force-dynamic";

// POST /api/zenipay/invoices — create an invoice for the session merchant,
// optionally split into installments (dépôt 1, dépôt 2, solde…).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";
import { createMerchantInvoice, InvoiceError } from "@/lib/zenipay/invoices";

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  try {
    const result = await createMerchantInvoice(getSupabaseAdmin(), r, body);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof InvoiceError) {
      const message = e.message === "MIGRATION_REQUIRED"
        ? "Les versements ne sont pas encore activés (migration de base de données à appliquer)."
        : e.message;
      return NextResponse.json({ error: message, code: e.message === "MIGRATION_REQUIRED" ? "MIGRATION_REQUIRED" : undefined }, { status: e.status });
    }
    console.error("[invoices POST]", e);
    return NextResponse.json({ error: "Création de la facture impossible." }, { status: 500 });
  }
}
