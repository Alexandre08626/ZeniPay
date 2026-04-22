// Routes issuer-provider ops by `issued_cards.issuer_provider`.
// PR 2 wires Stripe Issuing when STRIPE_ISSUING_SECRET_KEY is present;
// otherwise falls through to MockIssuingProvider so preview/demo orgs
// work without Issuing approval.

import type { IIssuerProvider } from "./issuer-interface";
import type { IssuerProvider } from "./types";
import { mockIssuingProvider } from "./mock-issuing/provider";
import { stripeIssuingProvider, stripeIssuingAvailable } from "./stripe-issuing/provider";

const registry = new Map<IssuerProvider, IIssuerProvider>([
  [mockIssuingProvider.name, mockIssuingProvider],
  [stripeIssuingProvider.name, stripeIssuingProvider],
]);

export function getIssuer(provider: IssuerProvider): IIssuerProvider {
  if (provider === "stripe_issuing" && !stripeIssuingAvailable()) {
    // Graceful degrade — pretend it's mock so the UI doesn't 500 in preview.
    return mockIssuingProvider;
  }
  const p = registry.get(provider);
  if (!p) throw new Error(`issuer provider ${provider} not registered`);
  return p;
}

/** Default provider for new orgs. Stripe if configured, else mock. */
export function defaultIssuer(): IIssuerProvider {
  return stripeIssuingAvailable() ? stripeIssuingProvider : mockIssuingProvider;
}

export function defaultIssuerName(): IssuerProvider {
  return stripeIssuingAvailable() ? "stripe_issuing" : "mock";
}
