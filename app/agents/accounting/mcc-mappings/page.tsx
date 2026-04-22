// /agents/accounting/mcc-mappings — MCC override configurator.
// Shows every MCC in the catalog + any org override. Add/remove overrides.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN,
} from "@/components/agents/theme";

interface MergedRow {
  mcc: string;
  description: string | null;
  catalog_default: { gl_code: string; gl_name: string } | null;
  org_mapping: {
    id: string;
    is_default: boolean;
    gl_account_id: string;
    gl_code: string;
    gl_name: string;
  } | null;
}

interface GlRow { id: string; code: string; name: string; active: boolean }

export default function MccMappingsPage() {
  const [rows, setRows] = useState<MergedRow[]>([]);
  const [gls, setGls] = useState<GlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, g] = await Promise.all([
        apiFetch<{ mappings: MergedRow[] }>("/api/v1/agents/accounting/mcc-mappings"),
        apiFetch<{ accounts: GlRow[] }>("/api/v1/agents/accounting/gl-accounts"),
      ]);
      setRows(m.mappings);
      setGls(g.accounts.filter((a) => a.active));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const override = async (mcc: string, glAccountId: string) => {
    setBusy(true); setErr(null);
    try {
      await apiFetch("/api/v1/agents/accounting/mcc-mappings", {
        method: "POST",
        body: JSON.stringify({ mcc, gl_account_id: glAccountId }),
      });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const removeOverride = async (id: string) => {
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/api/v1/agents/accounting/mcc-mappings/${id}`, { method: "DELETE" });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const filtered = rows.filter((r) =>
    filter.length === 0 ||
    r.mcc.includes(filter) ||
    (r.description ?? "").toLowerCase().includes(filter.toLowerCase()) ||
    (r.catalog_default?.gl_name ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <Shell title="MCC mappings">
      <Breadcrumbs />

      <Card style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
          MCCs (Merchant Category Codes) route settled card transactions to GL accounts. The ZeniPay
          catalog covers 41 common MCCs. Add an <strong style={{ color: TEXT }}>override</strong> to
          point a specific MCC to one of your own GL accounts — useful when you want <em>OpenAI charges</em> booked
          to 6810 instead of the default 6800.
        </p>
      </Card>

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search MCC / description / GL name"
          style={{
            width: "100%", padding: "8px 12px", fontSize: 13,
            border: `1px solid ${BORDER}`, borderRadius: 10,
            color: TEXT, background: "#fff", outline: "none",
          }}
        />
      </Card>

      <Card>
        {loading ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p>
        ) : gls.length === 0 ? (
          <div style={{ padding: "20px 8px" }}>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 10px" }}>
              You need to set up a chart of accounts before overriding MCC mappings.
            </p>
            <Link
              href="/agents/accounting/chart-of-accounts"
              style={{ color: ZP_GREEN, fontWeight: 700, fontSize: 13, textDecoration: "none" }}
            >
              Go to chart of accounts →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>No MCC matches the filter.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 6px" }}>MCC</th>
                <th style={{ padding: "8px 6px" }}>Category</th>
                <th style={{ padding: "8px 6px" }}>Catalog default</th>
                <th style={{ padding: "8px 6px" }}>Your override</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <MccRow
                  key={r.mcc}
                  row={r}
                  gls={gls}
                  busy={busy}
                  onOverride={(glId) => override(r.mcc, glId)}
                  onRemove={() => r.org_mapping && removeOverride(r.org_mapping.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Shell>
  );
}

function MccRow({
  row, gls, busy, onOverride, onRemove,
}: {
  row: MergedRow;
  gls: GlRow[];
  busy: boolean;
  onOverride: (glId: string) => void;
  onRemove: () => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState("");
  const hasOverride = row.org_mapping && !row.org_mapping.is_default;

  return (
    <tr style={{ borderTop: `1px solid ${ROW_SEP}` }}>
      <td style={{ padding: "10px 6px", fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>{row.mcc}</td>
      <td style={{ padding: "10px 6px", color: TEXT, maxWidth: 280 }}>{row.description ?? "—"}</td>
      <td style={{ padding: "10px 6px", color: MUTED, fontSize: 12 }}>
        {row.catalog_default ? (
          <>
            <span style={{ fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>{row.catalog_default.gl_code}</span>
            {" "}· {row.catalog_default.gl_name}
          </>
        ) : "—"}
      </td>
      <td style={{ padding: "10px 6px" }}>
        {hasOverride && row.org_mapping ? (
          <span style={{ fontSize: 12 }}>
            <span style={{ fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>{row.org_mapping.gl_code}</span>
            {" "}<span style={{ color: MUTED }}>· {row.org_mapping.gl_name}</span>
          </span>
        ) : selecting ? (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <select
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              style={{ padding: "6px 8px", fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff" }}
            >
              <option value="">Pick GL account…</option>
              {gls.map((g) => (
                <option key={g.id} value={g.id}>{g.code} · {g.name}</option>
              ))}
            </select>
            <button
              onClick={() => chosen && onOverride(chosen)}
              disabled={!chosen || busy}
              style={{ padding: "4px 10px", borderRadius: 8, background: ZP_GREEN, color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: chosen && !busy ? "pointer" : "default", opacity: chosen && !busy ? 1 : 0.5 }}
            >
              Save
            </button>
            <button
              onClick={() => { setSelecting(false); setChosen(""); }}
              style={{ padding: "4px 8px", background: "transparent", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}
            >
              cancel
            </button>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: LIGHT }}>—</span>
        )}
      </td>
      <td style={{ padding: "10px 6px", textAlign: "right" }}>
        {hasOverride ? (
          <button
            onClick={onRemove}
            disabled={busy}
            style={{ padding: "4px 10px", borderRadius: 8, background: "transparent", border: "1px solid #DC2626", color: "#DC2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Remove override
          </button>
        ) : !selecting ? (
          <button
            onClick={() => setSelecting(true)}
            disabled={busy}
            style={{ padding: "4px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${ZP_GREEN}`, color: ZP_GREEN, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Override
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function Breadcrumbs() {
  return (
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
      <Link href="/agents/accounting" style={{ color: MUTED, textDecoration: "none" }}>Accounting</Link>
      {" · "}
      <span style={{ color: TEXT, fontWeight: 700 }}>MCC mappings</span>
    </div>
  );
}
