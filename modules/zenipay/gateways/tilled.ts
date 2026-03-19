/**
 * ZeniPay → Tilled Gateway (LIVE)
 * Docs: https://docs.tilled.com/api/
 * Auth: Bearer {secret_key}, Header: tilled-account: {account_id}
 */

// Use sandbox URL if env is not explicitly "production"
const TILLED_BASE = process.env.TILLED_ENV === "production"
  ? "https://api.tilled.com"
  : "https://sandbox-api.tilled.com";

function tilledHeaders() {
  const sk = process.env.TILLED_SECRET_KEY || "";
  const accountId = process.env.TILLED_ACCOUNT_ID || "";
  return {
    "Authorization": `Bearer ${sk}`,
    "tilled-account": accountId,
    "Content-Type": "application/json",
  };
}

async function tilledRequest(method: string, path: string, body?: object) {
  const res = await fetch(`${TILLED_BASE}${path}`, {
    method,
    headers: tilledHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = data.message || `HTTP ${res.status}`;
    throw new Error(`Tilled error: ${err}`);
  }
  return data;
}

export interface TilledPaymentParams {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
  postalCode?: string;
  amount: number;       // in dollars
  currency: string;
  description: string;
  paymentId: string;
}

export async function processTilledPayment(params: TilledPaymentParams): Promise<{
  success: boolean;
  transferId: string;
  instrumentId: string;
  state: string;
  error?: string;
}> {
  // 1. Create PaymentMethod (tokenize card)
  const pm = await tilledRequest("POST", "/v1/payment-methods", {
    type: "card",
    card: {
      number: params.cardNumber.replace(/\s/g, ""),
      exp_month: parseInt(params.expiryMonth, 10),
      exp_year: parseInt(params.expiryYear, 10),
      cvc: params.cvc,
    },
    billing_details: {
      name: params.cardholderName,
      ...(params.postalCode ? { address: { zip: params.postalCode } } : {}),
    },
  });

  const paymentMethodId = pm.id;
  if (!paymentMethodId) throw new Error("Tilled: payment method creation failed");

  // 2. Create PaymentIntent
  const amountCents = Math.round(params.amount * 100);
  const pi = await tilledRequest("POST", "/v1/payment-intents", {
    amount: amountCents,
    currency: params.currency.toLowerCase(),
    payment_method_types: ["card"],
    payment_method: paymentMethodId,
    description: params.description || `ZeniPay ${params.paymentId}`,
    metadata: {
      zenipay_id: params.paymentId,
    },
  });

  const piId = pi.id;
  if (!piId) throw new Error("Tilled: payment intent creation failed");

  // 3. Confirm PaymentIntent
  const confirmed = await tilledRequest("POST", `/v1/payment-intents/${piId}/confirm`, {
    payment_method: paymentMethodId,
  });

  const status = confirmed.status || "";
  const succeeded = status === "succeeded" || status === "processing";

  return {
    success: succeeded,
    transferId: confirmed.id || piId,
    instrumentId: paymentMethodId,
    state: status.toUpperCase(),
    error: succeeded ? undefined : `Payment ${status}`,
  };
}
