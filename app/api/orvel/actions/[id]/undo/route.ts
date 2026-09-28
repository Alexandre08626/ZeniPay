export const dynamic = "force-dynamic";

// POST /api/orvel/actions/:id/undo — reverse one of Orvel's actions when it
// can still be reversed (unpaid invoice, pay link, internal transfer).
// Emails already sent and Finix refunds cannot be undone.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { moveBetweenAccounts } from "@/lib/orvel/tools";
import { getAction, claimUndo, releaseUndo } from "@/lib/orvel/journal";
import { listInstallments, cancelInvoiceInstallments, invoiceNumberOf } from "@/lib/zenipay/installments";
import { updateTolerant } from "@/lib/zenipay/db-tolerant";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const supabase = getSupabaseAdmin();
  const merchantId = session.merchant_id;

  const action = await getAction(supabase, merchantId, params.id);
  if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  const undo = (action.undo || {}) as Record<string, any>;
  if (action.status !== "done" || !undo.type) return NextResponse.json({ error: "Cette action ne peut pas être annulée." }, { status: 400 });

  // Claim the undo first so two clicks can't reverse twice.
  const now = new Date().toISOString();
  if (!(await claimUndo(supabase, merchantId, action.id))) return NextResponse.json({ error: "Déjà annulée." }, { status: 409 });
  const release = () => releaseUndo(supabase, merchantId, action.id);

  try {
    if (undo.type === "cancel_invoice") {
      const { data: inv } = await supabase.from("zenipay_invoices").select("*")
        .eq("id", undo.invoice_id).eq("merchant_id", merchantId).maybeSingle();
      if (!inv) throw new Error("Facture introuvable.");
      const paidInst = (await listInstallments(supabase, inv.id, merchantId)).filter((i) => i.status === "paid");
      if (["paid", "partial"].includes(inv.status) || paidInst.length) {
        throw new Error("Un paiement a déjà été reçu sur cette facture — elle ne peut plus être annulée.");
      }
      await updateTolerant(supabase, "zenipay_invoices", { status: "cancelled", updated_at: now }, (q) => q.eq("id", inv.id));
      await cancelInvoiceInstallments(supabase, inv.id, merchantId);
      return NextResponse.json({ success: true, message: `Facture ${invoiceNumberOf(inv)} annulée (les liens de paiement ne fonctionnent plus).` });
    }
    if (undo.type === "deactivate_pay_link") {
      await supabase.from("zenipay_pay_links").update({ status: "inactive", updated_at: now })
        .eq("id", undo.id).eq("merchant_id", merchantId);
      return NextResponse.json({ success: true, message: "Lien de paiement désactivé." });
    }
    if (undo.type === "reverse_transfer") {
      const r = await moveBetweenAccounts({ supabase, merchantId }, undo.from_id, undo.to_id, Number(undo.amount), "Annulation d'un virement Orvel");
      if (!r.ok) throw new Error(r.error || "Virement inverse impossible.");
      return NextResponse.json({ success: true, message: "Virement annulé (montant remis sur le compte d'origine)." });
    }
    throw new Error("Type d'annulation inconnu.");
  } catch (e) {
    await release();
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }
}
