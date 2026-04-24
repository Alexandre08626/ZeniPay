// PR 16 — card issuing provider interface (merchant virtual cards).
//
// Separate from lib/agents/issuing/* — that one is for AI agents on
// the agents.* schema. This one is for humans on /app/*, backed by
// zenipay_merchant_cards + the merchant's ZeniPay wallet.
//
// Every implementation must:
//   - return PAN/CVV only from getCardDetails (never store it)
//   - be idempotent on status mutations (freeze/unfreeze/cancel)
//   - throw on network failure — callers surface 502.

export interface IssueCardParams {
  merchant_id: string;
  cardholder_name: string;
  currency: string;
  spending_limit_daily?: number | null;
  spending_limit_monthly?: number | null;
}

export interface IssuedCardResult {
  provider_card_id: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  status: string;
}

export interface CardDetailsResult {
  pan: string;
  cvv: string;
  exp: string; // MM/YY
}

export interface UpdateLimitParams {
  provider_card_id: string;
  daily?: number | null;
  monthly?: number | null;
}

export interface ICardIssuingProvider {
  readonly name: "stripe" | "finix";
  issueVirtualCard(params: IssueCardParams): Promise<IssuedCardResult>;
  getCardDetails(provider_card_id: string): Promise<CardDetailsResult>;
  freezeCard(provider_card_id: string): Promise<void>;
  unfreezeCard(provider_card_id: string): Promise<void>;
  cancelCard(provider_card_id: string): Promise<void>;
  updateSpendingLimit(params: UpdateLimitParams): Promise<void>;
}
