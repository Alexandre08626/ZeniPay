// StripeIssuingProvider — real IIssuerProvider impl backed by stripe.issuing.*.
//
// Gated behind STRIPE_ISSUING_SECRET_KEY. If the env var is missing or the
// API key is invalid, the registry falls back to MockIssuingProvider so the
// UI keeps working in preview / demo orgs without Issuing approval.

import Stripe from "stripe";
import type {
  AuthorizationReply,
  IssuerAuthorization,
  IssuerCard,
  IssuerCardholder,
  IssuerWebhookVerified,
  SpendingControls,
} from "../types";
import type {
  CreateCardInput,
  CreateCardholderInput,
  IIssuerProvider,
} from "../issuer-interface";
import { mergeBlockedMcc } from "../mcc";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_ISSUING_SECRET_KEY;
  if (!key) throw new Error("STRIPE_ISSUING_SECRET_KEY not configured");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _stripe = new Stripe(key, { apiVersion: "2024-06-20" as any });
  return _stripe;
}

export function stripeIssuingAvailable(): boolean {
  return !!process.env.STRIPE_ISSUING_SECRET_KEY;
}

function toIssuerCardholder(ch: Stripe.Issuing.Cardholder): IssuerCardholder {
  return {
    id: ch.id,
    name: ch.name,
    email: ch.email ?? undefined,
    type: ch.type === "company" ? "company" : "individual",
    status: ch.status === "active" ? "active" : ch.status === "inactive" ? "inactive" : "blocked",
  };
}

