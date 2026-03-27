export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FINIX_BASE = "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identity_id, merchant_id_internal } = body;

    if (!identity_id) {
      return NextResponse.json(
        { error: "identity_id is required" },
        { status: 400 },
      );
    }

    const finixBody = {
      identity: identity_id,
      processor: "DUMMY_V1",
      tags: { zenipay_merchant_id: merchant_id_internal || "" },
    };

    const res = await fetch(`${FINIX_BASE}/merchants`, {
      method: "POST",
      headers: {
        Authorization: finixAuth(),
        "Content-Type": "application/json",
        "Finix-Version": "2022-02-01",
      },
      body: JSON.stringify(finixBody),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Finix API error", details: data },
        { status: res.status },
      );
    }

    // Save to Supabase
    const supabase = getSupabase();
    if (supabase && merchant_id_internal) {
      await supabase
        .from("zenipay_merchants")
        .update({
          finix_identity_id: identity_id,
          finix_merchant_id: data.id,
          onboarding_state: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchant_id_internal);
    }

    return NextResponse.json({
      merchant_id: data.id,
      merchant: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
