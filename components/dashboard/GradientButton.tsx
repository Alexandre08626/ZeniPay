// GradientButton — primary dashboard CTA.
//
// Three variants:
//   * primary  — gradient fill (green → cyan → violet) with shimmer pass
//   * secondary — white / bg-1 fill with border
//   * ghost    — transparent, text only
// Sizes: sm / md / lg.

"use client";

import Link from "next/link";
import React from "react";
import zp from "@/lib/design-system/zenipay-brand";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface GradientButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  href?: string;              // renders Link if provided
  icon?: React.ReactNode;
  iconRight?: boolean;
  ariaLabel?: string;
}

const sizeStyle: Record<Size, React.CSSProperties> = {
  sm: { height: 30, padding: "0 12px", fontSize: 12 },
  md: { height: 36, padding: "0 16px", fontSize: 13 },
  lg: { height: 44, padding: "0 22px", fontSize: 14 },
};

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  loading,
  type = "button",
  style,
  href,
  icon,
  iconRight,
  ariaLabel,
}: GradientButtonProps) {
  const isDisabled = disabled || loading;
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: zp.radius.sm,
    fontFamily: zp.font.sans,
    fontWeight: zp.weight.semibold,
    letterSpacing: "0.01em",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: zp.motion.base,
    border: "none",
    position: "relative",
    overflow: "hidden",
    ...sizeStyle[size],
  };

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: isDisabled ? zp.surface.bg3 : zp.gradient.main,
          color: "#fff",
          boxShadow: isDisabled ? "none" : "0 2px 12px rgba(21,184,201,0.3)",
        }
      : variant === "secondary"
        ? {
            background: zp.surface.bg1,
            color: zp.text.primary,
            boxShadow: `inset 0 0 0 1px ${zp.surface.border}`,
          }
        : variant === "danger"
          ? {
              background: zp.semantic.dangerBg,
              color: zp.semantic.danger,
              boxShadow: `inset 0 0 0 1px ${zp.semantic.danger}33`,
            }
          : {
              /* ghost */ background: "transparent",
              color: zp.text.muted,
            };

  const content = (
    <>
      {icon && !iconRight && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>}
      <span>{loading ? "…" : children}</span>
      {icon && iconRight && <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>}
      {variant === "primary" && !isDisabled && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
            transform: "translateX(-100%)",
            animation: "zp-shimmer 3.2s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link
        href={href}
        style={{ ...base, ...variantStyle, textDecoration: "none", ...style }}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{ ...base, ...variantStyle, ...style }}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}

export default GradientButton;
