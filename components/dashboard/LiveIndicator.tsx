// LiveIndicator — pulsing dot + label. Used for "chain verified", "live",
// "online" status badges. Pulse animation is CSS-only (see
// lib/design-system/globals.css @keyframes zp-pulse).

"use client";

import React from "react";
import zp from "@/lib/design-system/zenipay-brand";

export interface LiveIndicatorProps {
  /** Dot colour. Defaults to success green. */
  color?: string;
  label: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

export function LiveIndicator({
  color = zp.semantic.success,
  label,
  pulse = true,
  size = "md",
}: LiveIndicatorProps) {
  const dot = size === "sm" ? 6 : 8;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: zp.text.muted,
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: zp.weight.medium,
        letterSpacing: "0.02em",
      }}
    >
      <span
        aria-hidden
        className={pulse ? "zp-pulse-green" : undefined}
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          boxShadow: pulse ? `0 0 0 0 ${color}66` : "none",
        }}
      />
      {label}
    </span>
  );
}

export default LiveIndicator;
