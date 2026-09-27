export const dynamic = "force-dynamic";

// GET /api/orvel/health — public, used by the Orvel monitoring robot.
// Says whether Orvel is reachable with this deployment's key. Never returns the key or the URL.

import { NextResponse } from "next/server";
import { orvelConfig } from "@/lib/orvel/agent";

export async function GET() {
  const cfg = orvelConfig();
  const hasKey = Boolean(cfg.key);
  const t0 = Date.now();
  let orvel: "ok" | "refused" | "offline" = "offline";
  try {
    const res = await fetch(`${cfg.url}/models`, {
      headers: hasKey ? { Authorization: `Bearer ${cfg.key}` } : {},
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    orvel = res.ok ? "ok" : res.status === 401 || res.status === 403 ? "refused" : "offline";
  } catch { /* offline */ }
  const ok = hasKey && orvel === "ok";
  return NextResponse.json({ ok, hasKey, orvel, ms: Date.now() - t0 }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
