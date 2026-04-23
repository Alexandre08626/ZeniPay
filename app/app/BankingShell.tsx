// BankingShell — the neobank layout primitive for /app/*.
//
// Mercury / Brex / Relay-style chrome:
//   * 240px sticky sidebar on desktop, slide-over drawer on <= md.
//   * Minimal top bar (breadcrumb + search + notifications + user menu).
//   * Light surface background, white content cards, deep-forest accent.
//   * Keyboard shortcut: Cmd+K focuses search (no command palette yet).
//
// Every /app/* page imports from here. Do NOT reuse outside /app/*.

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { banking } from "@/lib/design-system/banking-tokens";

const { color: C, gradient: G, radius: R, fontWeight: FW } = banking;

// ───────────────────────────────────────────────────────────────────────────
// Navigation config
// ───────────────────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group?: "banking" | "tools" | "platform";
  match?: (path: string) => boolean;   // override default prefix match
}

const DEFAULT_NAV: NavItem[] = [
  { href: "/app/overview",     label: "Overview",     icon: "🏦", group: "banking" },
  { href: "/app/accounts",     label: "Accounts",     icon: "💰", group: "banking" },
  { href: "/app/transactions", label: "Transactions", icon: "📊", group: "banking" },
  { href: "/app/cards",        label: "Cards",        icon: "💳", group: "banking" },
  { href: "/app/wallets",      label: "Send & Receive", icon: "🔄", group: "banking" },

  { href: "/app/invoices",     label: "Invoices",     icon: "📋", group: "tools" },
  { href: "/app/contacts",     label: "Contacts",     icon: "👥", group: "tools" },
  { href: "/app/pay-links",    label: "Payment links", icon: "🔗", group: "tools" },
  { href: "/app/settings",     label: "Settings",     icon: "⚙️", group: "tools" },

  { href: "/agents/overview",  label: "Agents platform", icon: "🤖", group: "platform" },
];

// ───────────────────────────────────────────────────────────────────────────
// Session read (sessionStorage, matches the existing merchant auth)
// ───────────────────────────────────────────────────────────────────────────

interface MerchantSession {
  email: string;
  businessName: string;
  firstName: string;
  clientId: string;
}

function readMerchantSession(): MerchantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const email = sessionStorage.getItem("zp_client_email") || "";
    const clientId = sessionStorage.getItem("zp_client") || "";
    if (!email && !clientId) return null;
    const businessName = sessionStorage.getItem("zp_client_bname") || "";
    const firstName = sessionStorage.getItem("zp_client_first_name") ||
      (email.split("@")[0] || "").split(".")[0].replace(/[^a-zA-Z-]/g, "");
    return { email, businessName, firstName, clientId };
  } catch {
    return null;
  }
}

function clearMerchantSession() {
  if (typeof window === "undefined") return;
  try { sessionStorage.clear(); } catch { /* ignore */ }
}

// ───────────────────────────────────────────────────────────────────────────
// Shell
// ───────────────────────────────────────────────────────────────────────────

export interface BankingShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  nav?: NavItem[];
  children: React.ReactNode;
}

