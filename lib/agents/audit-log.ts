// Append-only audit log. The underlying table has a trigger that blocks
// UPDATE/DELETE/TRUNCATE for every role including service_role, so the
// only operation exposed here is insert.
//
// This function swallows errors and logs them to stderr — an audit-log
// failure must never block the primary operation (e.g. a payment).

import { getAgentsDb } from "./supabase-client";
import type { ActorType } from "./types";

export interface LogEventInput {
  organizationId: string;
  actorType: ActorType;
  actorId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const db = getAgentsDb();
    const { error } = await db.from("agent_audit_log").insert({
      organization_id: input.organizationId,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      event_type: input.eventType,
      payload: input.payload ?? {},
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[agents/audit-log] insert failed", { event: input.eventType, error: error.message });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[agents/audit-log] threw", err);
  }
}
