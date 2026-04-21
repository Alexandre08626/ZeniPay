// Layout shell for the /agents/* tree. Entirely isolated from the existing
// /app (merchant) and /admin routes. Anything we build for the ZeniPay Agents
// product lives inside this subtree.

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
        background: "#05070E",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
