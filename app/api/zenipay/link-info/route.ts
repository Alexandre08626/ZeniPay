export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pgrest } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ merchant_id: null });

  try {
    const rows = await pgrest(
      `zenipay_pay_links?id=eq.${encodeURIComponent(id)}&select=merchant_id,amount,currency,description,status&limit=1`,
    ) as Array<{ merchant_id: string | null; amount?: number | string; currency?: string; description?: string; status?: string }>;
    const row = rows[0];
    if (!row) return NextResponse.json({ merchant_id: null });
    return NextResponse.json({
      merchant_id: row.merchant_id || null,
      amount: row.amount != null ? Number(row.amount) : null,
      currency: row.currency || null,
      description: row.description || null,
      status: row.status || null,
    });
  } catch {
    return NextResponse.json({ merchant_id: null });
  }
}
