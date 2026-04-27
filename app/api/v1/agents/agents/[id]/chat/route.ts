// /api/v1/agents/agents/[id]/chat
//
// GET    — return the last 50 turns of this org's conversation with the
//          agent so the frontend can hydrate the chat panel on mount.
// POST   — append a user message, call the provider cascade, persist
//          the assistant reply, and return it.
// DELETE — wipe this org's conversation with the agent.
//
// Provider cascade:
//   1. Groq Llama 3.3 70B (free tier, supports tool-calling — primary)
//   2. Anthropic Claude Haiku 4.5 (paid fallback, no tools in v1)
//
// Tool-calling: the Groq path exposes 3 read-only tools the agent can
// invoke to look at the merchant's real data:
//   - get_account_balances
//   - get_recent_transactions
//   - get_merchant_summary
// Tools are server-side, scoped strictly to the merchant_id resolved
// from this org via zenipay_merchant_agent_org_map. Up to 3 tool-loop
// iterations per turn to handle simple chained reasoning.
//
// Persistence lives in agents.agent_chat_messages, scoped per
// organization. We persist only the user's text + the final assistant
// text; tool round-trips stay on the server.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  message?: string;
}

interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  agent_type: string;
  role: string | null;
  system_prompt: string | null;
  provider: string | null;
  provider_model: string | null;
}

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL_DEFAULT = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL_DEFAULT = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const TIMEOUT_MS = Number(process.env.AGENT_CHAT_TIMEOUT_MS || 25_000);
const HISTORY_TURNS_FOR_PROVIDER = 20;
const HISTORY_TURNS_FOR_CLIENT   = 50;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOOL_ITERATIONS = 3;

function defaultSystemPrompt(agent: AgentRow): string {
  const roleLine = agent.role ? `Specialty: ${agent.role}.` : "";
  const desc = agent.description ? `Context: ${agent.description}` : "";
  return [
    `You are ${agent.name}, a ZeniPay AI specialist.`,
    `You handle ${agent.agent_type} questions for the merchant.`,
    roleLine,
    desc,
    "Be concise, concrete, and answer in the user's language (French or English — detect from the first message and stay there).",
    "When you don't know something specific to this merchant's data, say so clearly instead of guessing.",
    `Sign-off: "— ${agent.name}, ZeniPay"`,
  ].filter(Boolean).join("\n");
}

// ─── Tool definitions (OpenAI-compat, used by Groq) ────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_account_balances",
      description: "Get the merchant's ZeniPay account balances. Returns each account's name, type, current balance, and currency. Call this when the user asks about money on hand, available funds, or account composition.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_transactions",
      description: "Get the merchant's most recent money-movement events from the ledger (payments in, transfers, fees, payouts). Returns up to `limit` rows newest-first. Call this when the user asks about recent activity, last transactions, or specific money movements.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of rows to return. Defaults to 10. Cap is 50.",
            minimum: 1,
            maximum: 50,
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_merchant_summary",
      description: "Get a high-level summary of the merchant: legal name, status, plan, country, primary currency, account count, and total balance across all accounts. Call this when the user asks 'who am I' or wants a one-shot overview.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
] as const;

interface MerchantContext {
  merchantId: string;
}

async function resolveMerchantForOrg(organizationId: string): Promise<MerchantContext | null> {
  // The agent's organization is mapped to a merchant via the public-schema
  // join table populated at signup. Without that link, we can't safely
  // serve tool reads — return null and the model gets told the data is
  // unavailable for this account.
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data?.merchant_id) return null;
  return { merchantId: data.merchant_id as string };
}

interface ToolResult { ok: boolean; data?: unknown; error?: string }

