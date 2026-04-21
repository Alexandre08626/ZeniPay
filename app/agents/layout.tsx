// Layout shell for the /agents/* tree. Matches the existing ZeniPay
// merchant dashboard aesthetic: white/light background, ZeniPay palette.

import React from "react";

export const metadata = {
  title: "ZeniPay Agents",
  description: "Payment infrastructure for AI agents.",
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f4f8",
        color: "#0f172a",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
