// Admin allowlist gate. Wraps every /admin/* page. Pulls the email
// from the merchant session (sessionStorage zp_client_email) and
// only renders children when it matches one of the hardcoded
// allowlisted addresses. Anyone else gets a tasteful 403 surface
// pointing them back to /app/overview.

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ShieldOff } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

const ALLOWLIST = new Set([
  "zenipay@zeniva.ca",
  "info@zeniva.ca",
  "alexandreblais26@gmail.com",
]);

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const email = (sessionStorage.getItem("zp_client_email") || "").trim().toLowerCase();
    setState(ALLOWLIST.has(email) ? "ok" : "denied");
  }, []);

  if (state === "checking") {
    return (
      <div style={{ padding: "60px 20px", color: zp.text.muted, fontSize: 13, textAlign: "center" }}>
        Verifying admin access…
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <ShieldOff size={32} color={zp.semantic.danger} />
        <h2 style={{ margin: "12px 0 6px", fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Admin access required
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: zp.text.muted }}>
          You aren&apos;t on the ZeniPay admin allowlist. Sign in with the right account or head back to your dashboard.
        </p>
        <Link href="/app/overview" style={{
          display: "inline-flex", padding: "10px 18px", borderRadius: zp.radius.sm,
          background: zp.gradient.main, color: "#fff", fontSize: 13,
          fontWeight: zp.weight.semibold, textDecoration: "none",
        }}>
          Back to dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
