export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

const FEES: Record<string, number> = { ach: 0, wire_domestic: 15, wire_international: 30, physical_card: 10, card_replacement: 5, returned: 25, conversion: 0.005 };

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  // Admin override via x-admin-email — see lib/auth/zp-session.ts.
  // Lets /admin/wallet read ZeniPay corporate's data from an
  // operator session signed in as a different merchant.
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"), req);
  if (r instanceof NextResponse) return r;
  const mid = r;
  const s = getSupabaseAdmin();
  // `ledger` covers money movements recorded outside `zenipay_transfers`
  // (e.g. `fund_agent_treasury` debits from the merchant→treasury
  // bridge). `customer_payment` rows are omitted because the same event
  // is already returned by /api/zenipay/stats `recent_transactions`.
  const [accounts, transfers, cards, contacts, notifs, ledger] = await Promise.all([
    s.from("zenipay_accounts").select("*").eq("merchant_id", mid).order("is_primary", { ascending: false }),
    s.from("zenipay_transfers").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }).limit(100),
    s.from("zenipay_cards").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }),
    s.from("zenipay_contacts").select("*").eq("merchant_id", mid).order("name"),
    s.from("zenipay_notification_settings").select("*").eq("merchant_id", mid).single(),
    s.from("zenipay_ledger")
      .select("*")
      .eq("merchant_id", mid)
      .neq("event_type", "customer_payment")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return NextResponse.json({
    accounts: accounts.data || [],
    transfers: transfers.data || [],
    cards: cards.data || [],
    contacts: contacts.data || [],
    notifications: notifs.data || {},
    ledger: ledger.data || [],
    fees: FEES,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json();
  const { action } = body;
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchant_id = r;
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

  if (action === "update_account") {
    // Generic attribute update — name, primary, currency, interest, goal.
    const { account_id, account_name, is_primary, currency, interest_rate, goal_amount, goal_deadline } = body;
    if (!account_id) return NextResponse.json({ error: "account_id required" }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: now };
    if (account_name !== undefined)  patch.account_name = account_name;
    if (currency !== undefined)      patch.currency = currency;
    if (interest_rate !== undefined) patch.interest_rate = interest_rate;
    if (goal_amount !== undefined)   patch.goal_amount = goal_amount;
    if (goal_deadline !== undefined) patch.goal_deadline = goal_deadline;
    if (is_primary === true) {
      // Flipping primary: unset it elsewhere first so exactly one primary
      // account exists for this merchant at all times.
      await s.from("zenipay_accounts").update({ is_primary: false, updated_at: now })
        .eq("merchant_id", merchant_id).neq("id", account_id);
      patch.is_primary = true;
    } else if (is_primary === false) {
      patch.is_primary = false;
    }
    const { error } = await s.from("zenipay_accounts").update(patch)
      .eq("id", account_id).eq("merchant_id", merchant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "close_account") {
    const { account_id } = body;
    if (!account_id) return NextResponse.json({ error: "account_id required" }, { status: 400 });
    const { data: acct } = await s.from("zenipay_accounts")
      .select("id, balance, is_primary, status").eq("id", account_id)
      .eq("merchant_id", merchant_id).maybeSingle();
    if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (Number(acct.balance || 0) > 0) {
      return NextResponse.json({ error: "Balance must be $0 to close the account. Move funds first." }, { status: 422 });
    }
    if (acct.is_primary) {
      // Only allow closing the primary when it's the last remaining account.
      const { data: others } = await s.from("zenipay_accounts")
        .select("id").eq("merchant_id", merchant_id).neq("id", account_id).neq("status", "closed");
      if ((others?.length ?? 0) > 0) {
        return NextResponse.json({
          error: "This is your primary account. Promote another account to primary first.",
        }, { status: 422 });
      }
    }
    await s.from("zenipay_accounts").update({ status: "closed", is_primary: false, updated_at: now })
      .eq("id", account_id).eq("merchant_id", merchant_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
