"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ZeniPayLogo from "@/components/ZeniPayLogo";

const NAV_ITEMS = [
  { label: "Overview", href: "/app", icon: "📊" },
  { label: "Transactions", href: "/app/transactions", icon: "💳" },
  { label: "Banking", href: "/app/banking", icon: "🏦" },
  { label: "Pay Links", href: "/app/pay-links", icon: "🔗" },
  { label: "Invoices", href: "/app/invoices", icon: "📄" },
  { label: "Payouts", href: "/app/payouts", icon: "💸" },
  { label: "Accounting", href: "/app/accounting", icon: "📒" },
  { label: "Analytics", href: "/app/analytics", icon: "📈" },
  { label: "Financing", href: "/app/financing", icon: "🏛" },
  { label: "Ben AI", href: "/app/ben-ai", icon: "🤖" },
  { label: "Settings", href: "/app/settings", icon: "⚙️" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const email = sessionStorage.getItem("zp_client_email");
    const clientId = sessionStorage.getItem("zp_client");
    if (!email && !clientId) {
      router.replace("/login");
    }
  }, [router]);

  const signOut = () => { sessionStorage.clear(); router.replace("/login"); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F1F5F9" }}>
      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: "linear-gradient(180deg, #0A0F1E 0%, #111B3C 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
        transition: "transform 0.3s",
      }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <ZeniPayLogo size={140} showWordmark />
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => { e.preventDefault(); router.push(item.href); setMobileOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 2,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                  background: active ? "rgba(45,190,96,0.15)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={signOut}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 260, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
