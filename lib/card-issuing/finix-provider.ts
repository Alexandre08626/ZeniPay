// Finix Card Issuing backed provider — gated on FINIX_CARD_ISSUING_ENABLED.
//
// At the time of writing, Card Issuing is still being enabled on the Finix
// side by Riaz. This file implements the interface with best-effort
// endpoints so the moment the flag flips, merchants can start issuing.
// If Finix's final schema differs, this is the single file to reconcile.

import { finixRequest } from "@/lib/finix/client";
import type {
  ICardIssuingProvider,
  IssueCardParams,
  IssuedCardResult,
  CardDetailsResult,
  UpdateLimitParams,
} from "./provider-interface";

export class FinixCardProvider implements ICardIssuingProvider {
  readonly name = "finix" as const;

  async issueVirtualCard(params: IssueCardParams): Promise<IssuedCardResult> {
    const res = await finixRequest<{
      id: string;
      last_four: string;
      expiration_month: number;
      expiration_year: number;
      state: string;
    }>({
      method: "POST",
      path: "/issuing/cards",
      body: {
        merchant_id: params.merchant_id,
        type: "VIRTUAL",
        usage: "ONLINE",
        currency: params.currency,
        cardholder_name: params.cardholder_name,
        spending_limits: buildLimits(params.spending_limit_daily, params.spending_limit_monthly),
        tags: { source: "zenipay", merchant_id: params.merchant_id },
      },
    });
    if (res.status >= 400) throw new Error(`finix_issue_failed ${res.status}`);
    return {
      provider_card_id: res.data.id,
      last4: res.data.last_four ?? "",
      exp_month: Number(res.data.expiration_month ?? 0),
      exp_year: Number(res.data.expiration_year ?? 0),
      status: normalizeState(res.data.state),
    };
  }

  async getCardDetails(provider_card_id: string): Promise<CardDetailsResult> {
    const res = await finixRequest<{
      pan: string;
      cvv: string;
      expiration_month: number;
      expiration_year: number;
    }>({
      method: "POST",
      path: `/issuing/cards/${provider_card_id}/reveal`,
    });
    if (res.status >= 400) throw new Error(`finix_reveal_failed ${res.status}`);
    const mm = String(res.data.expiration_month).padStart(2, "0");
    const yy = String(res.data.expiration_year).slice(-2);
    return { pan: res.data.pan, cvv: res.data.cvv, exp: `${mm}/${yy}` };
  }

  async freezeCard(provider_card_id: string): Promise<void> {
    const res = await finixRequest({
      method: "PUT",
      path: `/issuing/cards/${provider_card_id}`,
      body: { state: "INACTIVE" },
    });
    if (res.status >= 400) throw new Error(`finix_freeze_failed ${res.status}`);
  }

  async unfreezeCard(provider_card_id: string): Promise<void> {
    const res = await finixRequest({
      method: "PUT",
      path: `/issuing/cards/${provider_card_id}`,
      body: { state: "ACTIVE" },
    });
    if (res.status >= 400) throw new Error(`finix_unfreeze_failed ${res.status}`);
  }

  async cancelCard(provider_card_id: string): Promise<void> {
    const res = await finixRequest({
      method: "PUT",
      path: `/issuing/cards/${provider_card_id}`,
      body: { state: "CANCELED" },
    });
    if (res.status >= 400) throw new Error(`finix_cancel_failed ${res.status}`);
  }

  async updateSpendingLimit(params: UpdateLimitParams): Promise<void> {
    const res = await finixRequest({
      method: "PUT",
      path: `/issuing/cards/${params.provider_card_id}`,
      body: { spending_limits: buildLimits(params.daily, params.monthly) },
    });
    if (res.status >= 400) throw new Error(`finix_update_limit_failed ${res.status}`);
  }
}

interface LimitDef { amount: number; interval: "DAILY" | "MONTHLY" }
function buildLimits(daily?: number | null, monthly?: number | null): LimitDef[] {
  const out: LimitDef[] = [];
  if (daily && daily > 0) out.push({ amount: Math.round(daily * 100), interval: "DAILY" });
  if (monthly && monthly > 0) out.push({ amount: Math.round(monthly * 100), interval: "MONTHLY" });
  return out;
}

function normalizeState(s?: string): string {
  const v = (s ?? "").toLowerCase();
  if (v === "inactive") return "frozen";
  if (v === "canceled" || v === "cancelled") return "cancelled";
  return "active";
}

export function finixIssuingEnabled(): boolean {
  return process.env.FINIX_CARD_ISSUING_ENABLED === "true";
}
