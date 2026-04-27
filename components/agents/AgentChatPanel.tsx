// Shared chat surface for any agent. Used by /agents/agents/[id] and
// by /agents/accounting (Leo's chat is embedded directly there). Posts
// to /api/v1/agents/agents/[id]/chat which loads the agent's persona
// from agents.agents and forwards through Groq → Anthropic with
// merchant-data tool-calling enabled. History is persisted per-org
// in agents.agent_chat_messages.
//
// The prop type is intentionally minimal — id + name is all the panel
// needs from its host page.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/agents/Shell";
import { apiFetch } from "@/app/agents/_lib/session";
import { BORDER, MUTED, TEXT, ZP_GRAD, ZP_GREEN } from "@/components/agents/theme";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentLite {
  id: string;
  name: string;
}

export function AgentChatPanel({ agent }: { agent: AgentLite }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Hydrate from the DB on mount — the conversation persists across
  // page loads, scoped per organization.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{
          messages: Array<{ role: "user" | "assistant" | "system"; content: string; provider?: string | null }>;
        }>(`/api/v1/agents/agents/${agent.id}/chat`);
        if (cancelled) return;
        const filtered = (data.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        setMessages(filtered);
        const lastAssistant = [...(data.messages ?? [])].reverse().find((m) => m.role === "assistant");
        if (lastAssistant?.provider) setProvider(lastAssistant.provider);
      } catch {
        /* hydration failure is non-fatal — start with an empty thread */
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [agent.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, sending, hydrating]);

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setErr(null);
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    try {
      const data = await apiFetch<{
        reply: string; provider: string; model: string;
        error?: string; message?: string;
      }>(`/api/v1/agents/agents/${agent.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      if (data?.error) {
        setErr(data.message || data.error);
      } else if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setProvider(data.provider);
      } else {
        setErr("Empty response from the agent.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const clearConversation = async () => {
    if (sending || messages.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm(`Clear the conversation with ${agent.name}?`)) return;
    setErr(null);
    try {
      await apiFetch(`/api/v1/agents/agents/${agent.id}/chat`, { method: "DELETE" });
      setMessages([]);
      setProvider(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <Card style={{ marginBottom: 16, padding: 0 }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Chat with {agent.name}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED }}>
            Ask anything in your agent&rsquo;s area of expertise. The conversation is saved across visits.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {provider && (
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
              background: "rgba(45,190,96,0.10)", color: ZP_GREEN,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              via {provider}
            </span>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => void clearConversation()}
              disabled={sending}
              style={{
                fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8,
                background: "transparent", color: MUTED,
                border: `1px solid ${BORDER}`,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          padding: "16px 18px",
          maxHeight: 360,
          minHeight: 120,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "#fafbfc",
        }}
      >
        {hydrating && (
          <p style={{ margin: 0, fontSize: 12, color: MUTED, textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
            Loading conversation…
          </p>
        )}
        {!hydrating && messages.length === 0 && !sending && (
          <p style={{ margin: 0, fontSize: 13, color: MUTED, textAlign: "center", padding: "24px 0" }}>
            Start a conversation with {agent.name}.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? ZP_GRAD : "#FFFFFF",
              color: m.role === "user" ? "#FFFFFF" : TEXT,
              border: m.role === "user" ? "none" : `1px solid ${BORDER}`,
              boxShadow: m.role === "user" ? "0 2px 6px rgba(45,190,96,0.18)" : "none",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 14,
              fontSize: 12,
              fontStyle: "italic",
              color: MUTED,
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
            }}
          >
            {agent.name} is thinking…
          </div>
        )}
      </div>

      {err && (
        <div role="alert" style={{
          margin: "0 18px 12px", padding: "8px 12px", borderRadius: 8,
          background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
          fontSize: 12, fontWeight: 700,
        }}>{err}</div>
      )}

      <div style={{
        padding: "12px 18px 16px", borderTop: `1px solid ${BORDER}`,
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={`Message ${agent.name}…`}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 10,
            border: `1.5px solid ${BORDER}`, fontSize: 13, outline: "none",
            boxSizing: "border-box", background: "#FFFFFF", color: TEXT,
            fontFamily: "inherit", resize: "vertical", minHeight: 60, maxHeight: 200,
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          style={{
            background: ZP_GRAD, color: "#FFFFFF", border: "none",
            padding: "11px 18px", borderRadius: 10,
            fontSize: 13, fontWeight: 800, cursor: (!input.trim() || sending) ? "not-allowed" : "pointer",
            opacity: (!input.trim() || sending) ? 0.55 : 1,
            boxShadow: "0 2px 6px rgba(45,190,96,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          {sending ? "Sending…" : "Send →"}
        </button>
      </div>
    </Card>
  );
}
