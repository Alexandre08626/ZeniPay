export const dynamic = "force-dynamic";

// Disabled 2026-09-27 (security audit): given only an email, it created a
// confirmed Supabase user and set a merchant session cookie for whichever
// merchant owns that email — full account takeover, admin included. The
// Agents product is retired (Orvel replaces it).
// Previous implementation: git show 3c73dd6:app/api/v1/agents/organizations/route.ts

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
