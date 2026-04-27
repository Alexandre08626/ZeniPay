// POST /api/v1/agents/agents/[id]/chat
//
// Conversational chat with a single agent. Loads the agent's identity
// (name, role, agent_type, description, system_prompt) from agents.agents,
// builds a system prompt if one isn't stored, and forwards the message
// history to a provider cascade:
//
//   1. Groq (Llama 3.3 70B, free tier — primary)
//   2. Anthropic Claude Haiku (paid fallback when GROQ is rate-limited
//      or returns an error)
//
// No DB persistence in v1 — the client keeps the message history in
// component state. We pass the last 20 turns through to the provider on
// each call.

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
  history?: ChatMessage[];
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
const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4000;

function defaultSystemPrompt(agent: AgentRow): string {
  // Build a sensible persona when the row doesn't have one stored.
  // Each agent gets framed by its name + role + type so Groq picks
  // up the specialist tone (Atlas → security, Ben → finance, etc.).
  const roleLine = agent.role ? `Specialty: ${agent.role}.` : "";
  const typeLine = `You handle ${agent.agent_type} questions for the merchant.`;
  const desc = agent.description ? `Context: ${agent.description}` : "";
  return [
    `You are ${agent.name}, a ZeniPay AI specialist.`,
    typeLine,
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

  // Validate + clip the supplied history. We trust client state for v1
  // (no DB persistence) but cap turn count + per-message size to keep
  // upstream calls bounded.
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: ChatMessage[] = rawHistory
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_CHARS) }));

  const db = getAgentsDb();
  const { data: agent, error: agentErr } = await db
    .from("agents")
    .select("id, name, description, agent_type, role, system_prompt, provider, provider_model")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (agentErr) return NextResponse.json({ error: "server_error", detail: agentErr.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });

  const a = agent as unknown as AgentRow;
  const systemPrompt = a.system_prompt?.trim() || defaultSystemPrompt(a);

  // Provider selection: respect the agent's stored `provider` if it
  // matches a supported one, otherwise default to Groq → Anthropic.
  const preferred = (a.provider || "").toLowerCase();
  const groqModel = (preferred === "groq" && a.provider_model) || GROQ_MODEL_DEFAULT;
  const anthropicModel = (preferred === "anthropic" && a.provider_model) || ANTHROPIC_MODEL_DEFAULT;

  // 1. Groq primary
  const groqReply = await callGroq(systemPrompt, history, message, groqModel);
  if (groqReply) {
    return NextResponse.json({
      reply:    groqReply.reply,
      provider: "groq",
      model:    groqReply.model,
    });
  }

  // 2. Anthropic fallback
  const anthropicReply = await callAnthropic(systemPrompt, history, message, anthropicModel);
  if (anthropicReply) {
    return NextResponse.json({
      reply:    anthropicReply.reply,
      provider: "anthropic",
      model:    anthropicReply.model,
    });
  }

  return NextResponse.json(
    { error: "all_providers_unavailable", message: "Both Groq and Anthropic failed. Try again in a moment." },
    { status: 503 },
  );
}
