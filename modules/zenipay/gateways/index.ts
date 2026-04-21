/**
 * ZeniPay Gateway Abstraction Layer
 * Architecture: Zeniva → ZeniPay → Finix → Card Network → Bank
 * Primary: Finix (LIVE)
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
  instrumentId: string;
  amount: number;
  currency?: string;
  description?: string;
  paymentId: string;
}): Promise<GatewayResult> {
  // Always use Finix — live payment processor
  const finixUser = process.env.FINIX_API_USERNAME;
  const finixPass = process.env.FINIX_API_PASSWORD;
  const finixMerchant = process.env.FINIX_MERCHANT_ID;

  if (!finixUser || !finixPass || !finixMerchant) {
    console.error("[ZeniPay] MISSING FINIX ENV VARS:", {
      hasUser: !!finixUser,
      hasPass: !!finixPass,
      hasMerchant: !!finixMerchant,
    });
    return {
      success: false,
      transactionId: "",
      state: "FAILED",
      error: "Payment processor not configured. Contact support.",
    };
  }

  const { processFinixPaymentWithInstrument } = await import("./finix");
  try {
    const result = await processFinixPaymentWithInstrument({
      instrumentId: params.instrumentId,
      amount: params.amount,
      currency: params.currency || "CAD",
      description: params.description || `ZeniPay ${params.paymentId}`,
      paymentId: params.paymentId,
    });
    return {
      success: result.success,
      transactionId: result.transferId,
      instrumentId: result.instrumentId,
      brand: result.brand,
      last4: result.last4,
      state: result.state,
      error: undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ZeniPay] Finix error:", msg);
    return {
      success: false,
      transactionId: "",
      state: "FAILED",
      error: msg,
    };
  }
}
