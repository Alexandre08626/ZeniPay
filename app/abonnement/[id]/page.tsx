"use client";
// Page de paiement d'un abonnement Orvel (forfait mensuel) — habillage ZeniPay, marchand payé : Zenitech : carte saisie dans le formulaire sécurisé de Finix,
// consentement explicite au prélèvement mensuel, puis retour vers Orvel.
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";

declare global { interface Window { Finix?: any } }

const FINIX_APP_ID = process.env.NEXT_PUBLIC_FINIX_APPLICATION_ID || "APtwKWGqFSEfsecvWcphUgbR";
const FINIX_ENV = process.env.NEXT_PUBLIC_FINIX_ENV === "production" ? "live" : "sandbox";
const FINIX_MERCHANT_ID = process.env.NEXT_PUBLIC_FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc";

type Info = {
  id: string; plan_nom: string; status: string; amount: number; tps: number; tvq: number; total: number;
  name: string; email: string; card_last4: string | null; current_period_end: string | null; return_url: string; locked: boolean;
};
const money = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const ZP_DARK = "linear-gradient(150deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)";
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "");


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

  // ── Rendu : même habillage que la page de paiement ZeniPay (/pay/…) ──
  // Produit = Orvel AI ; marchand payé = Zenitech ; processeur = ZeniPay.
  const shell = (children: React.ReactNode) => (
    <main style={{ minHeight: "100vh", background: ZP_DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <ZeniPayLogo size={38} showWordmark />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>🔒 PAIEMENT SÉCURISÉ</span>
        </div>
        {children}
      </div>
    </main>
  );
  const whiteCard: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: "24px 22px", boxShadow: "0 8px 48px rgba(0,0,0,0.3)", color: "#0D1B3A" };

  if (err && !info) return shell(<div style={whiteCard}><h2 style={{ marginTop: 0 }}>Oups</h2><p>{err}</p></div>);
  if (!info) return shell(<div style={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>Chargement…</div>);
  if (done) return shell(
    <div style={{ ...whiteCard, textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>🎉</div>
      <h2 style={{ margin: "8px 0" }}>Bienvenue dans Orvel {info.plan_nom} !</h2>
      <p style={{ color: "#475569" }}>Paiement accepté (carte •••• {done.last4}). Ton reçu part par courriel. Prochain prélèvement le {dateFr(done.end)}.</p>
      <p style={{ color: "#94A3B8" }}>Retour vers Orvel…</p>
    </div>
  );

  const pastDue = info.status === "past_due";
  const glass: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "16px 18px", marginBottom: 14 };
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 };
  const line: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "rgba(255,255,255,0.75)" };

  return shell(<>
    {/* Qui est payé */}
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 14 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/merchants/zenitech-112.webp" alt="Zenitech" width={52} height={52} style={{ borderRadius: 14, background: "#000", flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={label}>Payer à</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Zenitech</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Technologie · zenitech.dev</div>
      </div>
    </div>

    {/* Pour quoi */}
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 12 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/orvel/orvel-mark-64.webp" alt="Orvel AI" width={40} height={40} style={{ borderRadius: "50%", background: "#000", flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={label}>Pour</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Orvel AI — Forfait {info.plan_nom}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{info.name} · {info.email}</div>
      </div>
    </div>

    {/* Montant */}
    <div style={{ ...glass, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
          {pastDue ? "À PAYER MAINTENANT" : "TOTAL AUJOURD’HUI"}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>
          {money(info.total)}
        </div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4 }}>puis {money(info.total)} / mois</div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 14, paddingTop: 10 }}>
        <div style={line}><span>Forfait {info.plan_nom} — 1 mois</span><span>{money(info.amount)}</span></div>
        {info.tps > 0 && <div style={line}><span>TPS (5 %)</span><span>{money(info.tps)}</span></div>}
        {info.tvq > 0 && <div style={line}><span>TVQ (9,975 %)</span><span>{money(info.tvq)}</span></div>}
      </div>
    </div>

    {/* Paiement */}
    <div style={whiteCard}>
      {!payable ? (
        <p style={{ margin: 0 }}>{info.locked ? "Trop d’essais refusés sur cette page. Recommence à partir d’Orvel." : info.status === "active" ? "Cet abonnement est déjà actif. 👍" : "Cette page n’est plus valide. Recommence à partir d’Orvel."}</p>
      ) : (<>
        <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 14px" }}>{pastDue ? "Mettre à jour ta carte" : "Carte de crédit"}</h2>
        <div id="finix-form" style={{ minHeight: 150 }} />
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: "#475569", lineHeight: 1.5, marginTop: 8 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>J’autorise <b>Zenitech</b> à prélever, par ZeniPay, <b>{money(info.total)}</b> sur cette carte aujourd’hui, puis chaque mois à la même date, pour mon forfait Orvel {info.plan_nom}, jusqu’à ce que j’annule (dans Orvel : Mon profil → Mon forfait). Annulation en tout temps, sans frais ; le forfait reste actif jusqu’à la fin du mois payé.</span>
        </label>
        {err && <p style={{ color: "#DC2626", fontSize: 14 }}>{err}</p>}
        <button onClick={pay} disabled={!ready || busy} style={{
          width: "100%", marginTop: 14, padding: "15px 18px", borderRadius: 12, border: 0, background: ZP_GRAD,
          opacity: busy || !ready ? 0.6 : 1, color: "#fff", fontWeight: 800, fontSize: 16, cursor: busy || !ready ? "default" : "pointer",
        }}>
          {busy ? "Paiement en cours…" : !ready ? "Chargement du paiement sécurisé…" : `Payer ${money(info.total)} et m’abonner`}
        </button>
        <p style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "center", margin: "12px 0 0" }}>
          🔒 Carte saisie directement chez Finix, le processeur de ZeniPay. Ni Orvel, ni Zenitech, ni ZeniPay ne voient ton numéro de carte.
        </p>
      </>)}
    </div>

    <div style={{ textAlign: "center", marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <a href={info.return_url.split("?")[0]} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>← Retour à Orvel sans payer</a>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.06em" }}>Propulsé par ZeniPay · Paiement sécurisé</span>
    </div>
  </>);
}
