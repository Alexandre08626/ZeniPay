/**
 * ZeniPay → Authorize.net Gateway Connector
 * Connects ZeniPay to Authorize.net (sandbox + production)
 * NEVER stores card numbers — only processor tokens (customerProfileId, paymentProfileId)
 * PCI SAQ-A compliant: card data goes directly to Authorize.net Accept.js
 */

export interface AuthNetConfig {
  apiLoginId: string;
  transactionKey: string;
  env: "sandbox" | "production";
}

export interface AuthNetPaymentRequest {
  opaqueDataDescriptor: string; // Accept.js opaque data descriptor
  opaqueDataValue: string;       // Accept.js opaque data value (tokenized card)
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  invoiceNumber: string;
}

export interface AuthNetPaymentResponse {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseText?: string;
  avsResultCode?: string;
  cvvResultCode?: string;
  errorCode?: string;
  errorMessage?: string;
}

export function getAuthNetConfig(): AuthNetConfig {
  return {
    apiLoginId: process.env.AUTHORIZENET_API_LOGIN_ID || "",
    transactionKey: process.env.AUTHORIZENET_TRANSACTION_KEY || "",
    env: (process.env.AUTHORIZENET_ENV as "sandbox" | "production") || "sandbox",
  };
}

export function getAuthNetApiUrl(env: "sandbox" | "production"): string {
  return env === "production"
    ? "https://api2.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

/**
 * Process a credit card payment via Authorize.net
 * Card data is passed as Accept.js opaque data (tokenized) — never raw card numbers
 */
export async function processAuthNetPayment(
  req: AuthNetPaymentRequest
): Promise<AuthNetPaymentResponse> {
  const config = getAuthNetConfig();

  if (!config.apiLoginId || config.apiLoginId === "PLACEHOLDER_TEST") {
    // Return simulated success in test/placeholder mode
    return {
      success: true,
      transactionId: `TEST-${Date.now().toString(36).toUpperCase()}`,
      responseCode: "1",
      responseText: "This transaction has been approved. (TEST MODE)",
    };
  }

  const payload = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: config.apiLoginId,
        transactionKey: config.transactionKey,
      },
      refId: req.invoiceNumber,
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: req.amount.toFixed(2),
        payment: {
          opaqueData: {
            dataDescriptor: req.opaqueDataDescriptor,
            dataValue: req.opaqueDataValue,
          },
        },
        order: {
          invoiceNumber: req.invoiceNumber,
          description: req.description,
        },
        customer: {
          type: "individual",
          email: req.customerEmail,
        },
        transactionSettings: {
          setting: [
            { settingName: "duplicateWindow", settingValue: "120" },
          ],
        },
      },
    },
  };

  const url = getAuthNetApiUrl(config.env);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  const txResponse = data?.transactionResponse;

  if (!txResponse || txResponse.responseCode !== "1") {
    return {
      success: false,
      responseCode: txResponse?.responseCode,
      errorCode: txResponse?.errors?.[0]?.errorCode,
      errorMessage: txResponse?.errors?.[0]?.errorText || "Payment declined",
    };
  }

  return {
    success: true,
    transactionId: txResponse.transId,
    responseCode: txResponse.responseCode,
    responseText: txResponse.messages?.[0]?.description,
    avsResultCode: txResponse.avsResultCode,
    cvvResultCode: txResponse.cvvResultCode,
  };
}

/**
 * Refund a captured transaction via Authorize.net
 */
export async function refundAuthNetPayment(
  transactionId: string,
  amount: number,
  lastFourDigits: string
): Promise<AuthNetPaymentResponse> {
  const config = getAuthNetConfig();

  if (!config.apiLoginId || config.apiLoginId === "PLACEHOLDER_TEST") {
    return { success: true, transactionId: `REFUND-${transactionId}`, responseCode: "1" };
  }

  const payload = {
    createTransactionRequest: {
      merchantAuthentication: { name: config.apiLoginId, transactionKey: config.transactionKey },
      transactionRequest: {
        transactionType: "refundTransaction",
        amount: amount.toFixed(2),
        payment: { creditCard: { cardNumber: lastFourDigits, expirationDate: "XXXX" } },
        refTransId: transactionId,
      },
    },
  };

  const url = getAuthNetApiUrl(config.env);
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  const txR = data?.transactionResponse;
  return txR?.responseCode === "1"
    ? { success: true, transactionId: txR.transId, responseCode: "1" }
    : { success: false, errorMessage: txR?.errors?.[0]?.errorText || "Refund failed" };
}
