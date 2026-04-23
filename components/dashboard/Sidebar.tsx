// Sidebar — dashboard left chrome.
//
// Context-aware: shows the merchant nav when on /app/*, the agents nav
// when on /agents/*. Active route is marked with a gradient left accent
// bar + subtle tint background (cyan for merchant, violet for agents).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Home,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  SendHorizontal,
  FileText,
  Users,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Bot,
  Building2,
  Shield,
  Receipt,
  CheckSquare,
  BookOpen,
  KeyRound,
  IdCard,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { DashboardMode } from "./TopBar";
import zp from "@/lib/design-system/zenipay-brand";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  group?: "primary" | "tools" | "advanced";
}

const MERCHANT_NAV: NavItem[] = [
  { href: "/app/overview",     label: "Overview",      Icon: Home,            group: "primary" },
  { href: "/app/accounts",     label: "Accounts",      Icon: Wallet,          group: "primary" },
  { href: "/app/transactions", label: "Transactions",  Icon: ArrowLeftRight,  group: "primary" },
  { href: "/app/cards",        label: "Cards",         Icon: CreditCard,      group: "primary" },
  { href: "/app/wallets",      label: "Send & Receive", Icon: SendHorizontal, group: "primary" },

  { href: "/app/invoices",     label: "Invoices",      Icon: FileText,        group: "tools" },
  { href: "/app/contacts",     label: "Contacts",      Icon: Users,           group: "tools" },
  { href: "/app/pay-links",    label: "Payment links", Icon: LinkIcon,        group: "tools" },
  { href: "/app/settings",     label: "Settings",      Icon: SettingsIcon,    group: "tools" },
];

const AGENTS_NAV: NavItem[] = [
  { href: "/agents/overview",     label: "Overview",     Icon: Home,            group: "primary" },
  { href: "/agents/treasury",     label: "Treasury",     Icon: Building2,       group: "primary" },
  { href: "/agents/ledger",       label: "Ledger",       Icon: BookOpen,        group: "primary" },
  { href: "/agents/zenicards",    label: "ZeniCards",    Icon: CreditCard,      group: "primary" },
  { href: "/agents/agents",       label: "Agents",       Icon: Bot,             group: "primary" },
  { href: "/agents/transactions", label: "Transactions", Icon: ArrowLeftRight,  group: "primary" },

  { href: "/agents/approvals",    label: "Approvals",    Icon: CheckSquare,     group: "tools" },
  { href: "/agents/fraud",        label: "Fraud",        Icon: Shield,          group: "tools" },
  { href: "/agents/accounting",   label: "Accounting",   Icon: Receipt,         group: "tools" },
  { href: "/agents/audit",        label: "Audit",        Icon: Activity,        group: "tools" },
  { href: "/agents/cards",        label: "External cards", Icon: IdCard,        group: "advanced" },
  { href: "/agents/api-keys",     label: "API keys",     Icon: KeyRound,        group: "advanced" },
  { href: "/agents/settings",     label: "Settings",     Icon: SettingsIcon,    group: "advanced" },
];

export interface SidebarProps {
  mode: DashboardMode;
  openDrawer?: boolean;
  onCloseDrawer?: () => void;
}

export function Sidebar({ mode, openDrawer, onCloseDrawer }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const nav = mode === "merchant" ? MERCHANT_NAV : AGENTS_NAV;
  const accent = mode === "merchant" ? zp.brand.cyan : zp.brand.violet;
  const tint = mode === "merchant" ? zp.gradient.tintCyan : zp.gradient.tintViolet;

  const groupBy: Record<string, NavItem[]> = {};
  for (const n of nav) (groupBy[n.group ?? "primary"] ??= []).push(n);
  const groupOrder: Array<"primary" | "tools" | "advanced"> = ["primary", "tools", "advanced"];

  const railClass = `zp-rail${openDrawer ? " zp-rail-open" : ""}`;

  return (
    <>
      <style>{sidebarCss}</style>

      <aside className={railClass} aria-label="Primary navigation">
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {groupOrder.map((g) => {
            const items = groupBy[g] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={g} style={{ marginTop: g === "primary" ? 0 : 18 }}>
                {g !== "primary" && (
                  <div
                    style={{
                      padding: "2px 12px 6px",
                      fontSize: 10,
                      color: zp.text.dim,
                      fontWeight: zp.weight.semibold,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {g === "tools" ? "Tools" : "Advanced"}
                  </div>
                )}
                {items.map((n) => {
                  const active =
                    pathname === n.href || pathname.startsWith(n.href + "/");
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "9px 12px",
                        borderRadius: zp.radius.md,
                        textDecoration: "none",
                        background: active ? tint : "transparent",
                        color: active ? zp.text.primary : zp.text.muted,
                        fontSize: 13,
                        fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                        marginBottom: 2,
                        transition: zp.motion.base,
                      }}
                    >
                      {active && (
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 8,
                            bottom: 8,
                            width: 3,
                            borderRadius: 2,
                            background: accent,
                            boxShadow: `0 0 8px ${accent}66`,
                          }}
                        />
                      )}
                      <n.Icon
                        size={16}
                        color={active ? accent : zp.text.muted}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      <span style={{ flex: 1 }}>{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer — system status */}
        <div
          style={{
            padding: "12px 14px 16px",
            borderTop: `1px solid ${zp.surface.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              fontSize: 11,
              color: zp.text.muted,
            }}
          >
            <span
              className="zp-pulse-green"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: zp.semantic.success,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: zp.weight.medium }}>
              All systems operational
            </span>
          </div>
        </div>
      </aside>

      {openDrawer && (
        <div
          onClick={onCloseDrawer}
          aria-hidden
          className="zp-rail-backdrop"
        />
      )}
    </>
  );
}

const sidebarCss = `
.zp-rail {
  width: 240px;
  flex-shrink: 0;
  background: ${zp.surface.bg1};
  border-right: 1px solid ${zp.surface.border};
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
}
.zp-rail-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.32);
  backdrop-filter: blur(2px);
  z-index: ${zp.zIndex.overlay};
}
@media (max-width: 900px) {
  .zp-rail {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
    z-index: ${zp.zIndex.modal};
    box-shadow: 4px 0 24px rgba(15,23,42,0.1);
  }
  .zp-rail-open { transform: translateX(0); }
  .zp-rail-backdrop { display: block; }
}
`;

export default Sidebar;
