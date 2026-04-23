// /agents/treasury/fund — PR 8 Money IN flow.
//
// Two-step:
//   1. Choose a verified card source (or "+ Add new card" → Finix.js modal).
//   2. Enter amount + currency, submit → POST /treasury/fund/card.
//   3. On SUCCEEDED → toast + redirect to /agents/ledger.
//      On PENDING → poll /treasury/events every 3s until the matching
//      event's state === 'credited' (timeout after 2 min), then redirect.
//
// Self-contained: imports Shell but keeps every other style inline. Teal
// accent (#15B8C9) for Treasury.

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";

const TEAL = "#15B8C9";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";

interface FundingSource {
  id: string;
  rail: string;
  currency: string;
  label: string;
  status: string;
  finix_last4: string | null;
  is_primary: boolean;
}

type Currency = "CAD" | "USD" | "EUR";

interface FundSuccessResponse {
  success: boolean;
  pending: boolean;
  finix_transfer_id: string;
  finix_state: string;
  event_id?: string;
  tx_group?: string | null;
  funding_state?: string;
  reason?: string | null;
}

export default function TreasuryFundPage() {
  const router = useRouter();
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ funding_sources: FundingSource[] }>("/api/v1/agents/treasury/fund-sources");
      const all = r.funding_sources ?? [];
      setSources(all);
      const verifiedCard = all.find((s) => s.rail === "card" && s.status === "verified");
      if (verifiedCard) {
        setSelectedId(verifiedCard.id);
        setCurrency((verifiedCard.currency as Currency) || "CAD");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };
  useEffect(() => () => stopPolling(), []);

  const startPollingForCredit = (finixTransferId: string) => {
    setPendingTransfer(finixTransferId);
    pollCountRef.current = 0;
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 40) {       // ~2 minutes at 3s interval
        stopPolling();
        setPendingTransfer(null);
        setErr("Funding is still pending after 2 minutes. Check /treasury/history for the live state.");
        return;
      }
      try {
        const r = await apiFetch<{ funding_events: Array<{ external_event_id: string; state: string; tx_group: string | null }> }>(
          "/api/v1/agents/treasury/events?limit=50",
        );
        const hit = (r.funding_events ?? []).find((e) => e.external_event_id === finixTransferId);
        if (hit && hit.state === "credited") {
          stopPolling();
          router.push("/agents/ledger");
        } else if (hit && (hit.state === "rejected" || hit.state === "failed")) {
          stopPolling();
          setPendingTransfer(null);
          setErr(`Funding ${hit.state}. Check /treasury/history for details.`);
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const amountUnits = Number(amount);
    if (!selectedId || !Number.isFinite(amountUnits) || amountUnits <= 0) {
      setErr("Pick a source and enter a positive amount.");
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = `fund-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const res = await apiFetch<FundSuccessResponse>("/api/v1/agents/treasury/fund/card", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          funding_source_id: selectedId,
          amount_units: amountUnits,
          currency,
          idempotency_key: idempotencyKey,
        }),
      });
      if (res.pending) {
        startPollingForCredit(res.finix_transfer_id);
      } else {
        router.push("/agents/ledger");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedCardSources = sources.filter((s) => s.rail === "card" && s.status === "verified");

  return (
    <Shell title="Add funds">
      <div style={{ maxWidth: 640 }}>
        <p style={{ margin: "0 0 18px", color: MUTED, fontSize: 13 }}>
          Top up your organization treasury via a verified funding source. Card SALEs are
          processed through Finix and credited to the ZeniCore ledger when they clear.
        </p>

        {err && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 12,
            background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
            color: "#DC2626", fontSize: 13, fontWeight: 600,
          }}>
            {err}
          </div>
        )}

        {pendingTransfer && (
          <div style={{
            marginBottom: 16, padding: "14px 16px", borderRadius: 12,
            background: "rgba(21,184,201,0.08)", border: `1px solid ${TEAL}55`, color: TEXT,
          }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
              Processing… We&apos;ll credit your treasury within a few seconds.
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>
              Finix transfer <code>{pendingTransfer}</code>. Polling every 3 seconds.
            </p>
          </div>
        )}

        <form onSubmit={submit} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={labelStyle}>Funding source</label>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={linkBtn()}
            >
              + Add new card
            </button>
          </div>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              const s = sources.find((x) => x.id === e.target.value);
              if (s) setCurrency((s.currency as Currency) || "CAD");
            }}
            style={inputStyle()}
            disabled={loading || submitting}
          >
            <option value="">{loading ? "Loading…" : verifiedCardSources.length === 0 ? "No verified cards — add one" : "Select…"}</option>
            {verifiedCardSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · ••{s.finix_last4 ?? "????"} · {s.currency}
              </option>
            ))}
          </select>

          <label style={{ ...labelStyle, marginTop: 18 }}>Amount</label>
          <input
            type="number"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            style={inputStyle()}
            disabled={submitting}
          />

          <label style={{ ...labelStyle, marginTop: 18 }}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            style={inputStyle()}
            disabled={submitting}
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>

          <button
            type="submit"
            disabled={submitting || !selectedId || !amount}
            style={{
              marginTop: 22, width: "100%",
              background: submitting || !selectedId || !amount ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0EA5B9)`,
              color: "#fff", border: "none", borderRadius: 12,
              padding: "14px 22px", fontWeight: 800, fontSize: 15,
              cursor: submitting || !selectedId || !amount ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Charging card…" : `Fund ${amount ? `${amount} ${currency}` : "treasury"}`}
          </button>
        </form>
      </div>

      {addOpen && (
        <AddCardModal
          onClose={() => setAddOpen(false)}
          onSaved={async (newId) => {
            setAddOpen(false);
            await load();
            setSelectedId(newId);
          }}
        />
      )}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddCardModal — Finix.js tokenization form.
//
// Loads https://js.finix.com/v/1/finix.js at mount (no-op if already loaded),
// renders a hosted tokenization form into a div#finix-form, and on submit
// asks Finix.js to produce a TK token. We send the TK to our fund-sources
// endpoint which exchanges it for a PI and registers the source.

// Finix.js global — declared as `any` in app/pay/[id]/page.tsx. We reuse
// that declaration via the ambient module system (TS merges across files).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FinixCardTokenFormHandle = { submit: (env: string, appId: string, cb: (err: unknown, res: { data?: { id?: string } }) => void) => void };

function AddCardModal({ onClose, onSaved }: { onClose: () => void; onSaved: (newId: string) => void }) {
  const [label, setLabel] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [loadingScript, setLoadingScript] = useState(true);
  const [scriptErr, setScriptErr] = useState<string | null>(null);
  const [finixErr, setFinixErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<FinixCardTokenFormHandle | null>(null);

  const APP_ID = process.env.NEXT_PUBLIC_FINIX_APPLICATION_ID || "";
  const ENV = process.env.NEXT_PUBLIC_FINIX_ENV === "production" ? "live" : "sandbox";

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled) return;
      if (!window.Finix || !APP_ID) {
        setScriptErr(
          !APP_ID
            ? "NEXT_PUBLIC_FINIX_APPLICATION_ID is not configured."
            : "Finix.js failed to initialize.",
        );
        setLoadingScript(false);
        return;
      }
      try {
        formRef.current = window.Finix.CardTokenForm("#finix-card-form", {
          applicationId: APP_ID,
          environment: ENV,
          showLabels: true,
          showPlaceholders: true,
        });
        setLoadingScript(false);
      } catch (e) {
        setScriptErr(e instanceof Error ? e.message : String(e));
        setLoadingScript(false);
      }
    };

    if (window.Finix) {
      init();
      return () => { cancelled = true; };
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://js.finix.com"]');
    if (existing) {
      existing.addEventListener("load", init, { once: true });
      return () => { cancelled = true; existing.removeEventListener("load", init); };
    }
    const s = document.createElement("script");
    s.src = "https://js.finix.com/v/1/finix.js";
    s.async = true;
    s.onload = init;
    s.onerror = () => {
      if (!cancelled) {
        setScriptErr("Failed to load Finix.js from js.finix.com.");
        setLoadingScript(false);
      }
    };
    document.head.appendChild(s);
    return () => { cancelled = true; };
  }, [APP_ID, ENV]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinixErr(null);
    if (!formRef.current) {
      setFinixErr("Finix form not ready yet.");
      return;
    }
    if (label.trim().length < 2) {
      setFinixErr("Give the card a label (e.g. 'Corp Visa').");
      return;
    }
    setSubmitting(true);
    formRef.current.submit(ENV, APP_ID, async (err, res) => {
      if (err) {
        setFinixErr("Card validation failed. Check the card details and retry.");
        setSubmitting(false);
        return;
      }
      const tk = res?.data?.id;
      if (!tk || !tk.startsWith("TK")) {
        setFinixErr("Tokenization returned no token.");
        setSubmitting(false);
        return;
      }
      try {
        const saved = await apiFetch<{ funding_source_id: string }>("/api/v1/agents/treasury/fund-sources", {
          method: "POST",
          body: JSON.stringify({ label: label.trim(), currency, finix_token: tk }),
        });
        // Card token was just validated client-side by Finix.js — flip verified.
        await apiFetch(`/api/v1/agents/treasury/fund-sources/${saved.funding_source_id}/verify`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        onSaved(saved.funding_source_id);
      } catch (e) {
        setFinixErr(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 18, color: TEXT }}>Add a funding card</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>Tokenized by Finix.js — card data never touches our servers.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#94A3B8", cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={submit} style={{ padding: 24 }}>
          <label style={labelStyle}>Label</label>
          <input
            style={inputStyle()}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Corp Visa"
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            style={inputStyle()}
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>

          <label style={{ ...labelStyle, marginTop: 16 }}>Card details</label>
          <div
            id="finix-card-form"
            style={{ minHeight: 160, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, background: "#FAFBFC" }}
          />
          {loadingScript && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: MUTED }}>Loading secure Finix.js form…</p>
          )}
          {scriptErr && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#DC2626" }}>
              {scriptErr}
            </p>
          )}
          {finixErr && (
            <div style={{
              marginTop: 12, padding: "10px 12px", borderRadius: 10,
              background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
              color: "#DC2626", fontSize: 12, fontWeight: 700,
            }}>
              {finixErr}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={btnSecondary()}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingScript || !!scriptErr}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 12, border: "none",
                background: submitting || loadingScript ? "#94a3b8" : `linear-gradient(135deg, ${TEAL}, #0EA5B9)`,
                color: "#fff", fontWeight: 800, fontSize: 14,
                cursor: submitting || loadingScript ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Saving…" : "Save card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function labelStyleFn(): React.CSSProperties {
  return { fontSize: 11, fontWeight: 800, color: MUTED, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" };
}
const labelStyle = labelStyleFn();
function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 14, boxSizing: "border-box", background: "#FAFBFC", color: TEXT, outline: "none" };
}
function linkBtn(): React.CSSProperties {
  return { background: "transparent", border: `1px dashed ${TEAL}`, color: TEAL, borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.03em" };
}
function btnSecondary(): React.CSSProperties {
  return { flex: 1, padding: "12px 20px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "#fff", color: TEXT, fontWeight: 700, fontSize: 14, cursor: "pointer" };
}
