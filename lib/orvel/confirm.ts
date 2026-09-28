// Orvel's pending actions: anything that leaves ZeniPay (emails, refunds,
// transfers) is prepared first and only runs when the merchant clicks
// « Confirmer ». The prepared call travels to the browser as a signed,
// expiring token (no table needed); the server verifies it and runs it once.

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateConfigKey } from "@/lib/zenipay/merchant-store";

const TTL_MS = 30 * 60_000;
const USED_KEY = "zp_orvel_confirmed";

export interface Preview { title: string; lines: string[]; danger?: boolean }
export interface PendingAction { tool: string; preview: Preview; token: string }

function secret(): string {
  const s = process.env.ZP_SESSION_SECRET;
  if (!s) throw new Error("ZP_SESSION_SECRET missing");
  return "orvel-confirm:" + s;
}
const sign = (payload: string) => crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function signPending(merchantId: string, tool: string, args: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify({ m: merchantId, t: tool, a: args, e: Date.now() + TTL_MS, n: crypto.randomUUID() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyPending(token: string, merchantId: string): { tool: string; args: Record<string, unknown> } | { error: string } {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return { error: "Action invalide." };
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { error: "Action invalide." };
  let p: { m?: string; t?: string; a?: Record<string, unknown>; e?: number };
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return { error: "Action invalide." }; }
  if (p.m !== merchantId) return { error: "Cette action appartient à un autre compte." };
  if (!p.e || Date.now() > p.e) return { error: "Cette action a expiré (30 min). Redemandez-la à Orvel." };
  return { tool: String(p.t || ""), args: p.a || {} };
}

/** Single use: remembers the token's hash; a second click (or replay) is refused. */
export async function claimPending(supabase: SupabaseClient, merchantId: string, token: string): Promise<boolean> {
  const h = crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
  let won = false;
  await updateConfigKey<string[]>(supabase, merchantId, USED_KEY, [], (cur) => {
    if (Array.isArray(cur) && cur.includes(h)) return undefined;
    won = true;
    return [h, ...(Array.isArray(cur) ? cur : [])].slice(0, 300);
  });
  return won;
}
