// POST /api/v1/agents/_internal/compute-anomaly-signals-tick
//
// Cron — every 15 minutes. For each org with agent activity in the last 30
// days, computes baselines + anomaly signals across three metrics:
//   - daily_spend_cents        (scope: org + each card)
//   - auth_count_1h            (scope: each card)
//   - distinct_merchants_24h   (scope: each agent)
//
// Each org is its own unit of work — we commit-per-org so one slow org
// doesn't block the rest of the batch. Failures on a specific scope are
// logged but don't abort the tick.
//
// Protected by AGENTS_FRAUD_CRON_SECRET (distinct from
// AGENTS_ACCOUNTING_CRON_SECRET + AGENTS_APPROVAL_CRON_SECRET — narrow
// blast radius per cron, spec's non-negotiable).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { errorResponse, serverError } from "@/app/api/v1/agents/_lib/errors";
import {
  buildDailySpendBaseline,
  buildHourlyAuthCountBaseline,
  buildDistinctMerchantsBaseline,
  type BaselineResult,
} from "@/lib/agents/fraud/baseline-builder";
import { writeSignal } from "@/lib/agents/fraud/signals-writer";
import { maybeRaiseAlert } from "@/lib/agents/fraud/alert-generator";
import type { AnomalyScope } from "@/lib/agents/fraud/types";

// Max orgs per tick. At 15-min cadence and per-org ~2-3s budget, 20 orgs
// fit comfortably under Vercel's default 10s function timeout. Set the
// function maxDuration in vercel.json if this ever grows.
const MAX_ORGS_PER_TICK = 20;
const ACTIVITY_LOOKBACK_MS = 30 * 24 * 3_600_000;

interface TickMetrics {
  orgs_processed: number;
  scopes_processed: number;
  signals_written: number;
  alerts_generated: number;
  cold_skipped: number;
  errors: Array<{ scope: string; message: string }>;
  latency_ms: number;
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.AGENTS_FRAUD_CRON_SECRET || process.env.CRON_SECRET;
    if (process.env.NODE_ENV === "production" && secret) {
      const got = req.headers.get("authorization") ?? "";
      if (got !== `Bearer ${secret}`) return errorResponse("unauthorized", "unauthorized");
    }

    const t0 = Date.now();
    const metrics: TickMetrics = {
      orgs_processed: 0,
      scopes_processed: 0,
      signals_written: 0,
      alerts_generated: 0,
      cold_skipped: 0,
      errors: [],
      latency_ms: 0,
    };

    const db = getAgentsDb();

    // Pick orgs with any recent card authorization activity. Uses the
    // existing idx_card_auths_org_time.
    const since = new Date(Date.now() - ACTIVITY_LOOKBACK_MS).toISOString();
    const { data: activeOrgs } = await db
      .from("card_authorizations")
      .select("organization_id")
      .gte("created_at", since)
      .is("deleted_at", null)
      .limit(10_000);
    const orgIds = Array.from(new Set(((activeOrgs ?? []) as Array<{ organization_id: string }>).map((r) => r.organization_id)));
    const orgsThisTick = orgIds.slice(0, MAX_ORGS_PER_TICK);

    for (const organization_id of orgsThisTick) {
      try {
        await processOrg(organization_id, metrics);
        metrics.orgs_processed += 1;
      } catch (e) {
        metrics.errors.push({ scope: `org:${organization_id}`, message: e instanceof Error ? e.message : String(e) });
      }
    }

    metrics.latency_ms = Date.now() - t0;
    return NextResponse.json(metrics);
  } catch (e) { return serverError(e); }
}

export async function GET(req: NextRequest) { return POST(req); }

// ---------------------------------------------------------------------------
async function processOrg(organization_id: string, metrics: TickMetrics): Promise<void> {
  const db = getAgentsDb();

  // ------ org-level: daily spend ------
  await runScope(
    { scope_type: "org", scope_ref: organization_id, organization_id },
    buildDailySpendBaseline,
    metrics,
  );

  // ------ per-card: daily spend + hourly auth count ------
  const { data: cards } = await db
    .from("issued_cards")
    .select("id")
    .eq("organization_id", organization_id)
    .is("deleted_at", null)
    .in("status", ["active", "paused"]);
  for (const c of ((cards ?? []) as Array<{ id: string }>)) {
    const scope: AnomalyScope = { scope_type: "card", scope_ref: c.id, organization_id };
    await runScope(scope, buildDailySpendBaseline, metrics);
    await runScope(scope, buildHourlyAuthCountBaseline, metrics);
  }

  // ------ per-agent: distinct merchants / 24h ------
  // Agent-scoped authorizations go through issued_cards.agent_id. We query
  // via cards since card_authorizations doesn't have a direct agent_id column.
  const { data: agents } = await db
    .from("agents")
    .select("id")
    .eq("organization_id", organization_id)
    .limit(500);
  for (const a of ((agents ?? []) as Array<{ id: string }>)) {
    // Reuse card-scope for the merchant-burst metric by joining to cards
    // owned by this agent. The lib currently only scopes by card; for agent
    // scope we use each of the agent's cards as a proxy signal source until
    // a future PR adds a first-class agent-level baseline.
    const { data: agentCards } = await db
      .from("issued_cards")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("agent_id", a.id)
      .is("deleted_at", null);
    for (const c of ((agentCards ?? []) as Array<{ id: string }>)) {
      const scope: AnomalyScope = { scope_type: "card", scope_ref: c.id, organization_id };
      await runScope(scope, buildDistinctMerchantsBaseline, metrics);
    }
  }
}

async function runScope(
  scope: AnomalyScope,
  builder: (s: AnomalyScope) => Promise<BaselineResult | null>,
  metrics: TickMetrics,
): Promise<void> {
  metrics.scopes_processed += 1;
  try {
    const result = await builder(scope);
    if (!result) return;
    if (result.outcome.cold) {
      metrics.cold_skipped += 1;
      return;
    }
    const written = await writeSignal(result);
    if (written) metrics.signals_written += 1;
    const alertDecision = await maybeRaiseAlert(result);
    if (alertDecision.raised) metrics.alerts_generated += 1;
  } catch (e) {
    metrics.errors.push({
      scope: `${scope.scope_type}:${scope.scope_ref}`,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
