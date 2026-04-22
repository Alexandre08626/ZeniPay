// /pay/[merchant_slug] — public closed-loop checkout page.
//
// Renders a minimal Stripe-style payment form. The merchant info
// (name, fee, allowed currencies) is fetched server-side via a small
// fetch against the public zenicards.merchants row (service-role read
// through a Supabase anon-or-service-role call). If the merchant is
// unknown or inactive, we show a clean "merchant not available" card
// rather than a raw 404.

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PayClient from "./PayClient";

export const dynamic = "force-dynamic";

interface MerchantRow {
  id: string;
  name: string;
  slug: string;
  merchant_category: string | null;
  fee_flat_micro: string;
  fee_bps: number;
  allowed_currencies: string[];
  active: boolean;
}

async function getMerchant(slug: string): Promise<MerchantRow | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // zenicards schema isn't PostgREST-exposed — route through the
  // public.zcards_get_merchants SECURITY DEFINER wrapper and filter
  // by slug client-side. Merchant count is <50 in realistic scenarios.
  const { data } = await supabase.rpc("zcards_get_merchants");
  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    zenicore_payout_account_id: string;
    fee_flat_micro: string | number;
    fee_bps: number;
    active: boolean;
    merchant_category: string | null;
    allowed_currencies: string[];
    created_at: string;
  }>;
  const hit = rows.find((r) => r.slug === slug);
  if (!hit) return null;
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    merchant_category: hit.merchant_category,
    fee_flat_micro: String(hit.fee_flat_micro),
    fee_bps: hit.fee_bps,
    allowed_currencies: hit.allowed_currencies.map((c) => c.trim()),
    active: hit.active,
  };
}

export default async function PayPage({ params }: { params: Promise<{ merchant_slug: string }> | { merchant_slug: string } }) {
  const { merchant_slug } = await Promise.resolve(params);
  const merchant = await getMerchant(merchant_slug);
  if (!merchant || !merchant.active) return notFound();
  return <PayClient merchant={{
    name: merchant.name,
    slug: merchant.slug,
    allowed_currencies: merchant.allowed_currencies,
    fee_bps: merchant.fee_bps,
    merchant_category: merchant.merchant_category,
  }} />;
}
