// /legal/terms — Agents-product terms placeholder.
// Minimal and factual. Production contracts (MSA, DPA, BAA if applicable)
// ship separately via /contact.

"use client";

import Link from "next/link";
import MarketingShell from "../../components/MarketingShell";
import {
  color, spacing, radius,
  font, fontSize, fontWeight,
} from "@/lib/design-system/tokens";

export default function TermsPage() {
  const lastUpdated = "April 22, 2026";

  return (
    <MarketingShell>
      <article style={{ maxWidth: 720, margin: "0 auto", padding: `${spacing[9]} ${spacing[5]}` }}>
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
          Legal
        </div>
        <h1
          style={{
            fontFamily: font.serif,
            fontSize: "clamp(32px, 4.5vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            fontWeight: fontWeight.semibold,
            color: color.textHeading,
            margin: 0,
            marginBottom: spacing[3],
          }}
        >
          Terms of service
        </h1>
        <p
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.sm.size,
            color: color.textMuted,
            margin: 0,
            marginBottom: spacing[6],
          }}
        >
          Last updated {lastUpdated}
        </p>

        <Section title="Acceptance">
          By accessing zenipay.ca or the ZeniPay Agents platform, you agree to these
          terms. If you operate the platform on behalf of a company, you represent
          that you have authority to bind that company.
        </Section>

        <Section title="The Service">
          ZeniPay Agents provides banking infrastructure for AI agents, including
          virtual card issuance, multi-currency treasury management, expense
          categorization, approval workflows, fraud detection, and SOC2-grade
          audit exports. Features available to a given account depend on the
          signed order form.
        </Section>

        <Section title="Customer responsibilities">
          <ul>
            <li>Keep your API keys and session credentials confidential.</li>
            <li>Only load the platform with funds you have the authority to move.</li>
            <li>
              Comply with applicable laws (AML/KYC, sanctions, export controls) in
              your jurisdiction.
            </li>
            <li>
              Supervise autonomous agents that transact on your behalf. You are
              responsible for the policies attached to each agent.
            </li>
          </ul>
        </Section>

        <Section title="Fees">
          Usage is metered and billed monthly per the schedule in your order form
          or per the published pricing at{" "}
          <Link href="/pricing" style={linkStyle}>zenipay.ca/pricing</Link>.
          We notify you at least 30 days before any fee change.
        </Section>

        <Section title="Service availability">
          We target 99.99% uptime on production APIs. Scheduled maintenance windows
          are announced in advance. Service credits on enterprise plans are
          described in the order form.
        </Section>

        <Section title="Confidentiality">
          Both parties will protect confidential information disclosed under the
          relationship. Audit evidence exports you generate belong to your
          company; we do not retain the generated NDJSON payload beyond delivery.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent permitted by applicable law, neither party will
          be liable for indirect, consequential, or special damages. Our total
          liability is capped at the fees paid in the 12 months preceding the
          event giving rise to the claim.
        </Section>

        <Section title="Termination">
          Either party may terminate for material breach on 30 days&rsquo; notice,
          or immediately if required by law. On termination we provide a final
          audit export covering the full account history at your request.
        </Section>

        <Section title="Governing law">
          Québec (Canada) law governs, without regard to conflict-of-laws
          principles. Exclusive jurisdiction lies with the courts of Montréal.
        </Section>

        <div style={{ marginTop: spacing[8], padding: spacing[5], background: color.surface, borderRadius: radius.md, border: `1px solid ${color.border}` }}>
          <p
            style={{
              margin: 0,
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              color: color.textBody,
            }}
          >
            See also:{" "}
            <Link href="/legal/privacy" style={linkStyle}>Privacy notice</Link>
            {" · "}
            <Link href="/security" style={linkStyle}>Security posture</Link>
          </p>
        </div>
      </article>
    </MarketingShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spacing[6] }}>
      <h2
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.h6.size,
          lineHeight: fontSize.h6.line,
          letterSpacing: fontSize.h6.tracking,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          margin: 0,
          marginBottom: spacing[3],
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.base.size,
          lineHeight: fontSize.base.line,
          color: color.textBody,
        }}
      >
        {typeof children === "string" ? <p style={{ margin: 0 }}>{children}</p> : children}
      </div>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  color: color.textHeading,
  fontWeight: fontWeight.semibold,
  textDecoration: "underline",
  textDecorationColor: color.border,
};
