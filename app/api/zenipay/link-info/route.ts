export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pgrest } from "../../../../modules/zenipay/services/supabase";

interface MerchantBrandRow {
  id: string;
  name?: string | null;
  website?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

type LinkRow = { merchant_id: string | null; amount?: number | string; currency?: string; description?: string; status?: string };

async function tryFetchLink(id: string, table: string): Promise<LinkRow[]> {
  try {
    return await pgrest(
      `${table}?id=eq.${encodeURIComponent(id)}&select=merchant_id,amount,currency,description,status&limit=1`,
    ) as LinkRow[];
  } catch {
    return []; // table may not exist — fall through
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ merchant_id: null });

  try {
    // Try zenipay_pay_links first (payment links), then fall back to
    // zenipay_invoices (billed invoices). Both use the same ID format.

    let rows = await tryFetchLink(id, "zenipay_pay_links");
    let row = rows[0];

    if (!row) {
      rows = await tryFetchLink(id, "zenipay_invoices");
      row = rows[0];
    }

    if (!row) return NextResponse.json({ merchant_id: null });

    // Pull merchant branding so the pay page can render the merchant's
    // identity (name, business type, website, logo) instead of a generic
    // ZeniPay header. Failure here should not break the link load — fall
    // back to the bare link info so the customer can still pay.
    let merchant: {
      id: string;
      name: string;
      type: string | null;
      website: string | null;
      logoUrl: string | null;
    } | null = null;

    if (row.merchant_id) {
      try {
        const mrows = await pgrest(
          `zenipay_merchants?id=eq.${encodeURIComponent(row.merchant_id)}&select=id,name,website,config&limit=1`,
        ) as MerchantBrandRow[];
        const m = mrows[0] as (MerchantBrandRow & { id: string }) | undefined;
        if (m) {
          const cfg = m.config || {};
          const name = String(m.name || cfg.businessName || "Merchant").trim();
          const settingsBiz = cfg.settings_business || {};
          const branding = cfg.branding || cfg.brand || {};
          // Optional logo locations we already see in the wild — no
          // upload UI exists yet, but if a merchant ever stuffs a URL
          // into one of these we'll surface it.
          const logoUrl =
            (typeof branding.logoUrl === "string" && branding.logoUrl) ||
            (typeof branding.logo === "string" && branding.logo) ||
            (typeof cfg.logoUrl === "string" && cfg.logoUrl) ||
            (typeof cfg.logo === "string" && cfg.logo) ||
            (typeof settingsBiz.logoUrl === "string" && settingsBiz.logoUrl) ||
            (typeof settingsBiz.logo === "string" && settingsBiz.logo) ||
            null;
          merchant = {
            id: m.id,
            name,
            type: cfg.businessType || null,
            website: m.website || cfg.website || null,
            logoUrl,
          };
        }
      } catch {
        // ignore — return link without merchant block
      }
    }

    return NextResponse.json({
      merchant_id: row.merchant_id || null,
      amount: row.amount != null ? Number(row.amount) : null,
      currency: row.currency || null,
      description: row.description || null,
      status: row.status || null,
      merchant,
    });
  } catch {
    return NextResponse.json({ merchant_id: null });
  }
}
