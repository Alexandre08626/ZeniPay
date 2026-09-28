"use client";
// Page de paiement d'un abonnement Orvel (forfait mensuel) : carte saisie dans le formulaire sécurisé de Finix,
// consentement explicite au prélèvement mensuel, puis retour vers Orvel.
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

declare global { interface Window { Finix?: any } }

const FINIX_APP_ID = process.env.NEXT_PUBLIC_FINIX_APPLICATION_ID || "APtwKWGqFSEfsecvWcphUgbR";
const FINIX_ENV = process.env.NEXT_PUBLIC_FINIX_ENV === "production" ? "live" : "sandbox";
const FINIX_MERCHANT_ID = process.env.NEXT_PUBLIC_FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc";

type Info = {
  id: string; plan_nom: string; status: string; amount: number; tps: number; tvq: number; total: number;
  name: string; email: string; card_last4: string | null; current_period_end: string | null; return_url: string; locked: boolean;
};
const money = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "");

const box: React.CSSProperties = { maxWidth: 460, margin: "0 auto", padding: "32px 16px 60px", fontFamily: "Inter, system-ui, sans-serif", color: "#14142b" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 10px 40px rgba(20,20,60,.10)", border: "1px solid #ececf4" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0", color: "#555" };

export default function AbonnementPage() {
  const { id } = useParams<{ id: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ end: string | null; last4: string | null } | null>(null);
  const formRef = useRef<any>(null);
  const [fraud, setFraud] = useState("");

  useEffect(() => {
    fetch(`/api/zenipay/subscriptions/info?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Abonnement introuvable"); setInfo(j); })
      .catch((e) => setErr(e.message));
  }, [id]);

  const payable = info && ["incomplete", "past_due"].includes(info.status) && !info.locked;
  useEffect(() => {
    if (!payable) return;
    const s = document.createElement("script");
    s.src = "https://js.finix.com/v/1/finix.js"; s.async = true;
    s.onload = () => {
      if (!window.Finix) return;
      formRef.current = window.Finix.CardTokenForm("finix-form", {
        applicationId: FINIX_APP_ID, environment: FINIX_ENV, showAddress: false, hideFields: ["name"], showLabels: true,
        labels: { number: "Numéro de carte", expiration_date: "Expiration", security_code: "CVC" },
        placeholders: { number: "1234 5678 9012 3456", expiration_date: "MM / AA", security_code: "CVC" },
        onLoad: () => setReady(true),
        styles: { default: { color: "#14142b", border: "1.5px solid #dcdce8", borderRadius: "10px", padding: "10px 12px", fontSize: "15px" },
          focus: { border: "1.5px solid #3d7bff" }, error: { border: "1.5px solid #DC2626", color: "#DC2626" } },
      });
      try { window.Finix.Auth(FINIX_ENV, FINIX_MERCHANT_ID, (k: string) => { if (k) setFraud(k); }); } catch { /* facultatif */ }
    };
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [payable]);

  function pay() {
    if (!consent) { setErr("Coche la case pour autoriser le prélèvement mensuel."); return; }
    if (!formRef.current) return;
    setErr(""); setBusy(true);
    formRef.current.submit(FINIX_ENV, FINIX_APP_ID, async (e: any, res: any) => {
      if (e) { setErr(e?.message || "Vérifie les informations de ta carte."); setBusy(false); return; }
      try {
        const r = await fetch("/api/zenipay/subscriptions/activate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, token: res?.data?.id, consent: true, fraud_session_id: fraud || undefined }),
        });
        const j = await r.json();
        if (!r.ok || !j.success) throw new Error(j.error || "Paiement refusé.");
        setDone({ end: j.current_period_end, last4: j.card_last4 });
        setTimeout(() => { window.location.href = j.return_url; }, 3500);
      } catch (x: any) { setErr(x.message); setBusy(false); }
    });
  }

  if (err && !info) return <main style={box}><div style={card}><h2>Oups</h2><p>{err}</p></div></main>;
  if (!info) return <main style={box}><p>Chargement…</p></main>;
  if (done) return (
    <main style={box}><div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>🎉</div><h2>Bienvenue dans Orvel {info.plan_nom} !</h2>
      <p>Paiement accepté (carte •••• {done.last4}). Ton reçu part par courriel. Prochain prélèvement le {dateFr(done.end)}.</p>
      <p style={{ color: "#777" }}>Retour vers Orvel…</p>
    </div></main>
  );
  const pastDue = info.status === "past_due";
  return (
    <main style={box}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, letterSpacing: ".16em", color: "#3d7bff", fontWeight: 700 }}>ORVEL AI</div>
        <h1 style={{ fontSize: 26, margin: "6px 0" }}>{pastDue ? "Mettre à jour ta carte" : `Forfait ${info.plan_nom}`}</h1>
        <p style={{ color: "#666", margin: 0 }}>{info.name} · {info.email}</p>
      </div>
      <div style={card}>
        <div style={row}><span>Forfait {info.plan_nom} — 1 mois</span><span>{money(info.amount)}</span></div>
        {info.tps > 0 && <div style={row}><span>TPS (5 %)</span><span>{money(info.tps)}</span></div>}
        {info.tvq > 0 && <div style={row}><span>TVQ (9,975 %)</span><span>{money(info.tvq)}</span></div>}
        <div style={{ ...row, color: "#14142b", fontWeight: 700, fontSize: 16, borderTop: "1px solid #eee", marginTop: 6, paddingTop: 10 }}>
          <span>{pastDue ? "À payer maintenant" : "Total aujourd'hui"}</span><span>{money(info.total)}</span>
        </div>
        {!payable ? (
          <p style={{ marginTop: 16 }}>{info.locked ? "Trop d'essais refusés sur cette page. Recommence à partir d'Orvel." : info.status === "active" ? "Cet abonnement est déjà actif. 👍" : "Cette page n'est plus valide. Recommence à partir d'Orvel."}</p>
        ) : (<>
          <div id="finix-form" style={{ marginTop: 18, minHeight: 150 }} />
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#444", lineHeight: 1.5, marginTop: 8 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>J&apos;autorise ZeniPay à prélever <b>{money(info.total)}</b> sur cette carte aujourd&apos;hui, puis chaque mois à la même date, pour mon forfait Orvel {info.plan_nom}, jusqu&apos;à ce que j&apos;annule (dans Orvel : Mon profil → Mon forfait). Annulation en tout temps, sans frais ; le forfait reste actif jusqu&apos;à la fin du mois payé.</span>
          </label>
          {err && <p style={{ color: "#DC2626", fontSize: 14 }}>{err}</p>}
          <button onClick={pay} disabled={!ready || busy} style={{ width: "100%", marginTop: 14, padding: "14px 18px", borderRadius: 12, border: 0, background: busy || !ready ? "#9bb5ff" : "#3d7bff", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            {busy ? "Paiement en cours…" : !ready ? "Chargement du paiement sécurisé…" : `Payer ${money(info.total)} et m'abonner`}
          </button>
          <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginTop: 12 }}>🔒 Carte saisie directement chez notre processeur de paiement (Finix). Ni Orvel ni ZeniPay ne voient ton numéro de carte.</p>
        </>)}
      </div>
      <p style={{ textAlign: "center", marginTop: 16 }}><a href={info.return_url.split("?")[0]} style={{ color: "#777", fontSize: 14 }}>← Retour à Orvel sans payer</a></p>
    </main>
  );
}
