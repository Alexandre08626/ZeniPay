export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily: email the pay link of every installment that is due today (or
// overdue and never sent), then remind unpaid ones 3 and 7 days after the
// due date. Idempotent — sent_at / reminder_count stop duplicates.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { sendInstallmentRequest, todayMontreal, listDueInstallments, type Installment } from "@/lib/zenipay/installments";

const REMINDER_AFTER_DAYS = [3, 7];

function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const today = todayMontreal();
  let sent = 0, reminded = 0, failed = 0;

  let due: Installment[];
  try { due = await listDueInstallments(supabase, today); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }

  for (const inst of due) {
    // Pay link of a "pay in full" invoice: sent with the invoice, never by the cron.
    if (inst.auto_send === false) continue;
    if (!inst.sent_at) {
      (await sendInstallmentRequest(supabase, inst, "request")) ? sent++ : failed++;
      continue;
    }
    const n = inst.reminder_count || 0;
    if (n < REMINDER_AFTER_DAYS.length && addDays(inst.due_date, REMINDER_AFTER_DAYS[n]) <= today) {
      (await sendInstallmentRequest(supabase, inst, "reminder")) ? reminded++ : failed++;
    }
  }
  return NextResponse.json({ ok: true, today, sent, reminded, failed });
}
