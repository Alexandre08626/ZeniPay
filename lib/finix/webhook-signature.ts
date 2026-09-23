// Finix webhook signature verification.
//
// Finix signs every delivery as
//   Finix-Signature: timestamp=<epoch-seconds>, sig=<lowercase hex>
// where sig = HMAC-SHA256("<timestamp>:<raw body>") keyed with the
// webhook's `secret_signing_key` (returned once by POST /webhooks) used as
// a UTF-8 string — not hex-decoded.
//
// A bare hex value with no "sig=" is the legacy internal-replay format:
// HMAC over the raw body alone. Kept so replay tooling keeps working.

import { createHmac } from "crypto";

/** Reject signatures whose timestamp is further than this from now. */
export const SIGNATURE_TOLERANCE_SEC = 300;

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyFinixSignature(
  body: string,
  signatureHeader: string,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !signatureHeader) return false;

  const tsMatch = /timestamp=(\d+)/i.exec(signatureHeader);
  const sigMatch = /sig=([0-9a-fA-F]+)/i.exec(signatureHeader);

  if (tsMatch && sigMatch) {
    const ts = Number(tsMatch[1]);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(nowSec - ts) > SIGNATURE_TOLERANCE_SEC) return false;
    const expected = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
    return timingSafeEqualHex(expected, sigMatch[1].toLowerCase());
  }

  // Legacy: bare hex HMAC over the body.
  const trimmed = signatureHeader.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(trimmed)) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqualHex(expected, trimmed);
}
