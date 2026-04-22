// POST /api/_webhooks/finix-to-zenicore
//
// Bridges Finix transfer events into the ZeniCore ledger. HMAC-verified
// (header X-Finix-Signature = hex(HMAC-SHA256(raw_body, FINIX_WEBHOOK_SECRET))).
//
// All dedup + credit logic lives in zenicore.ingest_finix_transfer which
// returns:
//   status   : 'received' | 'credited' | 'failed' | 'ignored'
//   tx_group : the zenicore tx_group id (null on ignored/failed)
//   reason   : human-readable explanation
//
// We return 200 on any outcome where the DB accepted the event (even
// 'ignored' — the idempotent second delivery of the same event is a success
// from Finix's perspective). Only signature failures + malformed bodies
// return 401/400.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";       // node:crypto

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const secret = process.env.FINIX_WEBHOOK_SECRET ?? "";
  const signatureHeader = req.headers.get("x-finix-signature") ?? "";
  if (!secret) {
    return new Response(JSON.stringify({ error: { code: "server_error", message: "FINIX_WEBHOOK_SECRET unset" } }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  if (!signatureHeader) {
    return new Response(JSON.stringify({ error: { code: "unauthorized", message: "missing_signature" } }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = safeHexBuffer(signatureHeader);
  const b = Buffer.from(expected, "hex");
  if (!a || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: { code: "unauthorized", message: "bad_signature" } }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(rawBody) as Record<string, unknown>; }
  catch {
    return new Response(JSON.stringify({ error: { code: "bad_request", message: "body_not_json" } }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  // Normalize the Finix envelope. We accept either the real Finix payload
  // shape {id, type, entity, ...} or a flat {event_id, event_type, transfer,
  // organization_id, amount_cents, currency} envelope used by internal
  // replay tools.
  const envelope = extractEnvelope(parsed);
  if (!envelope) {
    return new Response(JSON.stringify({ error: { code: "bad_request", message: "unrecognized_payload" } }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new Response(JSON.stringify({ error: { code: "server_error", message: "supabase_env_missing" } }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // zenicore schema isn't PostgREST-exposed — route through the
  // public.zc_ingest_finix_transfer SECURITY DEFINER wrapper.
  const { data, error } = await supabase.rpc("zc_ingest_finix_transfer", {
    p_finix_event_id:    envelope.event_id,
    p_finix_event_type:  envelope.event_type,
    p_finix_transfer_id: envelope.transfer_id,
    p_organization_id:   envelope.organization_id,
    p_amount_cents:      envelope.amount_cents,
    p_currency:          envelope.currency,
    p_raw:               parsed,
  });
  if (error) {
    return new Response(JSON.stringify({ error: { code: "server_error", message: error.message } }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  const row = (data as Array<{ status: string; tx_group: string | null; reason: string | null }>)?.[0]
    ?? { status: "received", tx_group: null, reason: null };
  return NextResponse.json({ ok: true, status: row.status, tx_group: row.tx_group, reason: row.reason });
}

// Reject HEAD/GET explicitly so ops tooling knows the endpoint expects POST.
export async function GET() {
  return new Response(JSON.stringify({ error: { code: "bad_request", message: "POST only" } }), {
    status: 405, headers: { "content-type": "application/json", allow: "POST" },
  });
}

// ---------------------------------------------------------------------------
interface Envelope {
  event_id: string;
  event_type: string;
  transfer_id: string | null;
  organization_id: string | null;
  amount_cents: number | null;
  currency: string | null;
}

function extractEnvelope(p: Record<string, unknown>): Envelope | null {
  // Flat internal-replay shape first.
  if (typeof p.event_id === "string" && typeof p.event_type === "string") {
    return {
      event_id:        String(p.event_id),
      event_type:      String(p.event_type),
      transfer_id:     p.transfer_id ? String(p.transfer_id) : null,
      organization_id: p.organization_id ? String(p.organization_id) : null,
      amount_cents:    typeof p.amount_cents === "number" ? p.amount_cents : null,
      currency:        typeof p.currency === "string" ? p.currency : null,
    };
  }
  // Finix envelope.
  const id = typeof p.id === "string" ? p.id : null;
  const type = typeof p.type === "string" ? p.type : null;
  if (!id || !type) return null;
  const entity = (p.entity ?? null) as Record<string, unknown> | null;
  const linked = (p._embedded ?? {}) as Record<string, unknown>;
  const transfers = Array.isArray(linked.transfers) ? (linked.transfers as Array<Record<string, unknown>>) : [];
  const transfer = transfers[0] ?? entity ?? null;
  return {
    event_id: id,
    event_type: type,
    transfer_id: transfer && typeof transfer.id === "string" ? String(transfer.id) : null,
    organization_id: transfer && typeof transfer.tags === "object" && transfer.tags !== null
      ? (((transfer.tags as Record<string, unknown>).organization_id as string | undefined) ?? null)
      : null,
    amount_cents: transfer && typeof transfer.amount === "number" ? (transfer.amount as number) : null,
    currency: transfer && typeof transfer.currency === "string" ? String(transfer.currency) : null,
  };
}

function safeHexBuffer(hex: string): Buffer | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  return Buffer.from(hex, "hex");
}
