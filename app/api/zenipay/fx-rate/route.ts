export const dynamic = "force-dynamic";

/**
 * Public FX rate endpoint for the customer-facing pay page.
 * Returns the active rate from agents.fx_rates (refreshed daily).
 *
 * GET /api/zenipay/fx-rate?from=USD&to=CAD → { rate, from, to, fetchedAt }
 *
 * No auth — the rate is the same for everyone and the customer needs
 * to see the CAD equivalent before paying.
 */
import { NextRequest, NextResponse } from "next/server";
import { getActiveRate, type Currency } from "@/modules/zenipay/services/fx";

const ALLOWED: Currency[] = ["CAD", "USD", "EUR", "USDC"];

function isCurrency(v: string | null): v is Currency {
  return !!v && (ALLOWED as string[]).includes(v.toUpperCase());
}

export async function GET(req: NextRequest) {
  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  if (!isCurrency(fromRaw) || !isCurrency(toRaw)) {
    return NextResponse.json(
      { error: "from/to must be one of CAD,USD,EUR,USDC" },
      { status: 400 },
    );
  }
  const from = fromRaw.toUpperCase() as Currency;
  const to = toRaw.toUpperCase() as Currency;
  try {
    const rate = await getActiveRate(from, to);
    return NextResponse.json({ rate, from, to, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
