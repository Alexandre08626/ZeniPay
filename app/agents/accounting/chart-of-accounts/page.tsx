// /agents/accounting/chart-of-accounts — edit GL accounts.
// First-use flow: if the list is empty, offer to seed the 21 ZeniPay defaults.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN,
} from "@/components/agents/theme";

interface GlAccount {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  active: boolean;
  created_at: string;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ accounts: GlAccount[] }>("/api/v1/agents/accounting/gl-accounts");
      setAccounts(r.accounts);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const seed = async () => {
    setBusy(true); setErr(null);
    try {
      await apiFetch("/api/v1/agents/accounting/seed", { method: "POST" });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await apiFetch("/api/v1/agents/accounting/gl-accounts", {
        method: "POST",
        body: JSON.stringify({ code: newCode, name: newName }),
      });
      setNewCode(""); setNewName("");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const patch = async (id: string, body: Partial<Pick<GlAccount, "code" | "name" | "active">>) => {
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/api/v1/agents/accounting/gl-accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const remove = async (id: string, code: string) => {
    if (!confirm(`Delete GL account ${code}? Only works if no expense report line references it.`)) return;
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/api/v1/agents/accounting/gl-accounts/${id}`, { method: "DELETE" });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Chart of accounts">
      <Breadcrumbs />

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      {loading ? (
        <Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p></Card>
      ) : accounts.length === 0 ? (
        <Card>
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>📒</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: TEXT, margin: "0 0 6px" }}>Empty chart of accounts</p>
            <p style={{ fontSize: 12, color: MUTED, margin: "0 0 16px", maxWidth: 440, marginInline: "auto", lineHeight: 1.5 }}>
              Seed the 21 ZeniPay-recommended accounts (6xxx expenses, 1xxx cash, 9900 uncategorized).
              You can edit or delete any of them afterwards.
            </p>
            <button
              onClick={seed}
              disabled={busy}
              style={{
                padding: "10px 20px", borderRadius: 10,
                background: ZP_GREEN, color: "#fff",
                border: "none", cursor: busy ? "default" : "pointer",
                fontSize: 13, fontWeight: 800,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Seeding…" : "Seed ZeniPay defaults"}
            </button>
          </div>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>Add account</h3>
            <form onSubmit={create} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Code (e.g. 6810)"
                required
                style={inputStyle(100)}
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (e.g. AI Training Expenses)"
                required
                style={inputStyle(260)}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  background: ZP_GREEN, color: "#fff",
                  border: "none", cursor: busy ? "default" : "pointer",
                  fontSize: 12, fontWeight: 800,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Add
              </button>
            </form>
          </Card>

          <Card>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 6px" }}>Code</th>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                    <td style={{ padding: "10px 6px", fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>
                      {a.code}
                    </td>
                    <td style={{ padding: "10px 6px", color: TEXT }}>
                      {a.name}
                      {a.code === "9900" && (
                        <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: MUTED, fontWeight: 700 }}>
                          reserved
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      {a.active ? (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(45,190,96,0.12)", color: "#16A34A", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</span>
                      ) : (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: MUTED, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Archived</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <button
                        onClick={() => patch(a.id, { active: !a.active })}
                        disabled={busy}
                        style={actionBtn(ZP_CYAN)}
                      >
                        {a.active ? "Archive" : "Restore"}
                      </button>
                      {a.code !== "9900" && (
                        <button
                          onClick={() => remove(a.id, a.code)}
                          disabled={busy}
                          style={{ ...actionBtn("#DC2626"), marginLeft: 6 }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </Shell>
  );
}

function Breadcrumbs() {
  return (
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
      <Link href="/agents/accounting" style={{ color: MUTED, textDecoration: "none" }}>Accounting</Link>
      {" · "}
      <span style={{ color: TEXT, fontWeight: 700 }}>Chart of accounts</span>
    </div>
  );
}

function inputStyle(width: number): React.CSSProperties {
  return {
    padding: "8px 12px", fontSize: 13,
    border: `1px solid ${BORDER}`, borderRadius: 10,
    width, color: TEXT, background: "#fff", outline: "none",
  };
}

function actionBtn(color: string): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 8,
    background: "transparent", border: `1px solid ${color}`,
    color, fontSize: 11, fontWeight: 700, cursor: "pointer",
  };
}

void LIGHT;
