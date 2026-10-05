export const dynamic = "force-dynamic";

// Disabled 2026-10-05 (security audit): money-moving route of the retired
// Agents product (Orvel replaces it). No live page calls it — the
// /agents/* pages redirect to /app/orvel.
// Previous implementation: git show 324a2f3:app/api/v1/agents/org-wallet/topup/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
