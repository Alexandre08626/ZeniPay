import React from "react";

interface ZeniPayLogoProps {
  /** Size of the icon square in px */
  size?: number;
  /** Show the wordmark "ZeniPay" next to the icon */
  showWordmark?: boolean;
  /** Wordmark font size (defaults to size * 0.45) */
  wordmarkSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ZeniPayLogo({
  size = 40,
  showWordmark = false,
  wordmarkSize,
  className,
  style,
}: ZeniPayLogoProps) {
  const wSize = wordmarkSize ?? Math.round(size * 0.45);
  const id = React.useId().replace(/:/g, "");

  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.28), ...style }}
    >
      {/* Icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={`zp-icon-${id}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2DBE60" />
            <stop offset="55%"  stopColor="#15B8C9" />
            <stop offset="100%" stopColor="#7B4FBF" />
          </linearGradient>
          {/* Subtle inner glow */}
          <filter id={`zp-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Rounded square background */}
        <rect width="40" height="40" rx="10" fill={`url(#zp-icon-${id})`} />

        {/* Z letterform — bold, clean, financial */}
        {/* Top bar */}
        <line x1="11" y1="12" x2="29" y2="12" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        {/* Diagonal */}
        <line x1="29" y1="12" x2="11" y2="28" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
        {/* Bottom bar */}
        <line x1="11" y1="28" x2="29" y2="28" stroke="white" strokeWidth="3.2" strokeLinecap="round" />

        {/* Small accent dot — bottom right corner of Z */}
        <circle cx="29" cy="28" r="2.2" fill="white" opacity="0.85" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <svg
          width={Math.round(wSize * 4.2)}
          height={Math.round(wSize * 1.4)}
          viewBox="0 0 88 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <defs>
            <linearGradient id={`zp-text-${id}`} x1="0" y1="0" x2="88" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#2DBE60" />
              <stop offset="50%"  stopColor="#15B8C9" />
              <stop offset="100%" stopColor="#7B4FBF" />
            </linearGradient>
          </defs>
          <text
            x="0"
            y="22"
            fontFamily="'Inter', system-ui, sans-serif"
            fontWeight="900"
            fontSize="22"
            letterSpacing="-0.8"
            fill={`url(#zp-text-${id})`}
          >
            ZeniPay
          </text>
        </svg>
      )}
    </div>
  );
}
