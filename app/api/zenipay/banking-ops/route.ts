export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

const FEES: Record<string, number> = { ach: 0, wire_domestic: 15, wire_international: 30, physical_card: 10, card_replacement: 5, returned: 25, conversion: 0.005 };

export async function GET(req: NextRequest) {
  const mid = req.nextUrl.searchParams.get("merchant_id");
  if (!mid) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });
  const s = getSupabaseAdmin();
  const [accounts, transfers, cards, contacts, notifs] = await Promise.all([
    s.from("zenipay_accounts").select("*").eq("merchant_id", mid).order("is_primary", { ascending: false }),
    s.from("zenipay_transfers").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }).limit(100),
    s.from("zenipay_cards").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }),
    s.from("zenipay_contacts").select("*").eq("merchant_id", mid).order("name"),
    s.from("zenipay_notification_settings").select("*").eq("merchant_id", mid).single(),
  ]);
  return NextResponse.json({ accounts: accounts.data || [], transfers: transfers.data || [], cards: cards.data || [], contacts: contacts.data || [], notifications: notifs.data || {}, fees: FEES });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, merchant_id } = body;
  if (!action || !merchant_id) return NextResponse.json({ error: "Missing action/merchant_id" }, { status: 400 });
  const s = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (action === "create_account") {
    const { account_type, account_name, currency, interest_rate, goal_amount, goal_deadline } = body;
    const acctNum = String(Math.floor(Math.random() * 9e9) + 1e9);
    const { data: existing } = await s.from("zenipay_accounts").select("id").eq("merchant_id", merchant_id);
    const { data, error } = await s.from("zenipay_accounts").insert({
      merchant_id, account_type: account_type || "business_checking",
      account_name: account_name || account_type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "New Account",
      account_number: acctNum, balance: 0, currency: currency || "USD",
      is_primary: !existing || existing.length === 0,
      interest_rate: interest_rate || (account_type?.includes("savings") ? 0.5 : 0),
      goal_amount: goal_amount || null, goal_deadline: goal_deadline || null,
      created_at: now, updated_at: now,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, account: data });
  }

  if (action === "send_transfer") {
    const { from_account_id, transfer_type, recipient_name, recipient_routing, recipient_account, recipient_bank, recipient_swift, amount, memo, scheduled_date, recurrence, to_account_id, contact_id, save_contact } = body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    let fee = 0;
    if (transfer_type === "wire") fee = recipient_swift ? FEES.wire_international : FEES.wire_domestic;
    else if (transfer_type === "instant") fee = Math.max(0.50, amt * 0.015);
    const totalDebit = amt + fee;

    if (from_account_id) {
      const { data: acct } = await s.from("zenipay_accounts").select("balance").eq("id", from_account_id).single();
      if (!acct || Number(acct.balance) < totalDebit) return NextResponse.json({ error: `Insufficient balance. Available: $${(Number(acct?.balance) || 0).toFixed(2)}` }, { status: 422 });
    }

    const { data: trfData, error: trfErr } = await s.from("zenipay_transfers").insert({
      merchant_id, from_account_id, to_account_id: to_account_id || null,
      transfer_type, recipient_name: recipient_name || "", recipient_routing: recipient_routing || "",
      recipient_account: recipient_account || "", recipient_bank: recipient_bank || "",
      recipient_swift: recipient_swift || "", amount: amt, fee, memo: memo || "",
      status: transfer_type === "internal" ? "completed" : scheduled_date ? "scheduled" : "processing",
      scheduled_date: scheduled_date || null, recurrence: recurrence || "one_time",
      created_at: now, updated_at: now,
    }).select().single();
    if (trfErr) return NextResponse.json({ error: trfErr.message }, { status: 500 });

    // Debit source
    if (from_account_id) {
      const { data: src } = await s.from("zenipay_accounts").select("balance").eq("id", from_account_id).single();
      await s.from("zenipay_accounts").update({ balance: Math.max(0, Number(src?.balance || 0) - totalDebit), updated_at: now }).eq("id", from_account_id);
    }
    // Credit destination (internal)
    if (transfer_type === "internal" && to_account_id) {
      const { data: dst } = await s.from("zenipay_accounts").select("balance").eq("id", to_account_id).single();
      await s.from("zenipay_accounts").update({ balance: Number(dst?.balance || 0) + amt, updated_at: now }).eq("id", to_account_id);
    }
    // Save contact
    if (save_contact && recipient_name) {
      await s.from("zenipay_contacts").insert({ merchant_id, name: recipient_name, bank_name: recipient_bank || "", routing_number: recipient_routing || "", account_number: recipient_account || "", swift: recipient_swift || "", contact_type: recipient_swift ? "international" : "domestic", created_at: now });
    }
    return NextResponse.json({ ok: true, transfer: trfData, fee });
  }

  if (action === "apply_card") {
    const { card_type, is_physical, shipping_address, account_id, spending_limit_daily, spending_limit_monthly } = body;
    const last4 = String(Math.floor(Math.random() * 9000) + 1000);
    const expM = String(new Date().getMonth() + 1).padStart(2, "0");
    const expY = String(new Date().getFullYear() + 4);
    if (is_physical && account_id) {
      const { data: acct } = await s.from("zenipay_accounts").select("balance").eq("id", account_id).single();
      if (acct) await s.from("zenipay_accounts").update({ balance: Math.max(0, Number(acct.balance) - FEES.physical_card), updated_at: now }).eq("id", account_id);
    }
    const { data, error } = await s.from("zenipay_cards").insert({
      merchant_id, account_id: account_id || null, card_type: card_type || "visa_debit",
      last4, expiry: `${expY}-${expM}`, status: is_physical ? "applied" : "active",
      is_virtual: !is_physical, is_physical: !!is_physical,
      spending_limit: spending_limit_daily || 10000, spending_limit_monthly: spending_limit_monthly || 50000,
      daily_limit: spending_limit_daily || 10000, shipping_address: shipping_address || {},
      created_at: now, updated_at: now,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, card: data });
  }

  if (action === "toggle_card") {
    const { card_id, freeze } = body;
    await s.from("zenipay_cards").update({ status: freeze ? "frozen" : "active", updated_at: now }).eq("id", card_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "update_card_limit") {
    const { card_id, spending_limit_daily, spending_limit_monthly } = body;
    const updates: Record<string, unknown> = { updated_at: now };
    if (spending_limit_daily != null) updates.spending_limit = Number(spending_limit_daily);
    if (spending_limit_daily != null) updates.daily_limit = Number(spending_limit_daily);
    if (spending_limit_monthly != null) updates.spending_limit_monthly = Number(spending_limit_monthly);
    await s.from("zenipay_cards").update(updates).eq("id", card_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "save_contact") {
    const { name, bank_name, routing_number, account_number, swift, contact_type } = body;
    const { data, error } = await s.from("zenipay_contacts").insert({ merchant_id, name, bank_name, routing_number, account_number, swift, contact_type: contact_type || (swift ? "international" : "domestic"), created_at: now }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, contact: data });
  }

  if (action === "delete_contact") {
    await s.from("zenipay_contacts").delete().eq("id", body.contact_id).eq("merchant_id", merchant_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "update_notifications") {
    const { payment_received, large_transaction_threshold, low_balance_threshold, payout_completed, card_transaction, weekly_summary } = body;
    await s.from("zenipay_notification_settings").upsert({
      merchant_id, payment_received, large_transaction_threshold, low_balance_threshold,
      payout_completed, card_transaction, weekly_summary, updated_at: now,
    }, { onConflict: "merchant_id" });
    return NextResponse.json({ ok: true });
  }

  if (action === "freeze_account") {
    const { account_id, freeze } = body;
    await s.from("zenipay_accounts").update({ status: freeze ? "frozen" : "active", updated_at: now }).eq("id", account_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
