/**
 * ZeniPay → Finix Gateway Integration
 *
 * FINIX API ENDPOINTS USED:
 * ========================
 *
 * Base URLs:
 * - Sandbox: https://finix.sandbox-payments-api.com
 * - Production: https://finix.live-payments-api.com
 *
 * Authentication: HTTP Basic Auth (username:password encoded as base64)
 * API Version Header: Finix-Version: 2022-02-01
 *
 * PAYMENT PROCESSING:
 * ------------------
 * POST /payment_instruments
 *   → Tokenize card details and create payment instrument
 *   → Required: type, number, expiration_month, expiration_year, security_code, name, address, identity
 *   → Returns: instrument ID, brand, last_four
 *
 * POST /transfers
 *   → Create a payment transfer (charge a card)
 *   → Required: merchant, amount, currency, source (instrument_id), operation_key
 *   → Returns: transfer ID, state (SUCCEEDED|PENDING|FAILED), amount
 *
 * GET /transfers/:id
 *   → Get transfer status and details
 *   → Returns: complete transfer object with state, amount, fees, timestamps
 *
 * POST /transfers/:id/reversals
 *   → Create a refund/reversal for a transfer
 *   → Optional: amount (for partial refunds)
 *   → Returns: reversal object with state
 *
 * MERCHANT ONBOARDING:
 * -------------------
 * POST /identities
 *   → Create a merchant identity (business/person entity)
 *   → Required: entity type, business_name, tax_id, address, phone, email
 *   → Returns: identity ID
 *
 * POST /merchants
 *   → Create a merchant account from an identity
 *   → Required: identity ID, processor (FINIX)
 *   → Returns: merchant ID, onboarding state, verification status
 *
 * COMMISSION SPLITS:
 * -----------------
 * Configured via merchant-level settings (not implemented yet)
 * Uses Finix's platform fee model: 90% of markup goes to ZeniPay
 *
 * WEBHOOKS:
 * --------
 * Handled in: app/api/zenipay/webhooks/finix/route.ts
 * Events: TRANSFER_SUCCEEDED, TRANSFER_FAILED, TRANSFER_REVERSED
 * Security: HMAC-SHA256 signature verification using FINIX_WEBHOOK_SECRET
 *
 * PRICING MODEL:
 * -------------
 * ZeniPay charges: 2.90% + $0.30
 * Finix cost (interchange-plus): 1.90% + $0.15
 * Markup: 1.00% + $0.15
 * ZeniPay receives: 90% of markup = 0.90% + $0.135
 */

const FINIX_BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function finixRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${FINIX_BASE}${path}`, {
    method,
    headers: {
      "Authorization": finixAuth(),
      "Content-Type": "application/json",
      "Finix-Version": "2022-02-01",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = data._embedded?.errors?.[0]?.message || data.message || `HTTP ${res.status}`;
    throw new Error(`Finix error: ${err}`);
  }
  return data;
}

/**
 * Create a Payment Instrument from tokenized card data
 * In sandbox: pass card data directly (server-side tokenization allowed)
 * In production: use Finix.js on client → get instrument ID → pass here
 */
export async function createPaymentInstrument(params: {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
  postalCode?: string;
  identityId?: string;
}) {
  const body = {
    type: "PAYMENT_CARD",
    number: params.cardNumber.replace(/\s/g, ""),
    expiration_month: parseInt(params.expiryMonth),
    expiration_year: params.expiryYear.length === 4 ? parseInt(params.expiryYear) : parseInt(`20${params.expiryYear}`),
    security_code: params.cvc,
    name: params.cardholderName,
    address: { postal_code: params.postalCode || "00000" },
    identity: params.identityId || process.env.FINIX_MERCHANT_IDENTITY_ID || "",
  };
  const result = await finixRequest("POST", "/payment_instruments", body);
  return { instrumentId: result.id as string, brand: result.brand, last4: result.last_four };
}

/**
 * Create a Transfer (charge card)
 */
export async function createTransfer(params: {
  merchantId: string;
  instrumentId: string;
  amountCents: number;
  currency?: string;
  description?: string;
  tags?: Record<string, string>;
  idempotencyKey?: string;
}) {
  const body = {
    merchant: params.merchantId,
    amount: params.amountCents,
    currency: params.currency || "USD",
    source: params.instrumentId,
    operation_key: "SALE",
    idempotency_id: params.idempotencyKey || "txn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    tags: params.tags || {},
    three_d_secure_authentication: {
      three_d_secure_authentication_type: "OPTIONAL",
    },
    ...(params.description ? { statement_descriptor: params.description.slice(0, 20) } : {}),
  };
  const result = await finixRequest("POST", "/transfers", body);

  // Extract 3DS redirect URL if present (card issuer requires authentication)
  const threeDSRedirectUrl = result.three_d_secure_redirect?.three_d_secure_redirect_url || null;

  return {
    transferId: result.id as string,
    state: result.state as string, // SUCCEEDED | FAILED | PENDING
    amount: result.amount as number,
    threeDSRedirectUrl,
    raw: result,
  };
}

/**
 * Get transfer status
 */
export async function getTransfer(transferId: string) {
  return finixRequest("GET", `/transfers/${transferId}`);
}

/**
 * Create refund
 */
export async function createReversal(transferId: string, amountCents?: number) {
  const body = amountCents ? { amount: amountCents } : {};
  return finixRequest("POST", `/transfers/${transferId}/reversals`, body);
}

/**
 * Validate card details before sending to Finix
 */
function validateCard(params: { cardNumber: string; expiryMonth: string; expiryYear: string; cvc: string; cardholderName: string }) {
  const num = params.cardNumber.replace(/\s/g, "");
  // Luhn check
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  if (sum % 10 !== 0) throw new Error("Invalid card number");
  if (!/^\d{3,4}$/.test(params.cvc)) throw new Error("Invalid CVC");
  const month = parseInt(params.expiryMonth);
  if (month < 1 || month > 12) throw new Error("Invalid expiry month");
  if (!params.cardholderName || params.cardholderName.trim().length < 2) throw new Error("Cardholder name required");
}

/**
 * Main ZeniPay process function
 */
export async function processFinixPayment(params: {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
  postalCode?: string;
  amount: number; // in dollars
  currency?: string;
  description?: string;
  paymentId: string;
}) {
  // Validate card before processing
  validateCard(params);

  const merchantId = process.env.FINIX_MERCHANT_ID || "";
  if (!merchantId) throw new Error("FINIX_MERCHANT_ID not configured");

  // Step 1: Tokenize card
  const { instrumentId, brand, last4 } = await createPaymentInstrument({
    cardNumber: params.cardNumber,
    expiryMonth: params.expiryMonth,
    expiryYear: params.expiryYear,
    cvc: params.cvc,
    cardholderName: params.cardholderName,
    postalCode: params.postalCode,
  });

  // Step 2: Charge
  const amountCents = Math.round(params.amount * 100);
  const transfer = await createTransfer({
    merchantId,
    instrumentId,
    amountCents,
    currency: params.currency || "USD",
    description: `ZeniPay ${params.paymentId}`,
    tags: { payment_id: params.paymentId, source: "zeniva_travel" },
  });

  return {
    success: transfer.state === "SUCCEEDED" || transfer.state === "PENDING",
    transferId: transfer.transferId || "",
    instrumentId,
    brand,
    last4,
    state: transfer.state,
    amountCents: transfer.amount,
    threeDSRedirectUrl: transfer.threeDSRedirectUrl || null,
  };
}
