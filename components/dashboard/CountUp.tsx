// CountUp — animated number counter.
//
// Tweens from the previous `value` to the new one on mount and on every
// update. Uses requestAnimationFrame, no external deps. Render the formatted
// output through the `format` callback so $100,000.00 and 100,000 share
// the same component.

"use client";

import React, { useEffect, useRef, useState } from "react";

export interface CountUpProps {
  value: number;
  duration?: number;           // ms, default 700
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export function CountUp({
  value,
  duration = 700,
  format = (n) => n.toLocaleString(),
  className,
  style,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);
  const toRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === toRef.current) return;
    fromRef.current = display;
    toRef.current = value;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);                 // easeOutCubic
      const v = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {format(display)}
    </span>
  );
}

export default CountUp;
