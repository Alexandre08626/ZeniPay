// Client-side render of the public checkout form. Kept in a separate
// file so the parent server component can do data fetching cleanly.

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  color, gradientSignature, spacing, radius, shadow,
  font, fontSize, fontWeight, transition,
} from "@/lib/design-system/tokens";

export interface MerchantInfo {
  name: string;
  slug: string;
  allowed_currencies: string[];
  fee_bps: number;
  merchant_category: string | null;
}

type Status = "idle" | "submitting" | "ok" | "error";

export default function PayClient({ merchant }: { merchant: MerchantInfo }) {
  const firstCur = (merchant.allowed_currencies?.[0] ?? "CAD").trim();
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [receipt, setReceipt] = useState<{
    transaction_id: string;
    amount: string;
    currency: string;
  } | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const pan = String(form.get("pan") ?? "").replace(/\s+/g, "");
    const cvv = String(form.get("cvv") ?? "").trim();
    const exp = String(form.get("expiry") ?? "").trim();
    const amount = Number(form.get("amount") ?? 0);
    const currency = String(form.get("currency") ?? firstCur).trim().toUpperCase();
    const description = String(form.get("description") ?? "");

    const expMatch = /^(\d{2})\s*\/\s*(\d{2,4})$/.exec(exp);
    if (!expMatch) {
      setStatus("error"); setErrMsg("Expiry must be MM/YY or MM/YYYY.");
      return;
    }
    const expiry_month = Number(expMatch[1]);
    const expYearRaw = expMatch[2];
    const expiry_year = expYearRaw.length === 2 ? 2000 + Number(expYearRaw) : Number(expYearRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus("error"); setErrMsg("Amount must be a positive number.");
      return;
    }

    setStatus("submitting"); setErrMsg("");

    try {
      const res = await fetch("/api/v1/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          card_number_full: pan,
          cvv_plaintext: cvv,
          expiry_month,
          expiry_year,
          merchant_slug: merchant.slug,
          amount_units: amount,
          currency,
          description,
          idempotency_key: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrMsg(typeof body?.error?.message === "string" ? body.error.message : "Charge failed.");
        return;
      }
      setStatus("ok");
      setReceipt({
        transaction_id: String(body.transaction_id ?? ""),
        amount: amount.toFixed(2),
        currency,
      });
    } catch {
      setStatus("error");
      setErrMsg("Network error — please try again in a moment.");
    }
  };

  if (status === "ok" && receipt) {
    return (
      <PayShell merchant={merchant}>
        <div
          style={{
            textAlign: "center",
            padding: `${spacing[6]} ${spacing[4]}`,
          }}
        >
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              background: color.successBg,
              color: color.success,
              fontSize: 28,
              fontWeight: fontWeight.bold,
              marginBottom: spacing[4],
            }}
          >
            ✓
          </div>
          <h2 style={{
            margin: 0, fontFamily: font.serif,
            fontSize: fontSize.h4.size, lineHeight: fontSize.h4.line,
            letterSpacing: fontSize.h4.tracking,
            fontWeight: fontWeight.semibold, color: color.textHeading,
          }}>
            Payment successful
          </h2>
          <p style={{
            margin: `${spacing[3]} 0 0`,
            fontFamily: font.sans, fontSize: fontSize.lg.size,
            color: color.textBody,
          }}>
            {receipt.amount} {receipt.currency} to {merchant.name}.
          </p>
          <p style={{
            marginTop: spacing[3], marginBottom: 0,
            fontFamily: font.mono, fontSize: fontSize.xs.size, color: color.textMuted,
          }}>
            Transaction {receipt.transaction_id}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: spacing[5],
              padding: `${spacing[2]} ${spacing[4]}`,
              borderRadius: radius.sm,
              background: color.textHeading,
              color: color.white,
              textDecoration: "none",
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              fontWeight: fontWeight.semibold,
            }}
          >
            Back to zenipay.ca
          </Link>
        </div>
      </PayShell>
    );
  }

  return (
    <PayShell merchant={merchant}>
      <form onSubmit={submit} noValidate>
        <Section label="Amount">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: spacing[2] }}>
            <InputField name="amount" type="number" placeholder="0.00" step="0.01" inputMode="decimal" required />
            <SelectField name="currency" defaultValue={firstCur} options={merchant.allowed_currencies} />
          </div>
        </Section>

        <Section label="Description (optional)">
          <InputField name="description" type="text" placeholder="Order #…" />
        </Section>

        <Section label="Card number">
          <InputField name="pan" type="text" placeholder="9910 0123 4567 8901" autoComplete="cc-number" inputMode="numeric" required />
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing[3] }}>
          <Section label="Expiry (MM/YY)">
            <InputField name="expiry" type="text" placeholder="12/28" autoComplete="cc-exp" inputMode="numeric" required />
          </Section>
          <Section label="CVV">
            <InputField name="cvv" type="password" placeholder="•••" autoComplete="cc-csc" inputMode="numeric" required />
          </Section>
        </div>

        {status === "error" && errMsg && (
          <div style={{
            marginTop: spacing[3],
            padding: `${spacing[3]} ${spacing[4]}`,
            background: color.dangerBg,
            color: color.danger,
            borderRadius: radius.sm,
            fontFamily: font.sans,
            fontSize: fontSize.sm.size,
            fontWeight: fontWeight.medium,
          }}>
            {errMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            marginTop: spacing[5],
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
            transition: transition.base,
          }}
        >
          {status === "submitting" ? "Processing…" : "Pay"}
        </button>

        <p style={{
          marginTop: spacing[3],
          fontFamily: font.sans,
          fontSize: fontSize.xs.size,
          color: color.textMuted,
          textAlign: "center",
        }}>
          Secured by ZeniPay · Closed-loop ZeniCard acceptance
        </p>
      </form>
    </PayShell>
  );
}

