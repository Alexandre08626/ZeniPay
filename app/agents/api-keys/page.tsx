// /agents/api-keys — list + create + revoke.

"use client";

import React, { useEffect, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import { BORDER, ROW_SEP, TEXT, MUTED, LIGHT, ZP_GRAD, ZP_GREEN, fmtDate } from "@/components/agents/theme";

interface KeyRow {
  id: string;
  name: string;
  key_prefix: string;
  environment: "test" | "live";
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealRaw, setRevealRaw] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState<"test" | "live">("test");

  const refresh = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<{ keys: KeyRow[] }>("/api/v1/agents/api-keys");
      setKeys(d.keys);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await apiFetch<{ raw_key: string }>("/api/v1/agents/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newName || "default", environment: newEnv }),
      });
      setRevealRaw(r.raw_key);
      setNewName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    await apiFetch(`/api/v1/agents/api-keys/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <Shell title="API Keys">
      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800 }}>Create a new key</h2>
        <p style={{ color: MUTED, fontSize: 12, margin: "0 0 12px" }}>
          Test keys <code>zpk_test_…</code> do not move real money. The raw key is only shown once here — copy and store it.
        </p>
        <form onSubmit={create} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name (e.g. production server)"
            style={{
              flex: "1 1 220px",
              padding: "11px 14px",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              fontSize: 13,
              outline: "none",
              background: "#f8fafc",
              color: TEXT,
            }}
          />
          <select
            value={newEnv}
            onChange={(e) => setNewEnv(e.target.value as "test" | "live")}
            style={{
              padding: "11px 14px",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              fontSize: 13,
              outline: "none",
              background: "#f8fafc",
              color: TEXT,
            }}
          >
            <option value="test">test</option>
            <option value="live">live</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            style={{
              background: ZP_GRAD,
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "Generating…" : "Generate key"}
          </button>
        </form>

        {revealRaw && (
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              border: "1px solid rgba(245,166,35,0.3)",
              background: "rgba(245,166,35,0.07)",
              borderRadius: 12,
            }}
          >
            <p style={{ margin: "0 0 6px", color: "#92400E", fontSize: 11, fontWeight: 800 }}>
              ⚠ COPY NOW — YOU WILL NOT SEE THIS AGAIN
            </p>
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
                color: TEXT,
                wordBreak: "break-all",
                background: "#fff",
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
              }}
            >
              {revealRaw}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => void navigator.clipboard.writeText(revealRaw)}
                style={{
                  background: ZP_GREEN,
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Copy
              </button>
              <button
                onClick={() => setRevealRaw(null)}
                style={{
                  background: "#fff",
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                I&apos;ve saved it
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <p style={{ color: MUTED, padding: 20, fontSize: 13 }}>Loading…</p>
        ) : keys.length === 0 ? (
          <p style={{ color: MUTED, padding: 30, fontSize: 13, textAlign: "center" }}>No keys yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Name", "Prefix", "Env", "Scopes", "Last used", "Created", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: MUTED,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: `1px solid ${ROW_SEP}`, opacity: k.revoked_at ? 0.45 : 1 }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: TEXT }}>{k.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "ui-monospace", color: MUTED }}>
                    {k.key_prefix}…
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: k.environment === "live" ? "rgba(45,190,96,0.12)" : "rgba(21,184,201,0.12)",
                        color: k.environment === "live" ? "#16A34A" : "#0891B2",
                        textTransform: "uppercase",
                      }}
                    >
                      {k.environment}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: LIGHT, fontFamily: "ui-monospace" }}>
                    {(k.scopes ?? []).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: MUTED }}>{fmtDate(k.last_used_at) || "never"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: MUTED }}>{fmtDate(k.created_at)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {k.revoked_at ? (
                      <span style={{ fontSize: 10, color: LIGHT }}>revoked</span>
                    ) : (
                      <button
                        onClick={() => void revoke(k.id)}
                        style={{
                          background: "transparent",
                          border: `1px solid rgba(220,38,38,0.3)`,
                          color: "#DC2626",
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Shell>
  );
}
