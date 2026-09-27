// /app/orvel — Orvel's permissions (one switch per capability) and the
// journal of everything Orvel has done, with undo when reversible.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Ban, Undo2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";
import { OrvelMark } from "@/components/orvel/OrvelMark";

interface PermissionDef { key: string; label: string; description: string; money: boolean }
interface Settings { enabled: boolean; permissions: Record<string, boolean>; persisted: boolean; catalog: PermissionDef[] }
interface ActionRow { id: string; tool: string; status: string; created_at: string; undone_at: string | null; prompt: string | null; summary: string; undoable: boolean }

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 999, border: "none", position: "relative", flexShrink: 0,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      background: on ? zp.brand.cyan : zp.surface.bg3, transition: "background .15s",
    }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

export default function OrvelPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([
      fetch("/api/orvel/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/orvel/actions").then((r) => r.json()).catch(() => ({ actions: [] })),
    ]);
    if (s && s.catalog) setSettings(s);
    setActions(Array.isArray(a?.actions) ? a.actions : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (patch: { enabled?: boolean; permissions?: Record<string, boolean> }) => {
    if (!settings) return;
    const optimistic = { ...settings, ...(patch.enabled != null ? { enabled: patch.enabled } : {}), permissions: { ...settings.permissions, ...(patch.permissions || {}) } };
    setSettings(optimistic); setSaving(true); setMsg(null);
    const r = await fetch("/api/orvel/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) { setSettings(j); setMsg({ ok: true, text: "Enregistré." }); }
    else { setMsg({ ok: false, text: j.error || "Enregistrement impossible." }); void load(); }
  };

  const undo = async (a: ActionRow) => {
    const r = await fetch(`/api/orvel/actions/${a.id}/undo`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setMsg({ ok: r.ok, text: r.ok ? j.message || "Annulé." : j.error || "Annulation impossible." });
    void load();
  };

  return (
    <DashboardShell>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <OrvelMark size={56} />
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 26, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>Orvel</h1>
          <p style={{ margin: 0, fontSize: 13, color: zp.text.muted }}>Votre opérateur financier IA. Il agit seul sur tout ce que vous activez ici — ouvrez-le avec le bouton en bas à droite.</p>
        </div>
      </div>

      {msg && (
        <div style={{ margin: "14px 0", padding: "10px 12px", borderRadius: zp.radius.sm, fontSize: 13, background: msg.ok ? zp.semantic.successBg : zp.semantic.dangerBg, color: msg.ok ? zp.semantic.success : zp.semantic.danger }}>{msg.text}</div>
      )}
      {settings && !settings.persisted && (
        <div style={{ margin: "14px 0", padding: "10px 12px", borderRadius: zp.radius.sm, fontSize: 13, background: zp.semantic.dangerBg, color: zp.semantic.danger }}>
          Les permissions affichées sont les valeurs par défaut : la base de données n'a pas encore les tables d'Orvel (migration à appliquer).
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 18 }}>
        <BankingCard accent="cyan">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Permissions</div>
              <div style={{ fontSize: 12, color: zp.text.muted }}>Activé = Orvel le fait sans demander.</div>
            </div>
            {settings && <Toggle label="Orvel activé" on={settings.enabled} disabled={saving} onChange={(v) => save({ enabled: v })} />}
          </div>
          {!settings && <div style={{ fontSize: 13, color: zp.text.muted }}>Chargement…</div>}
          {settings?.catalog.map((p) => (
            <div key={p.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: `1px solid ${zp.surface.border}`, opacity: settings.enabled ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
                  {p.label}
                  {p.money && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 999, background: zp.semantic.dangerBg, color: zp.semantic.danger }}>ARGENT RÉEL</span>}
                </div>
                <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>{p.description}</div>
              </div>
              <Toggle label={p.label} on={!!settings.permissions[p.key]} disabled={saving || !settings.enabled} onChange={(v) => save({ permissions: { [p.key]: v } })} />
            </div>
          ))}
        </BankingCard>

        <BankingCard accent="violet">
          <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 4 }}>Journal d'Orvel</div>
          <div style={{ fontSize: 12, color: zp.text.muted, marginBottom: 12 }}>Chaque action, avec la demande qui l'a déclenchée.</div>
          {actions.length === 0 && <div style={{ fontSize: 13, color: zp.text.muted }}>Aucune action pour l'instant.</div>}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {actions.map((a) => (
              <div key={a.id} style={{ padding: "10px 0", borderTop: `1px solid ${zp.surface.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: zp.text.primary }}>
                  {a.status === "done" ? <CheckCircle2 size={14} color={zp.semantic.success} />
                    : a.status === "denied" ? <Ban size={14} color={zp.text.muted} />
                    : a.status === "undone" ? <Undo2 size={14} color={zp.text.muted} />
                    : <AlertTriangle size={14} color={zp.semantic.danger} />}
                  <span style={{ flex: 1, textDecoration: a.status === "undone" ? "line-through" : "none" }}>{a.summary}</span>
                  {a.undoable && (
                    <button type="button" onClick={() => undo(a)} style={{ background: "transparent", border: "none", color: zp.brand.cyan, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>
                  {zp.fmtDateTime(a.created_at)}{a.prompt ? ` · « ${a.prompt.slice(0, 90)}${a.prompt.length > 90 ? "…" : ""} »` : ""}
                </div>
              </div>
            ))}
          </div>
        </BankingCard>
      </div>
    </DashboardShell>
  );
}