function PayShell({ merchant, children }: { merchant: MerchantInfo; children: React.ReactNode }) {
  return (
    <div
      className="zp-root"
      style={{
        minHeight: "100vh",
        background: color.surface,
        fontFamily: font.sans,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[4],
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: color.white,
          borderRadius: radius.lg,
          border: `1px solid ${color.border}`,
          boxShadow: shadow.lg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: spacing[5],
            background: gradientSignature,
            color: color.white,
          }}
        >
          <div style={{
            fontSize: fontSize.xs.size,
            fontWeight: fontWeight.semibold,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: spacing[2],
          }}>
            Pay · {merchant.slug}
          </div>
          <div style={{
            fontFamily: font.serif,
            fontSize: fontSize.h4.size,
            lineHeight: fontSize.h4.line,
            letterSpacing: fontSize.h4.tracking,
            fontWeight: fontWeight.semibold,
          }}>
            {merchant.name}
          </div>
          {merchant.merchant_category && (
            <div style={{
              marginTop: spacing[1],
              fontSize: fontSize.xs.size,
              opacity: 0.8,
              textTransform: "capitalize",
            }}>
              {merchant.merchant_category.replace(/_/g, " ")}
            </div>
          )}
        </div>
        <div style={{ padding: spacing[5] }}>
          {children}
        </div>
        <div style={{
          padding: `${spacing[3]} ${spacing[5]}`,
          borderTop: `1px solid ${color.border}`,
          background: color.surface,
          fontFamily: font.sans,
          fontSize: fontSize.xs.size,
          color: color.textMuted,
          textAlign: "center",
        }}>
          Powered by ZeniPay · {" "}
          <Link href="/security" style={{ color: color.textBody, fontWeight: fontWeight.semibold, textDecoration: "underline", textDecorationColor: color.border }}>
            Secure by design
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spacing[3] }}>
      <label
        style={{
          display: "block",
          fontFamily: font.sans,
          fontSize: fontSize.xs.size,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: spacing[1],
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function InputField(props: {
  name: string;
  type: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  step?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <input
      name={props.name}
      type={props.type}
      placeholder={props.placeholder}
      defaultValue={props.defaultValue}
      required={props.required}
      step={props.step}
      autoComplete={props.autoComplete}
      inputMode={props.inputMode}
      style={{
        width: "100%",
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: radius.xs,
        border: `1px solid ${color.border}`,
        background: color.white,
        fontFamily: props.inputMode === "numeric" || props.inputMode === "decimal" ? font.mono : font.sans,
        fontSize: fontSize.base.size,
        color: color.textHeading,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

function SelectField({ name, defaultValue, options }: { name: string; defaultValue: string; options: string[] }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      style={{
        width: "100%",
        padding: `${spacing[3]} ${spacing[2]}`,
        borderRadius: radius.xs,
        border: `1px solid ${color.border}`,
        background: color.white,
        fontFamily: font.sans,
        fontSize: fontSize.base.size,
        color: color.textHeading,
        boxSizing: "border-box",
      }}
    >
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
