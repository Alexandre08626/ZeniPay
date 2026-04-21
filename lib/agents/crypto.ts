// Ed25519 keypair + signature utilities for the Agents product.
// Uses @noble/ed25519 (zero-dep, audited, works in Node & Edge runtimes).

import * as ed from "@noble/ed25519";
import { createHash, randomBytes } from "node:crypto";

// @noble/ed25519 needs a SHA-512 impl injected in Node (it uses the global
// by default in browsers). Provide one via node:crypto.
(ed as unknown as { hashes: { sha512: (m: Uint8Array) => Uint8Array } }).hashes ||= {} as never;
(ed as unknown as { hashes: { sha512: (m: Uint8Array) => Uint8Array } }).hashes.sha512 = (m: Uint8Array) => {
  const h = createHash("sha512");
  h.update(m);
  return new Uint8Array(h.digest());
};

export interface Ed25519Keypair {
  publicKeyBase64: string;
  privateKeyBase64: string; // 32-byte seed
}

export async function generateKeypair(): Promise<Ed25519Keypair> {
  const seed = randomBytes(32);
  const publicKey = await ed.getPublicKeyAsync(seed);
  return {
    privateKeyBase64: Buffer.from(seed).toString("base64"),
    publicKeyBase64: Buffer.from(publicKey).toString("base64"),
  };
}

export async function sign(
  message: string | Uint8Array,
  privateKeyBase64: string,
): Promise<string> {
  const seed = Buffer.from(privateKeyBase64, "base64");
  if (seed.length !== 32) throw new Error("crypto: private key must be 32-byte base64 seed");
  const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
  const sig = await ed.signAsync(msg, seed);
  return Buffer.from(sig).toString("base64");
}

export async function verify(
  signatureBase64: string,
  message: string | Uint8Array,
  publicKeyBase64: string,
): Promise<boolean> {
  try {
    const sig = Buffer.from(signatureBase64, "base64");
    const pk = Buffer.from(publicKeyBase64, "base64");
    if (sig.length !== 64 || pk.length !== 32) return false;
    const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
    return await ed.verifyAsync(sig, msg, pk);
  } catch {
    return false;
  }
}

/**
 * Canonical JSON serializer for signing a payment request.
 * Stable key order so client + server compute the same bytes.
 */
export function canonicalJsonForSigning(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
