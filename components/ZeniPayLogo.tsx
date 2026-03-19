import React from "react";

interface ZeniPayLogoProps {
  /** Size of the icon in px */
  size?: number;
  /** Show the "ZeniPay" wordmark text next to the icon */
  showWordmark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ZeniPayLogo({
  size = 40,
  showWordmark = false,
  className,
  style,
}: ZeniPayLogoProps) {
  const id = React.useId().replace(/:/g, "");

  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.28), ...style }}
    >
      {/* Real logo PNG — SVG fallback if file missing */}
      <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
        <img
          src="/zenipay-logo.png"
          alt="ZeniPay"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain", display: "block" }}
          onError={e => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        {/* SVG fallback */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "none", position: "absolute", inset: 0 }}
        >
          <defs>
            <linearGradient id={`zp-fb-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#2DBE60" />
              <stop offset="55%"  stopColor="#15B8C9" />
              <stop offset="100%" stopColor="#7B4FBF" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill={`url(#zp-fb-${id})`} />
          <line x1="11" y1="12" x2="29" y2="12" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="29" y1="12" x2="11" y2="28" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="11" y1="28" x2="29" y2="28" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span style={{
          fontWeight: 900,
          fontSize: Math.round(size * 0.48),
          background: "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.5px",
          lineHeight: 1,
          flexShrink: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          ZeniPay
        </span>
      )}
    </div>
  );
}
