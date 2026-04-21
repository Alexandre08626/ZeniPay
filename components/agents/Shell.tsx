// Dashboard shell: sidebar + header + content area. White bg, ZeniPay palette.

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PAGE_BG,
  CARD_BG,
  BORDER,
  TEXT,
  MUTED,
  LIGHT,
  ZP_GRAD,
  ZP_GREEN,
} from "./theme";
import { readSession, clearSession } from "@/app/agents/_lib/session";

const NAV = [
  { href: "/agents/dashboard", label: "Overview", icon: "📊" },
  { href: "/agents/wallets", label: "Wallets", icon: "💼" },
  { href: "/agents/agents", label: "Agents", icon: "🤖" },
  { href: "/agents/transactions", label: "Transactions", icon: "💳" },
  { href: "/agents/api-keys", label: "API Keys", icon: "🔑" },
];

export function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace("/agents/login");
      return;
    }
    setEmail(s.email);
  }, [router]);

  const logout = () => {
    clearSession();
    router.replace("/agents/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: PAGE_BG, color: TEXT }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 232,
          background: CARD_BG,
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <Link href="/agents" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: ZP_GRAD,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
              }}
            >
              Z
            </span>
            <div>
              <div style={{ fontWeight: 900, color: TEXT, letterSpacing: "-0.3px" }}>ZeniPay</div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.1em" }}>AGENTS</div>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: active ? "rgba(45,190,96,0.08)" : "transparent",
                  color: active ? ZP_GREEN : MUTED,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 15 }}>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "14px 14px 16px", borderTop: `1px solid ${BORDER}` }}>
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              background: "#f8fafc",
              border: `1px solid ${BORDER}`,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 700 }}>SIGNED IN</div>
            <div
              style={{
                fontSize: 12,
                color: TEXT,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email || "…"}
            </div>
          </div>
          <Link
            href="/app/overview"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 11,
              color: MUTED,
              textDecoration: "none",
              padding: "8px 10px",
              borderRadius: 8,
              marginBottom: 6,
            }}
          >
            ← Merchant dashboard
          </Link>
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.12)",
              color: "#DC2626",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minHeight: "100vh" }}>
        <header
          style={{
            background: CARD_BG,
            borderBottom: `1px solid ${BORDER}`,
            padding: "0 28px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
            boxShadow: "0 1px 0 rgba(15,23,42,0.03)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: "-0.3px" }}>{title}</h1>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(45,190,96,0.08)",
              color: ZP_GREEN,
              border: "1px solid rgba(45,190,96,0.25)",
              fontWeight: 800,
            }}
          >
            ● AGENTS · PREVIEW
          </span>
        </header>
        <main style={{ padding: "24px 28px" }}>{children}</main>
      </div>
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Metric({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card style={{ borderLeft: `4px solid ${color ?? ZP_GREEN}` }}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          color: MUTED,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontWeight: 900, fontSize: 22, color: TEXT, letterSpacing: "-0.4px" }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: LIGHT }}>{sub}</p>}
    </Card>
  );
}