async function executeTool(name: string, args: Record<string, unknown>, ctx: MerchantContext): Promise<ToolResult> {
  const db = getSupabaseAdmin();

  if (name === "get_account_balances") {
    const { data, error } = await db
      .from("zenipay_accounts")
      .select("account_name, account_type, balance, currency, is_primary, status")
      .eq("merchant_id", ctx.merchantId)
      .order("is_primary", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? [] };
  }

  if (name === "get_recent_transactions") {
    const rawLimit = typeof args.limit === "number" ? args.limit : 10;
    const limit = Math.min(50, Math.max(1, Math.floor(rawLimit)));
    const { data, error } = await db
      .from("zenipay_ledger")
      .select("event_type, direction, amount, currency, note, created_at")
      .eq("merchant_id", ctx.merchantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? [] };
  }

  if (name === "get_merchant_summary") {
    const { data: merchant, error: merchantErr } = await db
      .from("zenipay_merchants")
      .select("business_name, status, plan, country")
      .eq("id", ctx.merchantId)
      .maybeSingle();
    if (merchantErr) return { ok: false, error: merchantErr.message };
    if (!merchant) return { ok: false, error: "merchant_not_found" };

    const { data: accounts } = await db
      .from("zenipay_accounts")
      .select("balance, currency")
      .eq("merchant_id", ctx.merchantId);
    const totalsByCurrency: Record<string, number> = {};
    for (const a of (accounts ?? []) as Array<{ balance: number | string; currency: string | null }>) {
      const ccy = a.currency || "CAD";
      totalsByCurrency[ccy] = (totalsByCurrency[ccy] ?? 0) + Number(a.balance ?? 0);
    }
    const { count: txCount } = await db
      .from("zenipay_ledger")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", ctx.merchantId);

    return {
      ok: true,
      data: {
        business_name:    merchant.business_name,
        status:           merchant.status,
        plan:             merchant.plan,
        country:          merchant.country,
        account_count:    (accounts ?? []).length,
        balances_by_currency: totalsByCurrency,
        transaction_count: txCount ?? 0,
      },
    };
  }

  return { ok: false, error: `unknown_tool:${name}` };
}

// ─── Provider calls ────────────────────────────────────────────────────

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface GroqChoice {
  message: GroqMessage;
  finish_reason: string;
}

async function groqRequest(model: string, messages: GroqMessage[], withTools: boolean) {
  if (!GROQ_KEY) return null;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.6,
  };
  if (withTools) body.tools = TOOLS;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { choices?: GroqChoice[] };
    return data.choices?.[0] ?? null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function callGroq(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
  model: string,
  merchantCtx: MerchantContext | null,
): Promise<{ reply: string; model: string; toolsUsed: string[] } | null> {
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as GroqMessage),
    { role: "user", content: message },
  ];

  const toolsUsed: string[] = [];
  const withTools = !!merchantCtx;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const choice = await groqRequest(model, messages, withTools);
    if (!choice) return null;

    const toolCalls = choice.message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const reply = (choice.message.content ?? "").trim();
      if (!reply) return null;
      return { reply, model, toolsUsed };
    }

    // Append the assistant turn that requested the tool calls — the
    // Groq API needs to see it in the next call's context.
    messages.push({
      role: "assistant",
      content: choice.message.content ?? "",
      tool_calls: toolCalls,
    });

    // Execute each tool call serially. This is fine for our 3 read-only
    // tools; if we ever add slow tools we can parallelise.
    for (const call of toolCalls) {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>; }
      catch { parsed = {}; }
      const result = merchantCtx
        ? await executeTool(call.function.name, parsed, merchantCtx)
        : { ok: false, error: "no_merchant_linked_to_this_org" } as ToolResult;
      toolsUsed.push(call.function.name);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  // Hit the iteration cap without producing a final answer.
  return null;
}

async function callAnthropic(systemPrompt: string, history: ChatMessage[], message: string, model: string) {
  if (!ANTHROPIC_KEY) return null;
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const data = await resp.json();
    const reply = data?.content?.[0]?.text?.trim();
    return reply ? { reply, model } : null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

// ─── DB helpers ────────────────────────────────────────────────────────

interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider: string | null;
  model: string | null;
  created_at: string;
}

async function loadHistory(agentId: string, limit: number): Promise<StoredMessage[]> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_chat_messages")
    .select("id, role, content, provider, model, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[agent_chat] loadHistory failed:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as StoredMessage[]).slice().reverse();
}

function toProviderHistory(rows: StoredMessage[]): ChatMessage[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
}

