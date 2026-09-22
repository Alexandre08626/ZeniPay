"use client";
// Lead form for the Google Ads landing page. Posts to /api/contact
// (public.zenipay_access_requests) with source "lp-google-ads", then fires
// the Google Ads conversion event when NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION
// is set (format: "AW-XXXXXXXXX/abcDEFghi").
import { useState } from "react";
import zp from "@/lib/design-system/zenipay-brand";

type Status = "idle" | "submitting" | "ok" | "error";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const VOLUMES = ["Under $10k / month", "$10k – $100k / month", "$100k – $1M / month", "$1M+ / month"] as const;

export default function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid work email.");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          company: String(fd.get("company") ?? ""),
          role: String(fd.get("role") ?? ""),
          agent_fleet_size: String(fd.get("volume") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""), // honeypot
          source: "lp-google-ads",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? "Something went wrong. Email us at info@zeniva.ca.");
        setStatus("error");
        return;
      }
      setStatus("ok");
      const sendTo = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION;
      if (sendTo && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "conversion", { send_to: sendTo });
      }
    } catch {
      setError("Network error. Email us at info@zeniva.ca.");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
        <div style={{ fontFamily: zp.font.display, fontSize: 24, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 8 }}>
          Request received
        </div>
        <p style={{ color: zp.text.muted, fontSize: 15, lineHeight: 1.6, margin: "0 0 18px" }}>
          A ZeniPay specialist will reach out within one business day. Want to start now? Open your account in 5 minutes.
        </p>
        <a href="/register?type=business" style={primaryBtn}>Open a business account →</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={card} noValidate>
      <div style={{ fontFamily: zp.font.display, fontSize: 24, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 4 }}>
        Talk to a specialist
      </div>
      <p style={{ color: zp.text.muted, fontSize: 14, margin: "0 0 18px" }}>
        Free walkthrough. Bilingual team (EN / FR). Reply within one business day.
      </p>
      <label style={label}>Work email *</label>
      <input name="email" type="email" required placeholder="you@company.com" autoComplete="email" style={input} />
      <label style={label}>Company</label>
      <input name="company" placeholder="Company name" autoComplete="organization" style={input} />
      <label style={label}>Your role</label>
      <input name="role" placeholder="Founder, CFO, Controller…" autoComplete="organization-title" style={input} />
      <label style={label}>Monthly payment volume</label>
      <select name="volume" defaultValue="" style={input}>
        <option value="" disabled>Select a range</option>
        {VOLUMES.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <label style={label}>What are you looking for? (optional)</label>
      <textarea name="message" rows={3} placeholder="Accept card payments, pay contractors, automate bookkeeping…" style={{ ...input, resize: "vertical" }} />
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, opacity: 0 }} />
      {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <button type="submit" disabled={status === "submitting"} style={{ ...primaryBtn, width: "100%", opacity: status === "submitting" ? 0.7 : 1 }}>
        {status === "submitting" ? "Sending…" : "Request my free walkthrough"}
      </button>
      <p style={{ fontSize: 12, color: zp.text.dim, textAlign: "center", margin: "12px 0 0" }}>
        No spam, no sales pressure. Unsubscribe any time.
      </p>
    </form>
  );
}

const card: React.CSSProperties = {
  position: "relative",
  background: "#fff",
  borderRadius: zp.radius.xl,
  padding: 28,
  boxShadow: "0 24px 60px rgba(10,11,31,0.14)",
  border: `1px solid ${zp.surface.border}`,
  textAlign: "left",
  color: zp.text.primary,
};
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, margin: "0 0 6px" };
const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: zp.radius.md,
  border: `1px solid ${zp.surface.border}`,
  background: "#fff",
  fontSize: 15,
  marginBottom: 14,
  color: zp.text.primary,
  fontFamily: zp.font.sans,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: zp.gradient.main,
  color: "#fff",
  padding: "14px 24px",
  borderRadius: zp.radius.sm,
  fontSize: 15,
  fontWeight: zp.weight.semibold,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(21,184,201,0.35)",
};
