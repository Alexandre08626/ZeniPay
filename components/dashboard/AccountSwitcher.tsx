"use client";

// Account switcher in the top-bar menu: other merchant accounts signed in
// on this browser, one click to switch (no password), and "add account".

import React, { useEffect, useState } from "react";
import { Check, Plus, Building2 } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

interface Acc { merchant_id: string; name: string; email: string; current: boolean }

export function AccountSwitcher() {
  const [accounts, setAccounts] = useState<Acc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/zenipay/accounts/switch", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((j) => setAccounts(Array.isArray(j.accounts) ? j.accounts : []))
      .catch(() => setAccounts([]));
  }, []);

  const switchTo = async (a: Acc) => {
    setBusy(a.merchant_id); setErr(null);
    const r = await fetch("/api/zenipay/accounts/switch", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: a.merchant_id }),
    }).catch(() => null);
    if (!r || !r.ok) {
      const j = r ? await r.json().catch(() => ({})) : {};
      setErr(j.error || "Changement impossible.");
      setBusy(null);
      return;
    }
    try {
      sessionStorage.setItem("zp_client", a.merchant_id);
      sessionStorage.setItem("zp_client_email", a.email);
      sessionStorage.setItem("zp_client_bname", a.name);
      sessionStorage.removeItem("zp_orvel_chat");
    } catch { /* ignore */ }
    window.location.href = "/app/overview";
  };

  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: zp.radius.sm,
    background: "transparent", border: "none", textAlign: "left", cursor: "pointer", color: zp.text.primary, fontSize: 13,
  };

  return (
    <div style={{ padding: "4px 0 6px", borderBottom: `1px solid ${zp.surface.border}`, marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px" }}>
        Comptes
      </div>
      {accounts === null && <div style={{ fontSize: 12, color: zp.text.muted, padding: "6px 10px" }}>…</div>}
      {accounts?.map((a) => (
        <button key={a.merchant_id} type="button" role="menuitem" disabled={a.current || !!busy} onClick={() => switchTo(a)} style={{ ...row, cursor: a.current ? "default" : "pointer" }}>
          <Building2 size={14} color={a.current ? zp.brand.cyan : zp.text.muted} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: a.current ? zp.weight.semibold : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <span style={{ display: "block", fontSize: 11, color: zp.text.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</span>
          </span>
          {a.current ? <Check size={14} color={zp.brand.cyan} /> : busy === a.merchant_id ? <span style={{ fontSize: 11, color: zp.text.muted }}>…</span> : null}
        </button>
      ))}
      <a href="/login?add=1" role="menuitem" style={{ ...row, textDecoration: "none", color: zp.brand.cyan }}>
        <Plus size={14} /> Ajouter un compte
      </a>
      {err && <div style={{ fontSize: 11, color: zp.semantic.danger, padding: "4px 10px" }}>{err}</div>}
    </div>
  );
}

export default AccountSwitcher;
