// Abstract card-issuing types. Providers: Stripe Issuing (PR 2), Marqeta,
// Lithic, Highnote, Unit, plus a MockIssuingProvider for tests and demo
// orgs that can run end-to-end without real card rails.

export type IssuerProvider =
  | "stripe_issuing"
  | "marqeta"
  | "lithic"
  | "highnote"
  | "unit"
  | "mock";

export type CardNetwork = "visa" | "mastercard";
export type CardType = "virtual" | "physical";
export type CardStatus = "requested" | "active" | "paused" | "canceled" | "expired";

export interface SpendingControls {
  currency: "USD" | "CAD" | "EUR";
  per_tx_cap_cents?: number;
  daily_cap_cents?: number;
  weekly_cap_cents?: number;
  monthly_cap_cents?: number;
  allowed_mcc?: string[];      // empty/undefined = all
  blocked_mcc?: string[];
  allowed_merchants?: string[];
  blocked_merchants?: string[];
  allowed_countries?: string[];
}

export interface IssuerCardholder {
  id: string;                  // provider id (e.g. ic_cardholder_xxx)
  name: string;
  email?: string;
  type: "individual" | "company";
  status: "active" | "inactive" | "blocked";
}

export interface IssuerCard {
  id: string;                  // provider id (e.g. ic_xxx)
  cardholder_id: string;
  network: CardNetwork;
  card_type: CardType;
  currency: SpendingControls["currency"];
  status: CardStatus;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  spending_controls: SpendingControls;
  created_at: string;
}

export interface IssuerAuthorization {
  id: string;                  // provider auth id
  card_id: string;
  amount_cents: number;
  currency: string;
  merchant_name?: string;
  merchant_category?: string;  // MCC
  merchant_country?: string;
  merchant_network_id?: string;
  /** Provider-ready: call approve() / decline() on this object. */
  reply: AuthorizationReply;
  occurred_at: string;
}

export interface AuthorizationReply {
  approve(opts?: { metadata?: Record<string, string> }): Promise<void>;
  decline(opts: { reason: string; metadata?: Record<string, string> }): Promise<void>;
  /** For Stripe: put the auth in 'pending' until an async approval resolves. */
  defer(opts: { request_id: string; metadata?: Record<string, string> }): Promise<void>;
}

export interface IssuerWebhookVerified {
  provider: IssuerProvider;
  event_type: string;          // e.g. 'issuing_authorization.request'
  payload: Record<string, unknown>;
  signature_valid: boolean;
}
