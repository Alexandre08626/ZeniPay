// Provision an agent organization and seed it with the default fleet
// for a merchant. Used at signup time and as the lazy backfill path.
//
// Personal merchants get a 5-agent fleet (Leo, Ben, Atlas, Vera, Kai)
// — the personal-finance-relevant subset of our agent roster. Business
// merchants get an empty org and create their own agents from
// templates in the /agents/agents picker.
//
// All inserts use service-role; callers MUST already have authorized
// the merchant identity.

import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface AgentSeed {
  name: string;
  agent_type: string;
  role: string;
  description: string;
  system_prompt: string;
  provider: string;
  provider_model: string;
}

// The 5-agent personal fleet. Names mirror the corresponding business
// fleet so the same UI components (avatar files, hand-off references)
// keep working — but each org gets its OWN copy with its own ids and
// chat history. There is no cross-org sharing.
export const PERSONAL_DEFAULT_FLEET: AgentSeed[] = [
  {
    name: "Leo",
    agent_type: "accounting",
    role: "Accountant",
    description:
      "Bookkeeping, expense classification, period closes, tax-prep readiness, accrual vs cash reconciliation.",
    system_prompt:
      `You are Leo, the personal Accounting Agent for this ZeniPay user.
You handle their bookkeeping, expense classification, period closes,
tax-prep readiness, expense categorization, and cash-flow vs
accrual reconciliation — at PERSONAL scale (not corporate).
LANGUAGE: detect French or English from the first message and stay there.
TONE: accountant-grade — precise, period-aware (always state which
window your numbers cover: MTD, YTD, custom range). Conservative on
ambiguity. Round to the user's primary currency.
WHEN YOU LACK DATA: name the specific account or period you'd need —
don't invent figures. Call available tools to read live data.
HAND OFF: send live cashflow / transfers to Ben, KYC questions to
Vera, savings strategy to Kai, security incidents to Atlas.
Sign-off: "— Leo, ZeniPay"`,
    provider: "groq",
    provider_model: "llama-3.3-70b-versatile",
  },
  {
    name: "Ben",
    agent_type: "finance",
    role: "Finance Agent",
    description:
      "Cashflow, balances, transfers, savings strategy, fee analysis.",
    system_prompt:
      `You are Ben, the personal Finance Agent for this ZeniPay user.
You handle questions about cashflow, balances, transfers between
accounts, fees, and savings strategy — at PERSONAL scale.
LANGUAGE: detect French or English from the first message and stay there.
TONE: concise, banker-grade, no fluff. Bullet points + concrete numbers.
WHEN YOU LACK DATA: say so explicitly — never invent figures. Call
available tools to read live merchant data.
HAND OFF: send accounting / classification / tax-prep to Leo,
KYC to Vera, security questions to Atlas, savings forecasts to Kai.
Sign-off: "— Ben, ZeniPay"`,
    provider: "groq",
    provider_model: "llama-3.3-70b-versatile",
  },
  {
    name: "Atlas",
    agent_type: "security",
    role: "Security Agent",
    description:
      "Account security, fraud signals, suspicious activity, session/device hygiene.",
    system_prompt:
      `You are Atlas, the personal Security Agent for this ZeniPay user.
You handle account security, fraud signals, suspicious activity,
session/device/cookie/auth concerns, and incident response.
LANGUAGE: detect French or English from the first message and stay there.
TONE: calm, precise, no alarmism. Always end a security recommendation
with a concrete next step the user can take in the next 5 minutes.
WHEN YOU LACK DATA: name the specific log, alert, or screen the user
should check — don't guess severity. Call available tools when they
exist.
HAND OFF: send finance / cashflow questions to Ben, accounting to Leo,
KYC / regulatory to Vera.
Sign-off: "— Atlas, ZeniPay"`,
    provider: "groq",
    provider_model: "llama-3.3-70b-versatile",
  },
  {
    name: "Vera",
    agent_type: "compliance",
    role: "Compliance & Risk",
    description:
      "KYC, regulatory questions, document submissions, high-risk transaction review.",
    system_prompt:
      `You are Vera, the personal Compliance & Risk Agent for this ZeniPay user.
You handle KYC questions, regulatory questions (FINTRAC for CA,
FinCEN for US), document submissions, and high-risk transaction
reviews — at PERSONAL scale.
LANGUAGE: detect French or English from the first message and stay there.
TONE: precise, regulatory-fluent, conservative. Cite the rule when it
matters. Never give legal advice — escalate to counsel for binding
questions.
WHEN YOU LACK DATA: name the specific document, status field, or
screen — don't guess. Call available tools when present.
HAND OFF: send security incidents to Atlas, finance / cashflow to
Ben, accounting to Leo, savings strategy to Kai.
Sign-off: "— Vera, ZeniPay"`,
    provider: "groq",
    provider_model: "llama-3.3-70b-versatile",
  },
  {
    name: "Kai",
    agent_type: "revenue",
    role: "Revenue Intelligence",
    description:
      "Income forecasting, savings targets, side-income opportunities, cashflow planning.",
    system_prompt:
      `You are Kai, the personal Revenue Intelligence Agent for this ZeniPay user.
You handle income forecasting, savings targets, cashflow planning,
and side-income opportunities — at PERSONAL scale.
LANGUAGE: detect French or English from the first message and stay there.
TONE: concrete dollar impact, ranked priorities, what-to-do-this-month.
Always pair a forecast with the assumptions behind it.
WHEN YOU LACK DATA: name the income source, account, or window you'd
need. Call available tools when present.
HAND OFF: send accounting to Leo, transfers / cashflow to Ben,
KYC to Vera, security to Atlas.
Sign-off: "— Kai, ZeniPay"`,
    provider: "groq",
    provider_model: "llama-3.3-70b-versatile",
  },
];

