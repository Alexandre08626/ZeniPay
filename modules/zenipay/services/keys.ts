/**
 * API Key Generation Utilities
 * Generates secure API keys and secrets for ZeniPay merchants
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number): string {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

export function generateApiKey(prefix: string = "zpk"): string {
  return `${prefix}_${randomString(24)}`;
}

export function generateApiSecret(prefix: string = "zps"): string {
  return `${prefix}_${randomString(32)}`;
}

export function generateMerchantId(): string {
  return `mer_${randomString(16)}`;
}

export function generatePaymentId(): string {
  return `pay_${randomString(16)}`;
}

export function generateInvoiceId(): string {
  return `inv_${randomString(16)}`;
}

export function generatePayoutId(): string {
  return `po_${randomString(16)}`;
}