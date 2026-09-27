export const dynamic = "force-dynamic";

// Disabled 2026-09-27 (security audit): unauthenticated charge; amount/merchant from the request — use /api/zenipay/finix/process-payment.
// Previous implementation: git show 3c73dd6:app/api/zenipay/finix/charge/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
