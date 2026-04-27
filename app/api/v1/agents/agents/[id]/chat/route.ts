// /api/v1/agents/agents/[id]/chat
//
// GET   — return the last 50 turns of this org's conversation with the
//         agent so the frontend can hydrate the chat panel on mount.
//
// POST  — append a user message, call the provider cascade, persist the
//         assistant reply, and return it. History fed to the provider
//         comes from the DB (last 20 turns), not from the client — the
//         server is the source of truth.
//
// Provider cascade (mirror of the Lina pattern in zeniva-travel):
//   1. Groq Llama 3.3 70B (free tier — primary for cost)
//   2. Anthropic Claude Haiku 4.5 (paid fallback)
//
// Persistence lives in agents.agent_chat_messages, scoped per
// organization (one shared conversation per agent for the merchant —
// not per individual user). Messages are written only on success;
// failed provider calls don't pollute history.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

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

async function callGroq(systemPrompt: string, history: ChatMessage[], message: string, model: string) {
  if (!GROQ_KEY) return null;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.6 }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return reply ? { reply, model } : null;
  } catch {
    clearTimeout(t);
    return null;
  }
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
  // We fetch DESC for the LIMIT then flip to chronological order so the
  // provider sees the conversation in the right direction.
  return (data ?? []).reverse() as StoredMessage[];
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

  const systemPrompt = agent.system_prompt?.trim() || defaultSystemPrompt(agent);

  // Provider preference: respect agent.provider if it matches a
  // supported one, else default to Groq → Anthropic cascade.
  const preferred = (agent.provider || "").toLowerCase();
  const groqModel = (preferred === "groq" && agent.provider_model) || GROQ_MODEL_DEFAULT;
  const anthropicModel = (preferred === "anthropic" && agent.provider_model) || ANTHROPIC_MODEL_DEFAULT;

  // Server-side history — DON'T trust the client to send it. Last 20
  // turns is enough context without blowing the prompt budget.
  const historyRows = await loadHistory(id, HISTORY_TURNS_FOR_PROVIDER);
  const history = toProviderHistory(historyRows);

  // 1. Groq primary
  let result = await callGroq(systemPrompt, history, message, groqModel);
  let provider: "groq" | "anthropic" | null = result ? "groq" : null;
  // 2. Anthropic fallback
  if (!result) {
    result = await callAnthropic(systemPrompt, history, message, anthropicModel);
    if (result) provider = "anthropic";
  }

  if (!result || !provider) {
    return NextResponse.json(
      { error: "all_providers_unavailable", message: "Both Groq and Anthropic failed. Try again in a moment." },
      { status: 503 },
    );
  }

  // Persist both turns now that we know the call succeeded. Failures
  // here aren't fatal — we still return the reply to the user, the
  // worst case is that this turn won't appear in future context.
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
      content:         result.reply,
      provider,
      model:           result.model,
    },
  ];
  const { error: persistErr } = await db.from("agent_chat_messages").insert(insertRows);
  if (persistErr) {
    console.error("[agent_chat] persist failed (non-fatal):", persistErr.message);
  }

  return NextResponse.json({
    reply:    result.reply,
    provider,
    model:    result.model,
  });
}

// DELETE — wipe this agent's conversation for the calling org. Used by
// the "Clear chat" affordance in the panel.
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
