// /legal/privacy — Agents-product privacy placeholder.
// Kept intentionally narrow and factual for the investor-meeting push.
// Production SOC2 evidence will replace this with a counsel-reviewed version.

"use client";

import Link from "next/link";
import MarketingShell from "../../components/MarketingShell";
import {
  color, spacing, radius,
  font, fontSize, fontWeight,
} from "@/lib/design-system/tokens";

export default function PrivacyPage() {
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
          Privacy notice
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

        <Section title="Who we are">
          ZeniPay Agents is an operational product of ILM Inc. (&ldquo;ZeniPay&rdquo;,
          &ldquo;we&rdquo;), a company incorporated in Québec, Canada. We own the
          platform described at zenipay.ca and process personal data as a controller
          when collecting leads and as a processor on behalf of our customers for
          the platform&rsquo;s banking functionality.
        </Section>

        <Section title="What we collect from public site visitors">
          <p>When you use our marketing site we collect:</p>
          <ul>
            <li>Information you submit in forms (email, company, role, message).</li>
            <li>Standard server logs: IP address hint, user agent, timestamp.</li>
            <li>Essential cookies for session continuity. No third-party advertising trackers.</li>
          </ul>
          <p>
            We never sell, rent, or share this data with third parties for marketing
            purposes. We use it only to respond to your request and assess platform
            fit.
          </p>
        </Section>

        <Section title="What we process for Agents customers">
          <p>
            When a customer operates the Agents platform, we process the information
            required to deliver the service: payment authorizations, card data (via
            our issuing partner), user identities tied to approval workflows, and
            the contents of the audit log.
          </p>
          <p>
            Sensitive secrets (TOTP seeds, audit-signing keys) are encrypted at rest
            in Supabase Vault using AES-256-GCM. Plaintext never touches our
            application tier.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can request access, rectification, or deletion of personal data we
            hold about you at any time by writing to{" "}
            <a href="mailto:info@zeniva.ca" style={linkStyle}>info@zeniva.ca</a>.
            Canadian residents can also contact the Québec Commission d&rsquo;accès
            à l&rsquo;information for regulatory complaints.
          </p>
        </Section>

        <Section title="Data retention">
          Public-site lead data is retained for up to 24 months after last contact.
          Production customer audit data is retained per the customer&rsquo;s own
          data-retention policy, subject to regulatory minimums (typically 7 years
          for financial records).
        </Section>

        <Section title="Contact">
          Questions or concerns: <a href="mailto:info@zeniva.ca" style={linkStyle}>info@zeniva.ca</a>.
          Security issues: <a href="mailto:security@zeniva.ca" style={linkStyle}>security@zeniva.ca</a>.
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
            <Link href="/legal/terms" style={linkStyle}>Terms of service</Link>
            {" · "}
            <Link href="/security" style={linkStyle}>Security &amp; compliance</Link>
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