function toIssuerCard(card: Stripe.Issuing.Card): IssuerCard {
  const sc: SpendingControls = {
    currency: (card.currency.toUpperCase() as SpendingControls["currency"]),
    per_tx_cap_cents:    extractCap(card.spending_controls?.spending_limits, "per_authorization"),
    daily_cap_cents:     extractCap(card.spending_controls?.spending_limits, "daily"),
    weekly_cap_cents:    extractCap(card.spending_controls?.spending_limits, "weekly"),
    monthly_cap_cents:   extractCap(card.spending_controls?.spending_limits, "monthly"),
    allowed_mcc:         card.spending_controls?.allowed_categories ?? undefined,
    blocked_mcc:         card.spending_controls?.blocked_categories ?? undefined,
    allowed_countries:   card.spending_controls?.allowed_merchant_countries ?? undefined,
  };
  return {
    id: card.id,
    cardholder_id: typeof card.cardholder === "string" ? card.cardholder : card.cardholder.id,
    network: "visa",                                      // Stripe Issuing is Visa-only today
    card_type: card.type === "physical" ? "physical" : "virtual",
    currency: sc.currency,
    status: mapStripeStatus(card.status),
    last4: card.last4,
    expiry_month: card.exp_month,
    expiry_year: card.exp_year,
    spending_controls: sc,
    created_at: new Date(card.created * 1000).toISOString(),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StripeLimitInterval = any;

function mapStripeStatus(s: string): IssuerCard["status"] {
  switch (s) {
    case "active":   return "active";
    case "inactive": return "paused";
    case "canceled": return "canceled";
    default:         return "active";
  }
}
function extractCap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  limits: Array<{ amount: number; interval: string }> | null | undefined,
  interval: string,
): number | undefined {
  if (!limits) return undefined;
  const m = limits.find((l) => l.interval === interval);
  return m ? m.amount : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function controlsToStripe(sc: SpendingControls): any {
  const limits: Array<{ amount: number; interval: StripeLimitInterval }> = [];
  const push = (interval: StripeLimitInterval, cents?: number) => {
    if (cents != null && cents > 0) limits.push({ amount: cents, interval });
  };
  push("per_authorization", sc.per_tx_cap_cents);
  push("daily",             sc.daily_cap_cents);
  push("weekly",            sc.weekly_cap_cents);
  push("monthly",           sc.monthly_cap_cents);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  if (limits.length > 0) out.spending_limits = limits;
  if (sc.allowed_mcc?.length) out.allowed_categories = sc.allowed_mcc;
  const blocked = mergeBlockedMcc(sc.blocked_mcc);
  if (blocked.length)          out.blocked_categories = blocked;
  if (sc.allowed_countries?.length) out.allowed_merchant_countries = sc.allowed_countries;
  return out;
}

class StripeAuthorizationReply implements AuthorizationReply {
  constructor(private authId: string) {}
  async approve(opts?: { metadata?: Record<string, string> }): Promise<void> {
    await getStripe().issuing.authorizations.approve(this.authId, opts?.metadata ? { metadata: opts.metadata } : {});
  }
  async decline(opts: { reason: string; metadata?: Record<string, string> }): Promise<void> {
    await getStripe().issuing.authorizations.decline(this.authId, {
      metadata: { decline_reason: opts.reason, ...opts.metadata },
    });
  }
  async defer(): Promise<void> {
    // Stripe Issuing has no explicit "defer" — we return the webhook with
    // `approved: false` but keep an approval_request row. When the human
    // approves, we call stripe.issuing.authorizations.approve in a follow-up
    // request. For the hot-path webhook response, "defer" == decline-for-now.
    await getStripe().issuing.authorizations.decline(this.authId, {
      metadata: { decline_reason: "pending_human_approval" },
    });
  }
}

export const stripeIssuingProvider: IIssuerProvider = {
  name: "stripe_issuing",

  async createCardholder(input: CreateCardholderInput): Promise<IssuerCardholder> {
    const defaultBilling = {
      address: { line1: "1 Main St", city: "Montréal", state: "QC", postal_code: "H2X2V7", country: "CA" },
    };
    const ch = await getStripe().issuing.cardholders.create({
      name: input.name,
      email: input.email,
      type: input.type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      billing: (input.billing ?? defaultBilling) as any,
      status: "active",
    });
    return toIssuerCardholder(ch);
  },

  async createCard(input: CreateCardInput): Promise<IssuerCard> {
    const card = await getStripe().issuing.cards.create({
      cardholder: input.cardholder_id,
      type: input.card_type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currency: input.currency.toLowerCase() as any,
      spending_controls: controlsToStripe(input.spending_controls),
      status: "active",
      metadata: input.metadata,
    });
    return toIssuerCard(card);
  },

  async updateCardControls(cardId: string, controls: SpendingControls): Promise<IssuerCard> {
    const card = await getStripe().issuing.cards.update(cardId, {
      spending_controls: controlsToStripe(controls),
    });
    return toIssuerCard(card);
  },
  async pauseCard(cardId: string): Promise<IssuerCard> {
    const c = await getStripe().issuing.cards.update(cardId, { status: "inactive" });
    return toIssuerCard(c);
  },
  async resumeCard(cardId: string): Promise<IssuerCard> {
    const c = await getStripe().issuing.cards.update(cardId, { status: "active" });
    return toIssuerCard(c);
  },
  async cancelCard(cardId: string): Promise<IssuerCard> {
    const c = await getStripe().issuing.cards.update(cardId, { status: "canceled" });
    return toIssuerCard(c);
  },
  async getCard(cardId: string): Promise<IssuerCard> {
    return toIssuerCard(await getStripe().issuing.cards.retrieve(cardId));
  },
  async listCards(cardholderId?: string): Promise<IssuerCard[]> {
    const list = await getStripe().issuing.cards.list(
      cardholderId ? { cardholder: cardholderId, limit: 100 } : { limit: 100 },
    );
    return list.data.map(toIssuerCard);
  },

  verifyWebhook(rawBody: string, headers: Record<string, string>): IssuerWebhookVerified {
    const sig = headers["stripe-signature"] ?? headers["Stripe-Signature"];
    const secret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET;
    if (!sig || !secret) return { provider: "stripe_issuing", event_type: "", payload: {}, signature_valid: false };
    try {
      const event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
      return {
        provider: "stripe_issuing",
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
        signature_valid: true,
      };
    } catch {
      return { provider: "stripe_issuing", event_type: "", payload: {}, signature_valid: false };
    }
  },

  async handleAuthorizationWebhook(verified: IssuerWebhookVerified): Promise<IssuerAuthorization | null> {
    if (verified.event_type !== "issuing_authorization.request") return null;
    const event = verified.payload as unknown as Stripe.Event;
    const auth = event.data.object as Stripe.Issuing.Authorization;
    return {
      id: auth.id,
      card_id: typeof auth.card === "string" ? auth.card : auth.card.id,
      amount_cents: auth.pending_request?.amount ?? auth.amount,
      currency: (auth.pending_request?.currency ?? auth.currency).toUpperCase(),
      merchant_name: auth.merchant_data?.name ?? undefined,
      merchant_category: auth.merchant_data?.category ?? undefined,
      merchant_network_id: auth.merchant_data?.network_id ?? undefined,
      merchant_country: auth.merchant_data?.country ?? undefined,
      reply: new StripeAuthorizationReply(auth.id),
      occurred_at: new Date(auth.created * 1000).toISOString(),
    };
  },
};
