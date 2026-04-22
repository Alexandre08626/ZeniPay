// RFC 6238 TOTP (Time-based One-Time Password).
//
// 20-byte (160-bit) secret, 30-second period, SHA-1, 6 digits — matching
// Google Authenticator / 1Password / Authy defaults. Drift tolerance of
// ±1 window (90-second effective acceptance range) handles clock skew.
//
// The secret is stored in Supabase Vault (see vault-secrets.ts). Only
// service_role can retrieve it. The app code calls verifyCode() with the
// decrypted secret at auth time.

import { createHmac, randomBytes } from "node:crypto";

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_S = 30;
export const TOTP_DRIFT_WINDOWS = 1; // accept codes from ±1 period

/** Generate a fresh 20-byte base32 secret (unpadded) for a new approver. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Produce the 6-digit code at `timestampSeconds` for `secretBase32`. */
export function generateCode(secretBase32: string, timestampSeconds: number = Math.floor(Date.now() / 1000)): string {
  const counter = Math.floor(timestampSeconds / TOTP_PERIOD_S);
  const key = base32Decode(secretBase32);
  const ctrBuf = Buffer.alloc(8);
  ctrBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(ctrBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = binary % 10 ** TOTP_DIGITS;
  return String(mod).padStart(TOTP_DIGITS, "0");
}

/** Constant-time code verification with drift tolerance. */
export function verifyCode(
  secretBase32: string,
  candidate: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{6}$/.test(candidate)) return false;
  for (let w = -TOTP_DRIFT_WINDOWS; w <= TOTP_DRIFT_WINDOWS; w++) {
    const code = generateCode(secretBase32, nowSeconds + w * TOTP_PERIOD_S);
    if (constantTimeEquals(code, candidate)) return true;
  }
  return false;
}

/** otpauth:// URI for QR-code provisioning of authenticator apps. */
export function provisioningUri(params: { secret: string; account: string; issuer?: string }): string {
  const label = encodeURIComponent(`${params.issuer ?? "ZeniPay"}:${params.account}`);
  const qs = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer ?? "ZeniPay",
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_S),
  });
  return `otpauth://totp/${label}?${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// RFC 4648 base32 (no padding, UPPER).
// ---------------------------------------------------------------------------
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 0x1f];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let idx = 0; idx < clean.length; idx++) {
    const c = clean.charAt(idx);
    const i = ALPHABET.indexOf(c);
    if (i === -1) throw new Error(`base32: invalid char "${c}"`);
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
