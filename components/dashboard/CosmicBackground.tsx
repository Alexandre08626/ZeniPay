// CosmicBackground — subtle floating particles for hero sections.
//
// Use sparingly: only on hero blocks that justify it (balance hero,
// ledger hero). Pure CSS + SVG — no JS animation loop, no canvas.
// A tiny deterministic RNG gives stable positions across renders so
// SSR and client stay in sync.

"use client";

import React, { useMemo } from "react";
import zp from "@/lib/design-system/zenipay-brand";

export interface CosmicBackgroundProps {
  /** Number of dots. Keep in the 10–18 range to stay subtle. */
  count?: number;
  /** Seed so two instances on the same page don't collide visually. */
  seed?: number;
  /** Base opacity (0..1). Defaults to 0.3. */
  opacity?: number;
  style?: React.CSSProperties;
}

// Mulberry32 — tiny deterministic PRNG.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CosmicBackground({
  count = 14,
  seed = 42,
  opacity = 0.32,
  style,
}: CosmicBackgroundProps) {
  const dots = useMemo(() => {
    const rand = mulberry32(seed);
    const colors = [zp.brand.cyan, zp.brand.violet, zp.brand.green];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 2 + rand() * 4,
      color: colors[Math.floor(rand() * colors.length)],
      delay: rand() * 8,
      duration: 22 + rand() * 26,
      o: 0.4 + rand() * 0.4,
    }));
  }, [count, seed]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        ...style,
      }}
    >
      {dots.map((d) => (
        <span
          key={d.id}
          style={{
            position: "absolute",
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            filter: `blur(${d.size > 4 ? 1 : 0.4}px)`,
            boxShadow: `0 0 ${d.size * 3}px ${d.color}`,
            animation: `zp-float ${d.duration}s ease-in-out ${d.delay}s infinite`,
            ["--zp-dot-o" as string]: String(opacity * d.o),
            opacity: opacity * d.o,
          }}
        />
      ))}
    </div>
  );
}

export default CosmicBackground;
