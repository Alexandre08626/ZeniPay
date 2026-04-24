// Stripe Issuing backed provider for merchant virtual cards.
//
// Activated via STRIPE_ISSUING_ENABLED="true" + STRIPE_ISSUING_API_KEY.
// We create one Cardholder per merchant on first issue (keyed by
// `metadata.merchant_id`) and then cards against that cardholder.
//
// getCardDetails returns nothing server-side — the reveal route returns
// a Stripe ephemeral key so the browser can render the secure iframe.
// That's the only way to comply with PCI without becoming a card-data
// processor ourselves.

import Stripe from "stripe";
import type {
  ICardIssuingProvider,
  IssueCardParams,
  IssuedCardResult,
  CardDetailsResult,
  UpdateLimitParams,
} from "./provider-interface";

function client(): Stripe {
  const key = process.env.STRIPE_ISSUING_API_KEY;
  if (!key) throw new Error("STRIPE_ISSUING_API_KEY not set");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export class StripeCardProvider implements ICardIssuingProvider {
  readonly name = "stripe" as const;

  async issueVirtualCard(params: IssueCardParams): Promise<IssuedCardResult> {
    const s = client();
    const cardholder = await this.ensureCardholder(s, params.merchant_id, params.cardholder_name);

    const spendingControls: Stripe.Issuing.CardCreateParams.SpendingControls = {};
    const intervals: Stripe.Issuing.CardCreateParams.SpendingControls.SpendingLimit[] = [];
    if (params.spending_limit_daily && params.spending_limit_daily > 0) {
      intervals.push({ amount: Math.round(params.spending_limit_daily * 100), interval: "daily" });
    }
    if (params.spending_limit_monthly && params.spending_limit_monthly > 0) {
      intervals.push({ amount: Math.round(params.spending_limit_monthly * 100), interval: "monthly" });
    }
    if (intervals.length) spendingControls.spending_limits = intervals;

    const card = await s.issuing.cards.create({
      cardholder: cardholder.id,
      currency: params.currency.toLowerCase(),
      type: "virtual",
      status: "active",
      spending_controls: Object.keys(spendingControls).length ? spendingControls : undefined,
      metadata: { merchant_id: params.merchant_id },
    });

    return {
      provider_card_id: card.id,
      last4: card.last4 ?? "",
      exp_month: card.exp_month ?? 0,
      exp_year: card.exp_year ?? 0,
      status: card.status ?? "active",
    };
  }

  async getCardDetails(_provider_card_id: string): Promise<CardDetailsResult> {
    // With Stripe, full PAN is never returned to the server.
    // The reveal route hands the client an ephemeral key + the card id
    // and Stripe Elements renders the PAN in an iframe the merchant
    // reads directly. This method exists to satisfy the interface and
    // callers must route Stripe reveals through the ephemeral key flow.
    throw new Error("stripe_reveal_requires_ephemeral_key");
  }

  async freezeCard(provider_card_id: string): Promise<void> {
    await client().issuing.cards.update(provider_card_id, { status: "inactive" });
  }

  async unfreezeCard(provider_card_id: string): Promise<void> {
    await client().issuing.cards.update(provider_card_id, { status: "active" });
  }

  async cancelCard(provider_card_id: string): Promise<void> {
    await client().issuing.cards.update(provider_card_id, { status: "canceled" });
  }

  async updateSpendingLimit(params: UpdateLimitParams): Promise<void> {
    const intervals: Stripe.Issuing.CardUpdateParams.SpendingControls.SpendingLimit[] = [];
    if (params.daily && params.daily > 0) {
      intervals.push({ amount: Math.round(params.daily * 100), interval: "daily" });
    }
    if (params.monthly && params.monthly > 0) {
      intervals.push({ amount: Math.round(params.monthly * 100), interval: "monthly" });
    }
    await client().issuing.cards.update(params.provider_card_id, {
      spending_controls: { spending_limits: intervals },
    });
  }

  // ------------- helpers ------------------------------------------

  private async ensureCardholder(
    s: Stripe,
    merchant_id: string,
    cardholder_name: string,
  ): Promise<Stripe.Issuing.Cardholder> {
    // Search by metadata.merchant_id so one Stripe cardholder maps to
    // exactly one ZeniPay merchant.
    const existing = await s.issuing.cardholders.list({ limit: 100 });
    const match = existing.data.find((c) => c.metadata?.merchant_id === merchant_id);
    if (match) return match;
    return s.issuing.cardholders.create({
      type: "individual",
      name: cardholder_name,
      billing: {
        address: {
          line1: "Address on file",
          city: "Montreal",
          state: "QC",
          postal_code: "H2X 1Y4",
          country: "CA",
        },
      },
      metadata: { merchant_id },
    });
  }
}

export function stripeIssuingEnabled(): boolean {
  return process.env.STRIPE_ISSUING_ENABLED === "true" && !!process.env.STRIPE_ISSUING_API_KEY;
}
