export const dynamic = "force-dynamic";

// Disabled 2026-09-27 (security audit): unauthenticated Unit card issuing.
// Previous implementation: git show 3c73dd6:app/api/unit/cards/create/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
