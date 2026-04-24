// PR 16 — provider factory.
//
// Returns the active card-issuing provider based on env flags. If
// neither Stripe nor Finix issuing is enabled, returns null and the
// UI renders the "Coming soon" state. API routes return 503 so the
// client distinguishes between "not configured" and "provider error".
//
// Finix wins over Stripe when both are set — Riaz enabling Finix is
// what we're waiting on; flipping the flag should switch us without
// a code change.

import type { ICardIssuingProvider } from "./provider-interface";
import { FinixCardProvider, finixIssuingEnabled } from "./finix-provider";
import { StripeCardProvider, stripeIssuingEnabled } from "./stripe-provider";

export function getCardIssuingProvider(): ICardIssuingProvider | null {
  if (finixIssuingEnabled()) return new FinixCardProvider();
  if (stripeIssuingEnabled()) return new StripeCardProvider();
  return null;
}

export function cardIssuingStatus(): { enabled: boolean; provider: "stripe" | "finix" | null } {
  if (finixIssuingEnabled()) return { enabled: true, provider: "finix" };
  if (stripeIssuingEnabled()) return { enabled: true, provider: "stripe" };
  return { enabled: false, provider: null };
}
