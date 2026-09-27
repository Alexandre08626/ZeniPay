export const dynamic = "force-dynamic";

// Disabled 2026-09-27 (security audit): debug route: any merchant data by merchant_id.
// Previous implementation: git show 3c73dd6:app/api/zenipay/debug-stats/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const GET = gone;