export function BankingShell({ title, subtitle, actions, nav = DEFAULT_NAV, children }: BankingShellProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [session, setSession] = useState<MerchantSession | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Bootstrap session on mount — redirect to /login if absent.
  useEffect(() => {
    const s = readMerchantSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  // Global keyboard shortcut: Cmd/Ctrl+K → focus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = useCallback(() => {
    clearMerchantSession();
    router.replace("/login");
  }, [router]);

  // Close drawer on route change.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const navByGroup: Record<string, NavItem[]> = {};
  for (const n of nav) (navByGroup[n.group ?? "banking"] ??= []).push(n);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.surface, color: C.textPrimary, fontFamily: banking.font.sans }}>
      <style>{shellCss}</style>

      {/* Sidebar — desktop sticky, mobile drawer */}
      <aside
        className={`bs-sidebar${drawerOpen ? " bs-sidebar-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.borderSoft}` }}>
          <Link href="/app/overview" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10,
              background: G.primary, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: FW.black, fontSize: 15, letterSpacing: "-0.04em",
            }}>Z</span>
            <div>
              <div style={{ fontWeight: FW.black, fontSize: 15, letterSpacing: "-0.3px", color: C.textPrimary }}>
                ZeniPay
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: FW.bold, letterSpacing: "0.14em", marginTop: 1 }}>
                BANKING
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {(["banking", "tools", "platform"] as const).map((g) => {
            const items = navByGroup[g] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={g} style={{ marginTop: g === "banking" ? 0 : 16 }}>
                {g === "platform" && (
                  <div style={{ height: 1, background: C.borderSoft, margin: "6px 8px 10px" }} />
                )}
                {g !== "banking" && (
                  <div style={{
                    padding: "2px 12px 6px",
                    fontSize: 10, color: C.textMuted, fontWeight: FW.bold,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                  }}>
                    {g === "tools" ? "Tools" : "Platform"}
                  </div>
                )}
                {items.map((n) => {
                  const active = n.match ? n.match(pathname) :
                    (pathname === n.href || pathname.startsWith(n.href + "/"));
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: R.md,
                        textDecoration: "none",
                        background: active ? "rgba(15,79,63,0.08)" : "transparent",
                        color: active ? C.accountPrimary : C.textSecondary,
                        fontSize: 13,
                        fontWeight: active ? FW.bold : FW.medium,
                        marginBottom: 1,
                        position: "relative",
                      }}
                    >
                      {active && (
                        <span style={{
                          position: "absolute", left: 0, top: 8, bottom: 8,
                          width: 3, borderRadius: 2, background: C.accountPrimary,
                        }} />
                      )}
                      <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{n.icon}</span>
                      <span style={{ flex: 1 }}>{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: "14px 14px 16px", borderTop: `1px solid ${C.borderSoft}` }}>
          <div style={{
            padding: "10px 12px", borderRadius: R.md,
            background: C.surfaceInset, border: `1px solid ${C.borderSoft}`,
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: FW.bold, letterSpacing: "0.1em" }}>
              SIGNED IN
            </div>
            <div style={{
              fontSize: 12, color: C.textPrimary, fontWeight: FW.bold,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginTop: 2,
            }}>
              {session?.email ?? "…"}
            </div>
            {session?.businessName && (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                {session.businessName}
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: R.sm,
              background: "transparent", border: `1px solid ${C.borderSoft}`,
              color: C.textSecondary, fontSize: 12, fontWeight: FW.bold,
              cursor: "pointer", transition: banking.transition.base,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="bs-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            height: 64, background: C.surfaceElevated, borderBottom: `1px solid ${C.borderSoft}`,
            position: "sticky", top: 0, zIndex: banking.zIndex.sticky,
            display: "flex", alignItems: "center", gap: 16, padding: "0 24px",
          }}
        >
          <button
            className="bs-menu-btn"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Toggle navigation"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              width: 36, height: 36, borderRadius: R.sm,
              display: "none", alignItems: "center", justifyContent: "center",
              color: C.textPrimary, fontSize: 20,
            }}
          >
            ☰
          </button>

          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontSize: 18, fontWeight: FW.black,
              color: C.textPrimary, letterSpacing: "-0.3px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                margin: "2px 0 0", fontSize: 12, color: C.textMuted,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div className="bs-search-wrap" style={{ position: "relative", width: 260 }}>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search… (Cmd+K)"
              aria-label="Search"
              style={{
                width: "100%", height: 36, padding: "0 12px 0 34px",
                borderRadius: R.sm, border: `1px solid ${C.borderSoft}`,
                background: C.surfaceInset, color: C.textPrimary,
                fontSize: 13, outline: "none", boxSizing: "border-box",
                fontFamily: banking.font.sans,
              }}
            />
            <span style={{
              position: "absolute", left: 11, top: 0, bottom: 0,
              display: "flex", alignItems: "center", color: C.textMuted,
              fontSize: 13, pointerEvents: "none",
            }}>🔍</span>
          </div>

          <button
            aria-label="Notifications"
            style={{
              width: 36, height: 36, borderRadius: R.sm,
              background: "transparent", border: `1px solid ${C.borderSoft}`,
              cursor: "pointer", fontSize: 15, color: C.textSecondary,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            🔔
          </button>

          {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: G.primary, color: "#fff",
                border: "none", cursor: "pointer",
                fontWeight: FW.bold, fontSize: 13, letterSpacing: "-0.02em",
              }}
            >
              {(session?.firstName?.[0] ?? session?.email?.[0] ?? "?").toUpperCase()}
            </button>
            {userMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute", right: 0, top: 44, minWidth: 220,
                  background: C.surfaceElevated, border: `1px solid ${C.borderSoft}`,
                  borderRadius: R.md, boxShadow: banking.shadow.md,
                  padding: 6, zIndex: banking.zIndex.dropdown,
                }}
              >
                <div style={{ padding: "10px 12px 12px", borderBottom: `1px solid ${C.borderSoft}`, marginBottom: 4 }}>
                  <div style={{ fontWeight: FW.bold, fontSize: 13, color: C.textPrimary }}>
                    {session?.firstName || session?.email || "Account"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {session?.email}
                  </div>
                </div>
                <Link href="/app/settings" role="menuitem" style={menuItemStyle}>Settings</Link>
                <Link href="/app/settings#team" role="menuitem" style={menuItemStyle}>Team</Link>
                <Link href="/agents/overview" role="menuitem" style={menuItemStyle}>Agents platform →</Link>
                <div style={{ height: 1, background: C.borderSoft, margin: "6px 2px" }} />
                <button
                  role="menuitem"
                  onClick={signOut}
                  style={{ ...menuItemStyle, width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", color: C.disputed }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1360, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Smaller primitives consumers can compose.
export function BankingCard({ children, style, interactive }: { children: React.ReactNode; style?: React.CSSProperties; interactive?: boolean }) {
  return (
    <div
      style={{
        background: C.surfaceElevated, border: `1px solid ${C.borderSoft}`,
        borderRadius: R.md, padding: "20px 22px",
        transition: interactive ? banking.transition.base : undefined,
        cursor: interactive ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BankingStat({ label, value, delta, sub }: { label: string; value: React.ReactNode; delta?: { amount: string; positive: boolean }; sub?: string }) {
  return (
    <BankingCard>
      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: FW.bold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ ...banking.amount.large, fontSize: 24, marginTop: 6, color: C.textPrimary }}>
        {value}
      </div>
      {(delta || sub) && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          {delta && (
            <span style={{
              color: delta.positive ? C.incomePositive : C.disputed,
              fontWeight: FW.bold,
            }}>
              {delta.positive ? "↑" : "↓"} {delta.amount}
            </span>
          )}
          {sub && <span style={{ color: C.textMuted }}>{sub}</span>}
        </div>
      )}
    </BankingCard>
  );
}

export function BankingButton({
  children, variant = "primary", size = "md", onClick, disabled, type = "button", style, as, href,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  as?: "link";
  href?: string;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    border: "none", borderRadius: R.sm,
    fontWeight: FW.bold, cursor: disabled ? "not-allowed" : "pointer",
    transition: banking.transition.base,
    fontFamily: banking.font.sans,
    ...(size === "sm"
      ? { padding: "6px 12px", fontSize: 12 }
      : size === "lg"
      ? { padding: "12px 22px", fontSize: 14 }
      : { padding: "9px 16px", fontSize: 13 }),
  };
  const variantStyle: React.CSSProperties =
    variant === "primary" ? { background: disabled ? "#94A3B8" : C.accountPrimary, color: "#fff" } :
    variant === "secondary" ? { background: C.surfaceElevated, color: C.textPrimary, border: `1px solid ${C.borderSoft}` } :
    variant === "ghost" ? { background: "transparent", color: C.textSecondary } :
    /* danger */ { background: C.disputedBg, color: C.disputed };

  const merged: React.CSSProperties = { ...base, ...variantStyle, ...style };
  if (as === "link" && href) {
    return <Link href={href} style={{ ...merged, textDecoration: "none" }}>{children}</Link>;
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={merged}>
      {children}
    </button>
  );
}

export const bankingTokens = banking;

// ───────────────────────────────────────────────────────────────────────────
// Shell-local styles (drawer + responsive hiding). Kept in a <style> tag so
// the component stays self-contained. Keep selectors scoped with `bs-*`.
// ───────────────────────────────────────────────────────────────────────────

const shellCss = `
.bs-sidebar {
  width: 240px;
  background: ${C.surfaceElevated};
  border-right: 1px solid ${C.borderSoft};
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
}
.bs-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.4);
  z-index: ${banking.zIndex.overlay};
}
@media (max-width: 900px) {
  .bs-sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    transform: translateX(-100%);
    transition: transform 180ms ease-out;
    z-index: ${banking.zIndex.modal};
    box-shadow: 4px 0 24px rgba(15,23,42,0.08);
  }
  .bs-sidebar-open { transform: translateX(0); }
  .bs-backdrop { display: block; }
  .bs-menu-btn { display: inline-flex !important; }
  .bs-search-wrap { width: 160px !important; }
}
@media (max-width: 640px) {
  .bs-search-wrap { display: none !important; }
}
`;

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "8px 12px",
  fontSize: 13,
  color: C.textPrimary,
  textDecoration: "none",
  borderRadius: R.sm,
  fontWeight: FW.medium,
};