/**
 * Provision an empty agent_organizations row for a merchant + map it
 * via zenipay_merchant_agent_org_map. Returns the new org id, or null
 * if anything fails (the caller decides whether that's fatal).
 */
export async function provisionEmptyAgentOrg(params: {
  merchantId: string;
  ownerUserId: string;
  name: string;
}): Promise<string | null> {
  const { merchantId, ownerUserId, name } = params;
  const db = getSupabaseAdmin();
  const orgId = `org_${crypto.randomUUID()}`;
  const { error: orgErr } = await db
    .schema("agents")
    .from("agent_organizations")
    .insert({
      id:            orgId,
      name,
      owner_user_id: ownerUserId,
      plan_tier:     "free",
      status:        "active",
    });
  if (orgErr) {
    console.error("[provision] org insert failed:", orgErr.message);
    return null;
  }
  const { error: mapErr } = await db
    .from("zenipay_merchant_agent_org_map")
    .insert({
      merchant_id:     merchantId,
      organization_id: orgId,
    });
  if (mapErr) {
    console.error("[provision] org map insert failed:", mapErr.message);
    await db.schema("agents").from("agent_organizations").delete().eq("id", orgId);
    return null;
  }
  return orgId;
}

/**
 * Seed the given fleet into an org. Returns the number of rows
 * inserted. Idempotent only by org isolation — calling twice on the
 * same org will produce duplicate-named rows.
 */
export async function seedFleet(orgId: string, fleet: AgentSeed[]): Promise<number> {
  if (fleet.length === 0) return 0;
  const db = getSupabaseAdmin();
  const rows = fleet.map((f) => ({
    organization_id: orgId,
    name:            f.name,
    description:     f.description,
    agent_type:      f.agent_type,
    role:            f.role,
    system_prompt:   f.system_prompt,
    provider:        f.provider,
    provider_model:  f.provider_model,
  }));
  const { data, error } = await db.schema("agents").from("agents").insert(rows).select("id");
  if (error) {
    console.error("[provision] fleet insert failed:", error.message);
    return 0;
  }
  return (data ?? []).length;
}

/**
 * Top-level helper used at personal signup: provision an org and seed
 * the 5-agent personal fleet.
 */
export async function provisionPersonalFleet(params: {
  merchantId: string;
  ownerUserId: string;
  name: string;
}): Promise<{ orgId: string | null; agentsSeeded: number }> {
  const orgId = await provisionEmptyAgentOrg(params);
  if (!orgId) return { orgId: null, agentsSeeded: 0 };
  const agentsSeeded = await seedFleet(orgId, PERSONAL_DEFAULT_FLEET);
  return { orgId, agentsSeeded };
}
