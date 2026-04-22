// /agents/login — enter an email, provision an org, store session, jump to dashboard.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PAGE_BG, CARD_BG, BORDER, TEXT, MUTED, ZP_GRAD, ZP_GREEN } from "@/components/agents/theme";
import { readSession, writeSession } from "../_lib/session";

export default function AgentsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = readSession();
    if (s) router.replace("/agents/dashboard");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/agents/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, organizationName: orgName || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "provision failed");
      writeSession({ organizationId: data.organization_id, email, userId: data.user_id });
      router.replace("/agents/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: ZP_GRAD,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 20,
            marginBottom: 16,
          }}
        >
          Z
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.12em",
            fontWeight: 800,
            background: ZP_GRAD,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ZENIPAY AGENTS
        </p>
        <h1 style={{ margin: "6px 0 6px", fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", color: TEXT }}>
          Open the wallet console
        </h1>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
          Enter your email — we&apos;ll provision an organization and drop you into the sandbox dashboard.
        </p>

        <form onSubmit={submit}>
          <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>EMAIL</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              fontSize: 14,
              outline: "none",
              margin: "6px 0 14px",
              boxSizing: "border-box",
              background: "#f8fafc",
              color: TEXT,
            }}
          />

          <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>
            ORGANIZATION NAME (optional)
          </label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme AI Labs"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              fontSize: 14,
              outline: "none",
              margin: "6px 0 18px",
              boxSizing: "border-box",
              background: "#f8fafc",
              color: TEXT,
            }}
          />

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(220,38,38,0.08)",
                color: "#DC2626",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#94a3b8" : ZP_GRAD,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Provisioning…" : `Enter dashboard →`}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 11, color: MUTED, textAlign: "center" }}>
          <Link href="/app/overview" style={{ color: ZP_GREEN, textDecoration: "none", fontWeight: 700 }}>
            ← Back to merchant dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
