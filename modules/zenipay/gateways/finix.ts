/**
 * ZeniPay → Finix Gateway
 * Finix Sandbox: https://finix.sandbox-payments-api.com
 * Auth: HTTP Basic (username:password)
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
}) {
  const body = {
    merchant: params.merchantId,
    amount: params.amountCents,
    currency: params.currency || "USD",
    source: params.instrumentId,
    operation_key: "SALE",
    tags: params.tags || {},
    ...(params.description ? { statement_descriptor: params.description.slice(0, 20) } : {}),
  };
  const result = await finixRequest("POST", "/transfers", body);
  return {
    transferId: result.id as string,
    state: result.state as string, // SUCCEEDED | FAILED | PENDING
    amount: result.amount as number,
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
  };
}
