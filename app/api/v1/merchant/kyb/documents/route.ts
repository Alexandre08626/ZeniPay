// POST /api/v1/merchant/kyb/documents
// GET  /api/v1/merchant/kyb/documents?merchant_id=X
//
// Stores metadata rows in zenipay_kyb_documents. The actual file bytes
// go to Supabase Storage in a follow-up PR; this endpoint captures the
// document type + filename + notes so the admin panel has something to
// review while the storage integration lands.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

const TYPES = new Set(["government_id", "business_registration", "bank_statement", "proof_of_address"]);

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const mid = r;

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_kyb_documents")
    .select("*")
    .eq("merchant_id", mid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({})) as {
    merchant_id?: string; document_type?: string; filename?: string; notes?: string;
  };
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const documentType = String(body.document_type ?? "").trim();
  const filename = String(body.filename ?? "").trim();
  const notes = body.notes ? String(body.notes).slice(0, 500) : null;

  if (!TYPES.has(documentType)) return NextResponse.json({ error: `document_type invalid` }, { status: 400 });
  if (!filename) return NextResponse.json({ error: "filename_required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_kyb_documents")
    .insert({
      id: `kyb_${crypto.randomUUID()}`,
      merchant_id: merchantId,
      document_type: documentType,
      filename,
      notes,
      status: "pending_review",
      created_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
