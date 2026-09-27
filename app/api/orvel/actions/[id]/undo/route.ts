export const dynamic = "force-dynamic";

// POST /api/orvel/actions/:id/undo — reverse one of Orvel's actions when it
// can still be reversed (unpaid invoice, pay link, internal transfer).
// Emails already sent and Finix refunds cannot be undone.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { moveBetweenAccounts } from "@/lib/orvel/tools";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const supabase = getSupabaseAdmin();
  const merchantId = session.merchant_id;

  const { data: action } = await supabase.from("zenipay_orvel_actions").select("*")
    .eq("id", params.id).eq("merchant_id", merchantId).maybeSingle();
  if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
  const undo = (action.undo || {}) as Record<string, any>;
  if (action.status !== "done" || !undo.type) return NextResponse.json({ error: "Cette action ne peut pas être annulée." }, { status: 400 });

  // Claim the undo first so two clicks can't reverse twice.
  const now = new Date().toISOString();
  const { data: claimed } = await supabase.from("zenipay_orvel_actions")
    .update({ undone_at: now, status: "undone" }).eq("id", action.id).is("undone_at", null).select("id");
  if (!claimed || claimed.length === 0) return NextResponse.json({ error: "Déjà annulée." }, { status: 409 });
  const release = () => supabase.from("zenipay_orvel_actions").update({ undone_at: null, status: "done" }).eq("id", action.id);

  try {
    if (undo.type === "cancel_invoice") {
      const { data: inv } = await supabase.from("zenipay_invoices").select("*")
        .eq("id", undo.invoice_id).eq("merchant_id", merchantId).maybeSingle();
      if (!inv) throw new Error("Facture introuvable.");
      const { data: paidInst } = await supabase.from("zenipay_invoice_installments").select("id")
        .eq("invoice_id", inv.id).eq("status", "paid").limit(1);
      if (["paid", "partial"].includes(inv.status) || (paidInst && paidInst.length)) {
        throw new Error("Un paiement a déjà été reçu sur cette facture — elle ne peut plus être annulée.");
      }
      await supabase.from("zenipay_invoices").update({ status: "cancelled", updated_at: now }).eq("id", inv.id);
      await supabase.from("zenipay_invoice_installments").update({ status: "cancelled", updated_at: now })
        .eq("invoice_id", inv.id).neq("status", "paid");
      return NextResponse.json({ success: true, message: `Facture ${inv.invoice_number || ""} annulée (les liens de paiement ne fonctionnent plus).` });
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
