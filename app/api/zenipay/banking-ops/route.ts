export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function db() {
  return createClient(
    "https://mjkvkibdfteonvlahtag.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4"
  );
}

const FEES: Record<string, number> = {
  ach: 0,
  wire_domestic: 15,
  wire_international: 30,
  instant: 0, // 1.5% calculated separately
  bill_pay: 0,
  physical_card: 10,
  card_replacement: 5,
};

// ─── GET: load accounts, transfers, cards for a merchant ──────────────
export async function GET(req: NextRequest) {
  const mid = req.nextUrl.searchParams.get("merchant_id");
  if (!mid) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });

  const supabase = db();

  const [accounts, transfers, cards] = await Promise.all([
    supabase.from("zenipay_accounts").select("*").eq("merchant_id", mid).order("is_primary", { ascending: false }),
    supabase.from("zenipay_transfers").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }).limit(50),
    supabase.from("zenipay_cards").select("*").eq("merchant_id", mid).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    accounts: accounts.data || [],
    transfers: transfers.data || [],
    cards: cards.data || [],
    fees: FEES,
  });
}

// ─── POST: create account, send transfer, apply for card ─────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, merchant_id } = body;
  if (!action || !merchant_id) return NextResponse.json({ error: "Missing action or merchant_id" }, { status: 400 });

  const supabase = db();
  const now = new Date().toISOString();

  // ═══ CREATE ACCOUNT ═══
  if (action === "create_account") {
    const { account_type, account_name } = body;
    if (!account_type) return NextResponse.json({ error: "Missing account_type" }, { status: 400 });

    const acctNum = String(Math.floor(Math.random() * 9000000000) + 1000000000);
    const { data: existing } = await supabase.from("zenipay_accounts").select("id").eq("merchant_id", merchant_id);
    const isPrimary = !existing || existing.length === 0;

    const { data, error } = await supabase.from("zenipay_accounts").insert({
      merchant_id,
      account_type,
      account_name: account_name || account_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      account_number: acctNum,
      balance: 0,
      is_primary: isPrimary,
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, account: data });
  }

  // ═══ SEND TRANSFER ═══
  if (action === "send_transfer") {
    const { from_account_id, transfer_type, recipient_name, recipient_routing, recipient_account, recipient_bank, recipient_swift, amount, memo, scheduled_date, recurrence, to_account_id } = body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // Calculate fee
    let fee = 0;
    if (transfer_type === "wire") {
      fee = recipient_swift ? FEES.wire_international : FEES.wire_domestic;
    } else if (transfer_type === "instant") {
      fee = Math.max(0.50, amt * 0.015);
    } else {
      fee = FEES[transfer_type] || 0;
    }

    const totalDebit = amt + fee;

    // Check balance
    if (from_account_id) {
      const { data: acct } = await supabase.from("zenipay_accounts").select("balance").eq("id", from_account_id).single();
      if (!acct || Number(acct.balance) < totalDebit) {
        return NextResponse.json({ error: `Insufficient balance. Available: $${(Number(acct?.balance) || 0).toFixed(2)}, Need: $${totalDebit.toFixed(2)}` }, { status: 422 });
      }
    }

    // Create transfer record
    const { data: trfData, error: trfErr } = await supabase.from("zenipay_transfers").insert({
      merchant_id,
      from_account_id: from_account_id || null,
      to_account_id: to_account_id || null,
      transfer_type,
      recipient_name: recipient_name || "",
      recipient_routing: recipient_routing || "",
      recipient_account: recipient_account || "",
      recipient_bank: recipient_bank || "",
      recipient_swift: recipient_swift || "",
      amount: amt,
      fee,
      memo: memo || "",
      status: transfer_type === "internal" ? "completed" : (scheduled_date ? "scheduled" : "processing"),
      scheduled_date: scheduled_date || null,
      recurrence: recurrence || "one_time",
      created_at: now,
      updated_at: now,
    }).select().single();

    if (trfErr) return NextResponse.json({ error: trfErr.message }, { status: 500 });

    // Debit source account
    if (from_account_id) {
      const { data: src } = await supabase.from("zenipay_accounts").select("balance").eq("id", from_account_id).single();
      await supabase.from("zenipay_accounts").update({
        balance: Math.max(0, Number(src?.balance || 0) - totalDebit),
        updated_at: now,
      }).eq("id", from_account_id);
    }

    // Credit destination (internal transfers)
    if (transfer_type === "internal" && to_account_id) {
      const { data: dst } = await supabase.from("zenipay_accounts").select("balance").eq("id", to_account_id).single();
      await supabase.from("zenipay_accounts").update({
        balance: Number(dst?.balance || 0) + amt,
        updated_at: now,
      }).eq("id", to_account_id);
    }

    return NextResponse.json({ ok: true, transfer: trfData, fee });
  }

  // ═══ APPLY FOR CARD ═══
  if (action === "apply_card") {
    const { card_type, is_physical, shipping_address, account_id } = body;
    const last4 = String(Math.floor(Math.random() * 9000) + 1000);
    const expMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const expYear = String(new Date().getFullYear() + 4);

    // If physical card, debit $10 fee
    if (is_physical && account_id) {
      const { data: acct } = await supabase.from("zenipay_accounts").select("balance").eq("id", account_id).single();
      if (acct) {
        await supabase.from("zenipay_accounts").update({
          balance: Math.max(0, Number(acct.balance) - FEES.physical_card),
          updated_at: now,
        }).eq("id", account_id);
      }
    }

    const { data, error } = await supabase.from("zenipay_cards").insert({
      merchant_id,
      account_id: account_id || null,
      card_type: card_type || "visa_debit",
      last4,
      expiry: `${expYear}-${expMonth}`,
      status: is_physical ? "applied" : "active",
      is_virtual: !is_physical,
      is_physical: !!is_physical,
      shipping_address: shipping_address || {},
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, card: data });
  }

  // ═══ FREEZE/UNFREEZE CARD ═══
  if (action === "toggle_card") {
    const { card_id, freeze } = body;
    await supabase.from("zenipay_cards").update({
      status: freeze ? "frozen" : "active",
      updated_at: now,
    }).eq("id", card_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
