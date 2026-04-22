// The contract every card issuer implements. Business logic (policy, ledger,
// audit) is provider-agnostic — it only talks to this interface. Swapping
// Stripe Issuing for Marqeta is a registry entry, not a rewrite.

import type {
  IssuerAuthorization,
  IssuerCard,
  IssuerCardholder,
  IssuerProvider,
  SpendingControls,
  IssuerWebhookVerified,
} from "./types";

export interface CreateCardholderInput {
  name: string;
  email?: string;
  type: "individual" | "company";
  /** Provider-specific billing payload. */
  billing?: Record<string, unknown>;
}

export interface CreateCardInput {
  cardholder_id: string;
  card_type: "virtual" | "physical";
  currency: SpendingControls["currency"];
  spending_controls: SpendingControls;
  metadata?: Record<string, string>;
}

export interface IIssuerProvider {
  readonly name: IssuerProvider;

  createCardholder(input: CreateCardholderInput): Promise<IssuerCardholder>;
  createCard(input: CreateCardInput): Promise<IssuerCard>;
  updateCardControls(cardId: string, controls: SpendingControls): Promise<IssuerCard>;
  pauseCard(cardId: string): Promise<IssuerCard>;
  resumeCard(cardId: string): Promise<IssuerCard>;
  cancelCard(cardId: string): Promise<IssuerCard>;
  getCard(cardId: string): Promise<IssuerCard>;
  listCards(cardholderId?: string): Promise<IssuerCard[]>;

  /** Parse + signature-verify an inbound webhook. */
  verifyWebhook(rawBody: string, headers: Record<string, string>): IssuerWebhookVerified;

  /** Turn a verified webhook into an IssuerAuthorization with reply hooks. */
  handleAuthorizationWebhook(verified: IssuerWebhookVerified): Promise<IssuerAuthorization | null>;
}
