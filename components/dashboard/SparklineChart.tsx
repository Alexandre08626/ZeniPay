// SparklineChart — inline SVG area chart with gradient stroke.
//
// Takes an array of numbers, renders a single stroked path + a soft
// area fill below. Used inside BalanceHero and as a standalone component
// for any card that wants a tiny trend line. No external dep (no
// Recharts).

"use client";

import React, { useId, useMemo } from "react";
import zp from "@/lib/design-system/zenipay-brand";

export interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeFrom?: string;
  strokeTo?: string;
  /** Controls whether the area under the line is shaded. */
  fill?: boolean;
  /** When rendering over a dark hero card. Flips the area opacity to stay legible. */
  onInk?: boolean;
  style?: React.CSSProperties;
}

export function SparklineChart({
  data,
  width = 360,
  height = 80,
  strokeFrom = zp.brand.green,
  strokeTo = zp.brand.violet,
  fill = true,
  onInk = false,
  style,
}: SparklineChartProps) {
  const id = useId().replace(/:/g, "");

  const { path, area, dots } = useMemo(() => {
    if (data.length === 0) return { path: "", area: "", dots: [] as Array<{ cx: number; cy: number }> };
    const max = Math.max(1, ...data);
    const min = Math.min(0, ...data);
    const range = max - min || 1;
    const pad = 4;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    const pts = data.map((v, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * innerW;
      const y = pad + (1 - (v - min) / range) * innerH;
      return { x, y };
    });
    const p = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(" ");
    const a = pts.length
      ? `${p} L ${pts[pts.length - 1].x.toFixed(2)} ${height - pad} L ${pts[0].x.toFixed(2)} ${height - pad} Z`
      : "";
    const dots = [pts[pts.length - 1]].filter(Boolean).map((pt) => ({ cx: pt!.x, cy: pt!.y }));
    return { path: p, area: a, dots };
  }, [data, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height, ...style }}
      role="img"
      aria-label="Trend sparkline"
    >
      <defs>
        <linearGradient id={`stroke-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={strokeFrom} />
          <stop offset="100%" stopColor={strokeTo} />
        </linearGradient>
        <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={strokeTo} stopOpacity={onInk ? 0.4 : 0.22} />
          <stop offset="100%" stopColor={strokeTo} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && area && <path d={area} fill={`url(#area-${id})`} />}
      {path && (
        <path
          d={path}
          fill="none"
          stroke={`url(#stroke-${id})`}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={2.8}
          fill={strokeTo}
          stroke={onInk ? "#12132E" : "#fff"}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

export default SparklineChart;
