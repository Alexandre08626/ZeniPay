// /security — investor-facing security + compliance posture.
// Hits SOC2, the signed audit export, Vault, Ed25519, RLS, approval workflow.

"use client";

import Link from "next/link";
import MarketingShell from "../components/MarketingShell";
import {
  color, spacing, radius, shadow,
  font, fontSize, fontWeight, gradientSignature,
} from "@/lib/design-system/tokens";

export default function SecurityPage() {
  return (
    <MarketingShell active="security">
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing[9]} ${spacing[5]} ${spacing[6]}` }}>
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: spacing[3],
            }}
          >
            Security & Compliance
          </div>
          <h1
            style={{
              fontFamily: font.serif,
              fontSize: "clamp(40px, 6vw, 64px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
            }}
          >
            Built for auditors{" "}
            <span
              style={{
                backgroundImage: gradientSignature,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              from day one.
            </span>
          </h1>
          <p
            style={{
              marginTop: spacing[5],
              fontFamily: font.sans,
              fontSize: fontSize.lg.size,
              lineHeight: fontSize.lg.line,
              color: color.textBody,
            }}
          >
            Every production surface in ZeniPay Agents was designed so an auditor could
            verify it offline without trusting us. Signed audit exports, tamper-evident
            Merkle trees, TOTP step-up on approvals, encrypted-at-rest secrets in Supabase
            Vault, and row-level security on every table.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing[4]} ${spacing[5]} ${spacing[9]}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing[4] }}>
          {[
            { label: "SOC2 Type II", value: "Target Q3 2026", desc: "Evidence collection is built into the product — every sensitive action writes to an append-only, triggered-immutable audit log." },
            { label: "Encryption at rest", value: "AES-256 Vault", desc: "All TOTP seeds + signing keys live in Supabase Vault. Application code never touches plaintext." },
            { label: "Audit signing key", value: "Ed25519", desc: "Global keypair, rotatable. Published SPKI at /.well-known/audit-signing-key.pub for offline verification." },
            { label: "Row-level security", value: "Always on", desc: "Every agents.* table has RLS. Service-role writes; authenticated users read scoped to their org membership." },
            { label: "Approval step-up", value: "TOTP (RFC 6238)", desc: "Compatible with Google Authenticator, 1Password, Authy. Optional dual-control on sensitive policies." },
            { label: "Fraud detection", value: "Every 15 minutes", desc: "Welford rolling 30-day baselines across org / card / agent scopes. Z-score above 3 raises; above 6 auto-pauses." },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: color.white,
                border: `1px solid ${color.border}`,
                borderRadius: radius.md,
                padding: spacing[5],
                boxShadow: shadow.sm,
              }}
            >
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.xs.size,
                  fontWeight: fontWeight.semibold,
                  color: color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: spacing[2],
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.h5.size,
                  lineHeight: fontSize.h5.line,
                  letterSpacing: fontSize.h5.tracking,
                  fontWeight: fontWeight.semibold,
                  color: color.textHeading,
                  marginBottom: spacing[2],
                }}
              >
                {c.value}
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: font.sans,
                  fontSize: fontSize.sm.size,
                  lineHeight: fontSize.sm.line,
                  color: color.textBody,
                }}
              >
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: `${spacing[9]} ${spacing[5]}`, background: color.surface, borderTop: `1px solid ${color.border}` }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: font.serif,
              fontSize: fontSize.h3.size,
              lineHeight: fontSize.h3.line,
              letterSpacing: fontSize.h3.tracking,
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
              marginBottom: spacing[4],
            }}
          >
            Verify an audit export yourself.
          </h2>
          <p
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.lg.size,
              lineHeight: fontSize.lg.line,
              color: color.textBody,
              margin: 0,
              marginBottom: spacing[5],
            }}
          >
            Auditors receive a streamed NDJSON file. Re-hash the entries with canonical JSON,
            rebuild the Merkle tree, compare the root against the signed trailer, then verify
            the Ed25519 signature with our published public key. No network calls, no trust
            in our infra at verification time.
          </p>
          <div
            style={{
              background: color.white,
              border: `1px solid ${color.border}`,
              borderRadius: radius.md,
              padding: spacing[4],
              fontFamily: font.mono,
              fontSize: fontSize.xs.size,
              lineHeight: 1.6,
              color: color.textBody,
              overflowX: "auto",
            }}
          >
            <div style={{ color: color.textMuted }}># Fetch the public key</div>
            <div>curl -s https://zenipay.ca/.well-known/audit-signing-key.pub &gt; zp.pub</div>
            <div style={{ marginTop: spacing[2], color: color.textMuted }}># Verify the trailer signature (auditor-side tooling)</div>
            <div>zp-verify --file export_q1_2026.ndjson --key zp.pub</div>
            <div style={{ marginTop: spacing[2], color: color.success }}>✓ Signed by zp_audit_v1. Merkle root matches. 1,247 entries.</div>
          </div>
          <div style={{ marginTop: spacing[5], display: "flex", gap: spacing[3], flexWrap: "wrap" }}>
            <Link
              href="/.well-known/audit-signing-key.pub"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: `${spacing[3]} ${spacing[5]}`,
                borderRadius: radius.sm,
                background: color.textHeading,
                color: color.white,
                textDecoration: "none",
                fontFamily: font.sans,
                fontSize: fontSize.sm.size,
                fontWeight: fontWeight.semibold,
                boxShadow: shadow.sm,
              }}
            >
              View public signing key
            </Link>
            <Link
              href="/contact"
              style={{
                padding: `${spacing[3]} ${spacing[5]}`,
                borderRadius: radius.sm,
                background: color.white,
                color: color.textHeading,
                border: `1px solid ${color.border}`,
                textDecoration: "none",
                fontFamily: font.sans,
                fontSize: fontSize.sm.size,
                fontWeight: fontWeight.medium,
              }}
            >
              Request the auditor kit
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
