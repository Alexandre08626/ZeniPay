export const dynamic = "force-dynamic";

// GET  /api/zenipay/invoices/:id/installments — schedule + pay links
// POST /api/zenipay/invoices/:id/installments — { action: "send" | "cancel", installment_id }

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";
import { listInstallments, payUrl, sendInstallmentRequest } from "@/lib/zenipay/installments";

async function auth(req: NextRequest, invoiceId: string) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const supabase = getSupabaseAdmin();
  const { data: inv } = await supabase
    .from("zenipay_invoices").select("id").eq("id", invoiceId).eq("merchant_id", r).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return { supabase, merchantId: r };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await auth(req, params.id);
  if (a instanceof NextResponse) return a;
  try {
    const list = await listInstallments(a.supabase, params.id);
    return NextResponse.json({ installments: list.map((i) => ({ ...i, pay_url: payUrl(i.pay_token) })) });
  } catch {
    return NextResponse.json({ installments: [] });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await auth(req, params.id);
  if (a instanceof NextResponse) return a;
  const body = await req.json().catch(() => ({}));
  const list = await listInstallments(a.supabase, params.id);
  const inst = list.find((i) => i.id === body.installment_id);
  if (!inst) return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  if (inst.status === "paid") return NextResponse.json({ error: "Déjà payé." }, { status: 409 });

  if (body.action === "send") {
    const ok = await sendInstallmentRequest(a.supabase, inst, inst.sent_at ? "reminder" : "request");
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Envoi impossible (courriel du client manquant ?)" }, { status: 502 });
  }
  if (body.action === "cancel") {
    await a.supabase.from("zenipay_invoice_installments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", inst.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
