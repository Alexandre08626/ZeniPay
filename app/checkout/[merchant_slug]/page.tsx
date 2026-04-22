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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).schema("zenicards").from("merchants")
    .select("id, name, slug, merchant_category, fee_flat_micro, fee_bps, allowed_currencies, active")
    .eq("slug", slug)
    .maybeSingle();
  return (data as MerchantRow | null) ?? null;
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
