"use client";

import { useEffect, useState } from "react";
import { AuthCard, authInput, authButton } from "@/components/auth/AuthCard";

const MIN = 10;

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
    // Keep the token out of the address bar / history once read.
    if (t) window.history.replaceState(null, "", "/reset-password");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < MIN) { setErr(`Au moins ${MIN} caractères.`); return; }
    if (pw !== pw2) { setErr("Les deux mots de passe ne sont pas identiques."); return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r?.ok) setDone(true);
    else setErr(j.error || "Impossible d'enregistrer, réessayez.");
  };

  if (!token && !done) {
    return (
      <AuthCard title="Lien invalide" subtitle="Ce lien de réinitialisation est incomplet ou a déjà été utilisé.">
        <a href="/forgot-password" style={{ ...authButton, display: "block", textAlign: "center", textDecoration: "none" }}>Demander un nouveau lien</a>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={done ? "Mot de passe changé" : "Nouveau mot de passe"} subtitle={done ? undefined : `Choisissez un mot de passe d'au moins ${MIN} caractères.`}>
      {done ? (
        <a href="/login" style={{ ...authButton, display: "block", textAlign: "center", textDecoration: "none" }}>Se connecter</a>
      ) : (
        <form onSubmit={submit}>
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nouveau mot de passe" autoComplete="new-password" style={authInput} />
          <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirmer" autoComplete="new-password" style={{ ...authInput, marginTop: 10 }} />
          {err && <p style={{ color: "#DC2626", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
          <button type="submit" disabled={busy} style={{ ...authButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
