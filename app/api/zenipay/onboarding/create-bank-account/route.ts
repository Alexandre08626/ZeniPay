export const dynamic = "force-dynamic";

// Disabled 2026-09-27 (security audit): unauthenticated; could attach a bank account to any Finix identity.
// Previous implementation: git show 3c73dd6:app/api/zenipay/onboarding/create-bank-account/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
