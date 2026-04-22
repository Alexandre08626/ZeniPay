// Funding-source abstraction. Every concrete source answers the same
// lifecycle: advertise what it needs at registration, handle "fund me"
// requests, and (for async rails) settle via webhook.
//
// Phase 2 Part 1 implements two real sources (Finix card, ZeniPay merchant
// wallet) synchronously. USDC + wire stubs return 501 for Phase 3.

import type { Currency, FundingSource } from "../types";

export interface InitiateFundingParams {
  source: FundingSource;
  organizationId: string;
  amountCents: number;
  currency: Currency;
  idempotencyKey?: string;
  actor?: string | null;
}

export type InitiateFundingResult =
  /** The funds landed synchronously; book_transfer has already run. */
  | { settled: true; transfer_id: string; org_balance_cents: number }
  /** Async source — a topup_intents row was created; webhook will settle. */
  | {
      settled: false;
      intent_id: string;
      provider: string;
      /** Info to show the user: USDC deposit address, wire reference, etc. */
      instructions?: Record<string, unknown>;
    };

export interface FundingSourceProvider {
  type: FundingSource["type"];
  /** Return `false` to disable the source provider at runtime (e.g. stubs). */
  readonly enabled: boolean;
  initiate(params: InitiateFundingParams): Promise<InitiateFundingResult>;
}

export class FundingSourceNotImplemented extends Error {
  constructor(type: string) {
    super(`funding source '${type}' not implemented in Phase 2 Part 1 — Phase 3 ships it`);
    this.name = "FundingSourceNotImplemented";
  }
}
