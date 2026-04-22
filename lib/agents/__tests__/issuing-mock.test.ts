import { beforeEach, describe, it, expect } from "vitest";
import { mockIssuingProvider, __resetMockIssuing } from "../issuing/mock-issuing/provider";

beforeEach(() => { __resetMockIssuing(); });

describe("MockIssuingProvider", () => {
  it("round-trips cardholder + card creation", async () => {
    const ch = await mockIssuingProvider.createCardholder({
      name: "Checkout Agent", type: "company",
    });
    expect(ch.id).toMatch(/^ic_ch_/);
    const card = await mockIssuingProvider.createCard({
      cardholder_id: ch.id, card_type: "virtual", currency: "USD",
      spending_controls: { currency: "USD", per_tx_cap_cents: 5000 },
    });
    expect(card.id).toMatch(/^ic_/);
    expect(card.status).toBe("active");
    expect(card.spending_controls.per_tx_cap_cents).toBe(5000);
    expect(card.last4).toMatch(/^\d{4}$/);
  });

  it("status transitions pause → resume → cancel", async () => {
    const ch = await mockIssuingProvider.createCardholder({ name: "X", type: "individual" });
    const card = await mockIssuingProvider.createCard({
      cardholder_id: ch.id, card_type: "virtual", currency: "USD",
      spending_controls: { currency: "USD" },
    });
    expect((await mockIssuingProvider.pauseCard(card.id)).status).toBe("paused");
    expect((await mockIssuingProvider.resumeCard(card.id)).status).toBe("active");
    expect((await mockIssuingProvider.cancelCard(card.id)).status).toBe("canceled");
  });

  it("updateCardControls replaces controls", async () => {
    const ch = await mockIssuingProvider.createCardholder({ name: "X", type: "individual" });
    const card = await mockIssuingProvider.createCard({
      cardholder_id: ch.id, card_type: "virtual", currency: "USD",
      spending_controls: { currency: "USD", per_tx_cap_cents: 100 },
    });
    const next = await mockIssuingProvider.updateCardControls(card.id, {
      currency: "USD", per_tx_cap_cents: 999, allowed_merchants: ["openai.com"],
    });
    expect(next.spending_controls.per_tx_cap_cents).toBe(999);
    expect(next.spending_controls.allowed_merchants).toEqual(["openai.com"]);
  });

  it("verifyWebhook parses json and accepts any body (mock)", () => {
    const v = mockIssuingProvider.verifyWebhook(JSON.stringify({ type: "issuing_authorization.request", data: { id: "iauth_x" } }), {});
    expect(v.provider).toBe("mock");
    expect(v.event_type).toBe("issuing_authorization.request");
    expect(v.signature_valid).toBe(true);
  });

  it("handleAuthorizationWebhook yields an IssuerAuthorization with reply hooks", async () => {
    const v = mockIssuingProvider.verifyWebhook(JSON.stringify({
      type: "issuing_authorization.request",
      data: { id: "iauth_1", card_id: "ic_x", amount_cents: 1234, currency: "USD", merchant_name: "Twilio" },
    }), {});
    const auth = await mockIssuingProvider.handleAuthorizationWebhook(v);
    expect(auth).not.toBeNull();
    expect(auth!.amount_cents).toBe(1234);
    expect(auth!.merchant_name).toBe("Twilio");
    // Reply hooks don't throw in mock.
    await auth!.reply.approve();
    await auth!.reply.decline({ reason: "test" });
    await auth!.reply.defer({ request_id: "apr_x" });
  });
});
