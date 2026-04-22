"use client";

// Shared marketing-page wrapper — puts the MarketingNav on top, handles
// the same merchant-session auto-redirect as the landing, wraps content
// in the `.zp-root` scope for the design-system reset, and appends the
// MarketingFooter at the bottom.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MarketingNav, { type MarketingNavProps } from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";
import { color, font } from "@/lib/design-system/tokens";

export default function MarketingShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: MarketingNavProps["active"];
}) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("zp_client")) {
        router.replace("/app/overview");
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  return (
    <div
      className="zp-root"
      style={{
        minHeight: "100vh",
        background: color.white,
        color: color.textBody,
        fontFamily: font.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MarketingNav active={active} />
      <main style={{ flex: 1 }}>{children}</main>
      <MarketingFooter />
    </div>
  );
}
