// Orvel's logo mark (the circuit "O"), from the Zenitech brand assets
// (public/orvel/*). Round crop — the artwork sits on black.

import React from "react";
import type { LucideIcon } from "lucide-react";

export function OrvelMark({ size = 32, style }: { size?: number; style?: React.CSSProperties }) {
  const src = size <= 40 ? "/orvel/orvel-mark-64.webp" : size <= 80 ? "/orvel/orvel-mark-128.webp" : "/orvel/orvel-mark-256.webp";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Orvel"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", background: "#000", objectFit: "cover", flexShrink: 0, display: "block", ...style }}
    />
  );
}

/** Drop-in for lucide icons in nav lists (accepts and ignores color/strokeWidth). */
export const OrvelNavIcon = (({ size = 16 }: { size?: number | string }) => (
  <OrvelMark size={Number(size) || 16} />
)) as unknown as LucideIcon;

export default OrvelMark;
