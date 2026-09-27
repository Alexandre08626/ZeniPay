"use client";

// Orvel — floating chat on every Business dashboard page. Orvel acts on its
// own within the permissions set in /app/orvel; every action it takes is
// listed under its reply, with an undo button when reversible.

import React, { useEffect, useRef, useState } from "react";
import { X, Send, Undo2, CheckCircle2, AlertTriangle, Ban } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";
import { OrvelMark } from "./OrvelMark";

interface Action { id?: string; tool: string; status: "done" | "failed" | "denied"; summary: string; undoable: boolean }
interface Msg { role: "user" | "assistant"; content: string; actions?: Action[]; error?: boolean }

const STORE_KEY = "zp_orvel_chat";
const SUGGESTIONS = [
  "Combien mes clients me doivent-ils ?",
  "Fais une facture de 2 000 $ + taxes à Jean Tremblay (jean@exemple.com) en 3 versements : 30 % aujourd'hui, 30 % dans un mois, le solde dans deux mois",
  "Relance les versements en retard",
];

export function OrvelChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const raw = sessionStorage.getItem(STORE_KEY); if (raw) setMsgs(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/orvel/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      const j = await r.json().catch(() => ({}));
      setMsgs([...next, r.ok
        ? { role: "assistant", content: j.reply || "", actions: j.actions || [] }
        : { role: "assistant", content: j.error || "Orvel n'a pas pu répondre.", error: true }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Connexion impossible avec Orvel.", error: true }]);
    } finally { setBusy(false); }
  };

  const undo = async (a: Action) => {
    if (!a.id) return;
    setUndone((u) => ({ ...u, [a.id!]: "…" }));
    const r = await fetch(`/api/orvel/actions/${a.id}/undo`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setUndone((u) => ({ ...u, [a.id!]: r.ok ? (j.message || "Annulé") : (j.error || "Annulation impossible") }));
  };

  const fab: React.CSSProperties = {
    position: "fixed", right: 20, bottom: 20, zIndex: zp.zIndex.modal, width: 56, height: 56, borderRadius: "50%",
    border: "none", cursor: "pointer", background: "#000", padding: 0, overflow: "hidden",
    boxShadow: "0 10px 30px rgba(99,102,241,0.45), 0 0 0 2px rgba(255,255,255,0.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  if (!open) {
    return (
      <button type="button" aria-label="Ouvrir Orvel" onClick={() => setOpen(true)} style={fab}>
        <OrvelMark size={56} />
      </button>
    );
  }

  return (
    <div role="dialog" aria-label="Orvel" style={{
      position: "fixed", right: 16, bottom: 16, zIndex: zp.zIndex.modal,
      width: "min(420px, calc(100vw - 32px))", height: "min(620px, calc(100vh - 32px))",
      background: zp.surface.bg1, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.lg,
      boxShadow: zp.elevation.lg, display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <OrvelMark size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Orvel</div>
          <div style={{ fontSize: 11, color: zp.text.muted }}>Agit seul selon vos <a href="/app/orvel" style={{ color: zp.brand.cyan }}>permissions</a></div>
        </div>
        {msgs.length > 0 && (
          <button type="button" onClick={() => { setMsgs([]); setUndone({}); }} style={{ background: "transparent", border: "none", color: zp.text.muted, fontSize: 11, cursor: "pointer" }}>Effacer</button>
        )}
        <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: zp.text.muted, cursor: "pointer" }}><X size={18} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div style={{ color: zp.text.muted, fontSize: 13 }}>
            <p style={{ margin: "0 0 10px" }}>Dites-moi quoi faire : factures (même en versements), relances, liens de paiement, remboursements, virements entre vos comptes, questions sur vos chiffres.</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} style={{
                display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "8px 10px",
                background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm,
                color: zp.text.primary, fontSize: 12, cursor: "pointer",
              }}>{s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{
              padding: "9px 12px", borderRadius: zp.radius.md, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word",
              background: m.role === "user" ? zp.brand.cyan : m.error ? zp.semantic.dangerBg : zp.surface.bg2,
              color: m.role === "user" ? "#04111d" : m.error ? zp.semantic.danger : zp.text.primary,
            }}>{m.content}</div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                {m.actions.map((a, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: a.status === "done" ? zp.semantic.success : a.status === "denied" ? zp.text.muted : zp.semantic.danger }}>
                    {a.status === "done" ? <CheckCircle2 size={12} /> : a.status === "denied" ? <Ban size={12} /> : <AlertTriangle size={12} />}
                    <span style={{ flex: 1 }}>{a.summary}</span>
                    {a.undoable && a.id && !undone[a.id] && (
                      <button type="button" onClick={() => undo(a)} style={{ background: "transparent", border: "none", color: zp.brand.cyan, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Undo2 size={11} /> Annuler
                      </button>
                    )}
                    {a.id && undone[a.id] && <span style={{ color: zp.text.muted }}>{undone[a.id]}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div style={{ fontSize: 12, color: zp.text.muted }}>Orvel travaille…</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} style={{ padding: 10, borderTop: `1px solid ${zp.surface.border}`, display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
          placeholder="Demandez à Orvel…"
          rows={2}
          style={{
            flex: 1, resize: "none", padding: "8px 10px", fontSize: 13, borderRadius: zp.radius.sm,
            border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, color: zp.text.primary, fontFamily: "inherit",
          }}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer" style={{
          width: 42, borderRadius: zp.radius.sm, border: "none", cursor: busy ? "default" : "pointer",
          background: zp.gradient.main, color: "#fff", opacity: busy || !input.trim() ? 0.5 : 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><Send size={16} /></button>
      </form>
    </div>
  );
}

export default OrvelChat;
