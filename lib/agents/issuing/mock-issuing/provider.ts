// In-memory MockIssuingProvider. Lets the full dashboard + policy engine +
// audit log work end-to-end without real card rails. This is the default
// for new orgs until the CFO connects a real issuer (Stripe Issuing in PR 2).

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

const cardholders = new Map<string, IssuerCardholder>();
const cards = new Map<string, IssuerCard>();

function nowIso(): string { return new Date().toISOString(); }
function rand(n = 16): string { return Math.random().toString(36).slice(2, 2 + n); }

class NoopReply implements AuthorizationReply {
  async approve(): Promise<void> { /* noop */ }
  async decline(): Promise<void> { /* noop */ }
  async defer(): Promise<void> { /* noop */ }
}

export const mockIssuingProvider: IIssuerProvider = {
  name: "mock",

  async createCardholder(input: CreateCardholderInput): Promise<IssuerCardholder> {
    const id = `ic_ch_${rand(12)}`;
    const row: IssuerCardholder = {
      id, name: input.name, email: input.email, type: input.type, status: "active",
    };
    cardholders.set(id, row);
    return row;
  },

  async createCard(input: CreateCardInput): Promise<IssuerCard> {
    const id = `ic_${rand(14)}`;
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    const now = new Date();
    const exp = new Date(now.getFullYear() + 3, now.getMonth());
    const row: IssuerCard = {
      id,
      cardholder_id: input.cardholder_id,
      network: "visa",
      card_type: input.card_type,
      currency: input.currency,
      status: "active",
      last4,
      expiry_month: exp.getMonth() + 1,
      expiry_year: exp.getFullYear(),
      spending_controls: input.spending_controls,
      created_at: nowIso(),
    };
    cards.set(id, row);
    return row;
  },

  async updateCardControls(cardId: string, controls: SpendingControls): Promise<IssuerCard> {
    const row = cards.get(cardId);
    if (!row) throw new Error(`mock: card ${cardId} not found`);
    row.spending_controls = controls;
    cards.set(cardId, row);
    return row;
  },
  async pauseCard(cardId: string): Promise<IssuerCard>  { return setStatus(cardId, "paused"); },
  async resumeCard(cardId: string): Promise<IssuerCard> { return setStatus(cardId, "active"); },
  async cancelCard(cardId: string): Promise<IssuerCard> { return setStatus(cardId, "canceled"); },

  async getCard(cardId: string): Promise<IssuerCard> {
    const row = cards.get(cardId);
    if (!row) throw new Error(`mock: card ${cardId} not found`);
    return row;
  },
  async listCards(cardholderId?: string): Promise<IssuerCard[]> {
    const all = Array.from(cards.values());
    return cardholderId ? all.filter((c) => c.cardholder_id === cardholderId) : all;
  },

  verifyWebhook(rawBody: string): IssuerWebhookVerified {
    // Mock: we accept any body, parse JSON, mark signature_valid true.
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { payload = {}; }
    return {
      provider: "mock",
      event_type: String(payload.type ?? "issuing_authorization.request"),
      payload,
      signature_valid: true,
    };
  },

  async handleAuthorizationWebhook(verified: IssuerWebhookVerified): Promise<IssuerAuthorization | null> {
    if (verified.event_type !== "issuing_authorization.request") return null;
    const data = (verified.payload.data as Record<string, unknown>) ?? {};
    return {
      id: String(data.id ?? `iauth_${rand(14)}`),
      card_id: String(data.card_id ?? ""),
      amount_cents: Number(data.amount_cents ?? 0),
      currency: String(data.currency ?? "USD"),
      merchant_name: data.merchant_name as string | undefined,
      merchant_category: data.merchant_category as string | undefined,
      merchant_country: data.merchant_country as string | undefined,
      merchant_network_id: data.merchant_network_id as string | undefined,
      reply: new NoopReply(),
      occurred_at: nowIso(),
    };
  },
};

function setStatus(cardId: string, status: IssuerCard["status"]): IssuerCard {
  const row = cards.get(cardId);
  if (!row) throw new Error(`mock: card ${cardId} not found`);
  row.status = status;
  cards.set(cardId, row);
  return row;
}

/** Test helper — reset in-memory state between test runs. */
export function __resetMockIssuing(): void {
  cardholders.clear();
  cards.clear();
}
