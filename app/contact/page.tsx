// /contact — public lead form. POSTs to /api/contact (writes to
// public.zenipay_access_requests). Optional calendly secondary CTA via
// NEXT_PUBLIC_CALENDLY_URL.

"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingShell from "../components/MarketingShell";
import {
  color, spacing, radius, shadow,
  font, fontSize, fontWeight,
} from "@/lib/design-system/tokens";

type Status = "idle" | "submitting" | "ok" | "error";

const FLEET_SIZES = ["1–10 agents", "10–100 agents", "100+ agents", "Not sure yet"] as const;

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const calendly = process.env.NEXT_PUBLIC_CALENDLY_URL;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          company: String(form.get("company") ?? ""),
          role: String(form.get("role") ?? ""),
          agent_fleet_size: String(form.get("agent_fleet_size") ?? ""),
          message: String(form.get("message") ?? ""),
          website: String(form.get("website") ?? ""),    // honeypot
          source: "contact",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        const nested = body?.error?.message;
        setErrorMsg(typeof nested === "string" ? nested : "Something went wrong. Please email us at info@zeniva.ca.");
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please email us at info@zeniva.ca.");
    }
  };

  return (
    <MarketingShell>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing[9]} ${spacing[5]} ${spacing[9]}` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr",
            gap: spacing[8],
          }}
          className="contact-grid"
        >
          <div>
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
              Contact
            </div>
            <h1
              style={{
                fontFamily: font.serif,
                fontSize: "clamp(36px, 5vw, 56px)",
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                fontWeight: fontWeight.semibold,
                color: color.textHeading,
                margin: 0,
                marginBottom: spacing[4],
              }}
            >
              Let's talk about your fleet.
            </h1>
            <p
              style={{
                fontFamily: font.sans,
                fontSize: fontSize.base.size,
                lineHeight: fontSize.base.line,
                color: color.textBody,
                margin: 0,
                marginBottom: spacing[5],
              }}
            >
              Tell us what you're building and who's running the agents. We'll get back
              within one business day.
            </p>

            <div
              style={{
                padding: spacing[5],
                background: color.surface,
                borderRadius: radius.md,
                border: `1px solid ${color.border}`,
              }}
            >
              <h3
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.sm.size,
                  fontWeight: fontWeight.semibold,
                  color: color.textHeading,
                  margin: 0,
                  marginBottom: spacing[2],
                }}
              >
                Prefer email?
              </h3>
              <p
                style={{
                  margin: 0,
                  marginBottom: spacing[3],
                  fontFamily: font.sans,
                  fontSize: fontSize.sm.size,
                  color: color.textBody,
                }}
              >
                Reach out directly at{" "}
                <a
                  href="mailto:info@zeniva.ca"
                  style={{
                    color: color.textHeading,
                    fontWeight: fontWeight.semibold,
                    textDecoration: "underline",
                    textDecorationColor: color.border,
                  }}
                >
                  info@zeniva.ca
                </a>
                . We'd also love a short demo of your agent setup if you have one.
              </p>
              {calendly && (
                <Link
                  href={calendly}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: spacing[2],
                    padding: `${spacing[2]} ${spacing[3]}`,
                    borderRadius: radius.sm,
                    background: color.white,
                    border: `1px solid ${color.border}`,
                    color: color.textHeading,
                    textDecoration: "none",
                    fontFamily: font.sans,
                    fontSize: fontSize.sm.size,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  Book a 30-min call ↗
                </Link>
              )}
            </div>
          </div>

          <div
            style={{
              background: color.white,
              border: `1px solid ${color.border}`,
              borderRadius: radius.md,
              padding: spacing[6],
              boxShadow: shadow.sm,
            }}
          >
            {status === "ok" ? (
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: radius.pill,
                    background: color.successBg,
                    color: color.success,
                    fontSize: 20,
                    fontWeight: fontWeight.bold,
                    marginBottom: spacing[4],
                  }}
                >
                  ✓
                </div>
                <h2
                  style={{
                    fontFamily: font.serif,
                    fontSize: fontSize.h4.size,
                    lineHeight: fontSize.h4.line,
                    letterSpacing: fontSize.h4.tracking,
                    fontWeight: fontWeight.semibold,
                    color: color.textHeading,
                    margin: 0,
                    marginBottom: spacing[3],
                  }}
                >
                  Thanks — we'll be in touch.
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontFamily: font.sans,
                    fontSize: fontSize.base.size,
                    lineHeight: fontSize.base.line,
                    color: color.textBody,
                  }}
                >
                  One of us will reply within one business day. If it's urgent, write us at{" "}
                  <a href="mailto:info@zeniva.ca" style={{ color: color.textHeading, fontWeight: fontWeight.semibold }}>
                    info@zeniva.ca
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <FormField label="Work email" name="email" type="email" required placeholder="you@company.com" />
                <FormField label="Company" name="company" type="text" placeholder="ACME Inc." />
                <FormField label="Your role" name="role" type="text" placeholder="CFO, Head of Ops, etc." />
                <FormFieldSelect
                  label="Agent fleet size"
                  name="agent_fleet_size"
                  options={[...FLEET_SIZES]}
                />
                <FormFieldTextarea
                  label="What are you building?"
                  name="message"
                  rows={4}
                  placeholder="We run ~40 agents across customer support + content pipelines. Looking to consolidate their spend under one treasury…"
                />
                {/* Honeypot — hidden from users, filled only by bots. */}
                <label
                  style={{ position: "absolute", left: "-9999px", height: 0, width: 0, overflow: "hidden" }}
                  aria-hidden="true"
                >
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>

                {status === "error" && errorMsg && (
                  <div
                    style={{
                      marginBottom: spacing[4],
                      padding: `${spacing[3]} ${spacing[4]}`,
                      background: color.dangerBg,
                      color: color.danger,
                      borderRadius: radius.sm,
                      fontFamily: font.sans,
                      fontSize: fontSize.sm.size,
                      fontWeight: fontWeight.medium,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    width: "100%",
                    padding: `${spacing[3]} ${spacing[5]}`,
                    borderRadius: radius.sm,
                    background: status === "submitting" ? color.textMuted : color.textHeading,
                    color: color.white,
                    border: "none",
                    fontFamily: font.sans,
                    fontSize: fontSize.base.size,
                    fontWeight: fontWeight.semibold,
                    cursor: status === "submitting" ? "not-allowed" : "pointer",
                    boxShadow: shadow.md,
                  }}
                >
                  {status === "submitting" ? "Sending…" : "Send request"}
                </button>
                <p
                  style={{
                    marginTop: spacing[3],
                    fontFamily: font.sans,
                    fontSize: fontSize.xs.size,
                    color: color.textMuted,
                  }}
                >
                  We'll never sell or share your contact. See our{" "}
                  <Link href="/legal/privacy" style={{ color: color.textBody, textDecoration: "underline", textDecorationColor: color.border }}>
                    privacy policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .contact-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>
    </MarketingShell>
  );
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------

function FormField({
  label,
  name,
  type,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: spacing[4] }}>
      <span
        style={{
          display: "block",
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          marginBottom: spacing[2],
        }}
      >
        {label}
        {required && <span style={{ color: color.danger, marginLeft: 4 }}>*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
    </label>
  );
}

function FormFieldSelect({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label style={{ display: "block", marginBottom: spacing[4] }}>
      <span
        style={{
          display: "block",
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          marginBottom: spacing[2],
        }}
      >
        {label}
      </span>
      <select name={name} defaultValue="" style={inputStyle}>
        <option value="">Select one…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function FormFieldTextarea({
  label,
  name,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: spacing[4] }}>
      <span
        style={{
          display: "block",
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          marginBottom: spacing[2],
        }}
      >
        {label}
      </span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        style={{ ...inputStyle, resize: "vertical", fontFamily: font.sans }}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing[3]} ${spacing[4]}`,
  borderRadius: radius.xs,
  border: `1px solid ${color.border}`,
  background: color.white,
  fontFamily: font.sans,
  fontSize: fontSize.base.size,
  lineHeight: fontSize.base.line,
  color: color.textHeading,
  outline: "none",
  boxSizing: "border-box",
};
