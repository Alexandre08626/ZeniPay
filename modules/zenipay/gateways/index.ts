/**
 * ZeniPay Gateway Abstraction Layer
 * Architecture: Zeniva → ZeniPay → Tilled → Card Network → Bank
 * Primary: Tilled (LIVE)
 */

export interface GatewayResult {
  success: boolean;
  transactionId: string;
  instrumentId?: string;
  brand?: string;
  last4?: string;
  state: string;
  error?: string;
}

export async function processPayment(params: {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
  postalCode?: string;
  amount: number;
  currency?: string;
  description?: string;
  paymentId: string;
}): Promise<GatewayResult> {
  // Always use Tilled — live payment processor
  const tilledSk = process.env.TILLED_SECRET_KEY;
  const tilledAccountId = process.env.TILLED_ACCOUNT_ID;

  if (!tilledSk || !tilledAccountId) {
    console.error("[ZeniPay] MISSING TILLED ENV VARS:", {
      hasSk: !!tilledSk,
      hasAccountId: !!tilledAccountId,
    });
    return {
      success: false,
      transactionId: "",
      state: "FAILED",
      error: "Payment processor not configured. Contact support.",
    };
  }

  const { processTilledPayment } = await import("./tilled");
  try {
    const result = await processTilledPayment({
      ...params,
      currency: params.currency || "usd",
      description: params.description || `ZeniPay ${params.paymentId}`,
    });
    return {
      success: result.success,
      transactionId: result.transferId,
      instrumentId: result.instrumentId,
      state: result.state,
      error: result.error,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ZeniPay] Tilled error:", msg);
    return {
      success: false,
      transactionId: "",
      state: "FAILED",
      error: msg,
    };
  }
}
