// Routes issuer-provider ops by `issued_cards.issuer_provider`. PR 2 adds
// the real Stripe Issuing provider; PR 1 ships only the mock.

import type { IIssuerProvider } from "./issuer-interface";
import type { IssuerProvider } from "./types";
import { mockIssuingProvider } from "./mock-issuing/provider";

const registry = new Map<IssuerProvider, IIssuerProvider>([
  [mockIssuingProvider.name, mockIssuingProvider],
]);

export function getIssuer(provider: IssuerProvider): IIssuerProvider {
  const p = registry.get(provider);
  if (!p) throw new Error(`issuer provider ${provider} not registered (PR 2 adds stripe_issuing)`);
  return p;
}

/** Default provider for new orgs until a real issuer is connected. */
export function defaultIssuer(): IIssuerProvider {
  return mockIssuingProvider;
}
