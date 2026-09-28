"use client";

import { useState } from "react";
import { AuthCard, authInput, authButton } from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r?.ok) setDone(j.message || "Courriel envoyé.");
    else setErr(j.error || "Envoi impossible, réessayez.");
  };

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Entrez le courriel de votre compte. Vous recevrez un lien pour choisir un nouveau mot de passe.">
      {done ? (
        <p style={{ fontSize: 14, color: "#166534", background: "#DCFCE7", padding: 12, borderRadius: 12, margin: 0 }}>{done}</p>
      ) : (
        <form onSubmit={submit}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" autoComplete="email" style={authInput} />
          {err && <p style={{ color: "#DC2626", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
          <button type="submit" disabled={busy} style={{ ...authButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