async function loadAgent(agentId: string, organizationId: string): Promise<AgentRow | null> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agents")
    .select("id, name, description, agent_type, role, system_prompt, provider, provider_model")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as AgentRow;
}

// ─── Route handlers ────────────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const agent = await loadAgent(id, auth.organizationId);
  if (!agent) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
  const history = await loadHistory(id, HISTORY_TURNS_FOR_CLIENT);
  return NextResponse.json({
    messages: history.map((r) => ({
      id:         r.id,
      role:       r.role,
      content:    r.content,
      provider:   r.provider,
      model:      r.model,
      created_at: r.created_at,
    })),
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);

  let body: ChatBody;
  try { body = (await req.json()) as ChatBody; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: "message_too_long" }, { status: 400 });
  }

  const agent = await loadAgent(id, auth.organizationId);
  if (!agent) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });

  // Augment the system prompt with a note about which tools the agent
  // has access to — Groq Llama is more reliable about USING tools when
  // the system prompt names them. This is a no-op for orgs without a
  // merchant link (tools won't be passed in that case anyway).
  const merchantCtx = await resolveMerchantForOrg(auth.organizationId);
  const baseSystemPrompt = agent.system_prompt?.trim() || defaultSystemPrompt(agent);
  const systemPrompt = merchantCtx
    ? `${baseSystemPrompt}\n\nYou have access to live tools that read this merchant's real data: get_account_balances, get_recent_transactions(limit), get_merchant_summary. Call them whenever a numeric answer is required — do NOT invent figures.`
    : `${baseSystemPrompt}\n\nNote: this agent's organization is not yet linked to a merchant, so live data tools are unavailable. Tell the user clearly when they ask about specific numbers.`;

  // Provider preference: respect agent.provider if it matches a
  // supported one, else default to Groq → Anthropic cascade.
  const preferred = (agent.provider || "").toLowerCase();
  const groqModel = (preferred === "groq" && agent.provider_model) || GROQ_MODEL_DEFAULT;
  const anthropicModel = (preferred === "anthropic" && agent.provider_model) || ANTHROPIC_MODEL_DEFAULT;

  const historyRows = await loadHistory(id, HISTORY_TURNS_FOR_PROVIDER);
  const history = toProviderHistory(historyRows);

  // 1. Groq primary (with tools when a merchant is linked)
  let result = await callGroq(systemPrompt, history, message, groqModel, merchantCtx);
  let provider: "groq" | "anthropic" | null = result ? "groq" : null;
  let toolsUsed: string[] = result?.toolsUsed ?? [];
  let model = result?.model ?? groqModel;
  let reply = result?.reply;

  // 2. Anthropic fallback (no tools in v1)
  if (!result) {
    const ar = await callAnthropic(systemPrompt, history, message, anthropicModel);
    if (ar) {
      provider = "anthropic";
      model = ar.model;
      reply = ar.reply;
      toolsUsed = [];
    }
  }

  if (!reply || !provider) {
    return NextResponse.json(
      { error: "all_providers_unavailable", message: "Both Groq and Anthropic failed. Try again in a moment." },
      { status: 503 },
    );
  }

  // Persist both turns now that we know the call succeeded.
  const db = getAgentsDb();
  const insertRows = [
    {
      agent_id:        id,
      organization_id: auth.organizationId,
      user_id:         auth.userId ?? null,
      role:            "user",
      content:         message,
      provider:        null,
      model:           null,
    },
    {
      agent_id:        id,
      organization_id: auth.organizationId,
      user_id:         auth.userId ?? null,
      role:            "assistant",
      content:         reply,
      provider,
      model,
    },
  ];
  const { error: persistErr } = await db.from("agent_chat_messages").insert(insertRows);
  if (persistErr) {
    console.error("[agent_chat] persist failed (non-fatal):", persistErr.message);
  }

  return NextResponse.json({
    reply,
    provider,
    model,
    tools_used: toolsUsed,
  });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const agent = await loadAgent(id, auth.organizationId);
  if (!agent) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
  const db = getAgentsDb();
  const { error } = await db
    .from("agent_chat_messages")
    .delete()
    .eq("agent_id", id)
    .eq("organization_id", auth.organizationId);
  if (error) return NextResponse.json({ error: "server_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
