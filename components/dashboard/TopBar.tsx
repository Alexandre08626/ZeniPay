// TopBar — dashboard top chrome (logo, search, product switcher, notifs, user).
//
// Mounted by DashboardShell. Product switcher is a pill toggle with a
// gradient border that mirrors the ZeniPay logo stops, so users always
// know which side of the bank they are in.

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Bell, Search, ChevronDown, LogOut, Settings as SettingsIcon, User, Building2, Bot } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

export type DashboardMode = "merchant" | "agents" | "personal" | "admin";

export const LAST_MODE_KEY = "zenipay_last_mode";

function modeAccent(m: DashboardMode): string {
  if (m === "personal") return zp.brand.pink;
  if (m === "agents")   return zp.brand.violet;
  if (m === "admin")    return zp.brand.green;
  return zp.brand.cyan;
}

function modeLabel(m: DashboardMode): string {
  if (m === "personal") return "Personal";
  if (m === "agents")   return "Agents";
  if (m === "admin")    return "Admin";
  return "Business";
}

function modeHref(m: DashboardMode): string {
  if (m === "personal") return "/personal/overview";
  if (m === "agents")   return "/agents/dashboard";
  if (m === "admin")    return "/admin/overview";
  return "/app/overview";
}

export interface TopBarProps {
  mode: DashboardMode;
  userLabel?: string;
  userEmail?: string;
  onSignOut?: () => void;
  /** When true, the merchant is a personal_only account: hide both
   *  the Business and Agents pills so the switcher only shows
   *  Personal. */
  personalOnly?: boolean;
}

export function TopBar({ mode, userLabel, userEmail, onSignOut, personalOnly }: TopBarProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  // Persist the last mode the user opened so the next session resumes
  // where they left off (used by /login and the "/" landing redirect).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(LAST_MODE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  const switchMode = (next: DashboardMode) => {
    if (next === mode) return;
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(LAST_MODE_KEY, next); } catch { /* ignore */ }
    }
    router.push(modeHref(next));
  };

  // Cmd/Ctrl+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside closes user menu.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initial = (userLabel?.[0] ?? userEmail?.[0] ?? "Z").toUpperCase();

  return (
    <header
      style={{
        height: 64,
        background: zp.surface.bg1,
        borderBottom: `1px solid ${zp.surface.border}`,
        position: "sticky",
        top: 0,
        zIndex: zp.zIndex.sticky,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
      }}
    >
      <Link
        href={modeHref(mode)}
        aria-label="ZeniPay home"
        style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", minWidth: 140 }}
      >
        <Image
          src="/zenipay-logo-nobg.png"
          alt="ZeniPay"
          width={32}
          height={32}
          priority
          style={{ objectFit: "contain", width: 32, height: 32 }}
        />
        <span
          className="zp-brand-text"
          style={{ fontFamily: zp.font.display, fontSize: 18, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em" }}
        >
          ZeniPay
        </span>
      </Link>

      {/* Mode switcher pills — Personal / Business / Agents.
          Personal-only merchants see Personal only. */}
      {!personalOnly && <ModeSwitcher mode={mode} onSwitch={switchMode} />}

      {/* Search */}
      <div style={{ position: "relative", flex: 1, maxWidth: 440 }}>
        <Search
          size={15}
          color={zp.text.dim}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search accounts, contacts, transactions…"
          aria-label="Search"
          style={{
            width: "100%",
            height: 36,
            padding: "0 60px 0 36px",
            borderRadius: zp.radius.sm,
            border: `1px solid ${zp.surface.border}`,
            background: zp.surface.bg2,
            color: zp.text.primary,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: zp.font.sans,
          }}
        />
        <kbd
          aria-hidden
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            padding: "2px 6px",
            fontSize: 10,
            fontFamily: zp.font.mono,
            color: zp.text.muted,
            background: zp.surface.bg3,
            border: `1px solid ${zp.surface.border}`,
            borderRadius: 4,
            letterSpacing: "0.04em",
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div style={{ flex: 1 }} />

      {/* Notifications */}
      <button
        aria-label="Notifications"
        style={{
          width: 36,
          height: 36,
          borderRadius: zp.radius.sm,
          background: zp.surface.bg2,
          border: `1px solid ${zp.surface.border}`,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: zp.text.muted,
          transition: zp.motion.base,
        }}
      >
        <Bell size={16} />
      </button>

      {/* User avatar + dropdown */}
      <div ref={menuWrapRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="User menu"
          aria-expanded={menuOpen}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            padding: "0 10px 0 4px",
            borderRadius: zp.radius.pill,
            background: zp.surface.bg2,
            border: `1px solid ${zp.surface.border}`,
            cursor: "pointer",
            color: zp.text.primary,
            transition: zp.motion.base,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: zp.gradient.main,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: zp.weight.semibold,
              fontSize: 12,
              letterSpacing: "-0.01em",
            }}
          >
            {initial}
          </span>
          <ChevronDown size={14} color={zp.text.muted} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: 44,
              minWidth: 240,
              background: zp.surface.bg1,
              border: `1px solid ${zp.surface.border}`,
              borderRadius: zp.radius.md,
              boxShadow: zp.elevation.lg,
              padding: 6,
              zIndex: zp.zIndex.dropdown,
            }}
          >
            <div style={{ padding: "10px 12px 12px", borderBottom: `1px solid ${zp.surface.border}`, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
                {userLabel || userEmail || "Account"}
              </div>
              {userEmail && (
                <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>{userEmail}</div>
              )}
            </div>
            <Link
              href={
                mode === "personal" ? "/personal/settings" :
                mode === "agents"   ? "/agents/settings"   :
                                      "/app/settings"
              }
              role="menuitem"
              style={menuItemStyle}
            >
              <SettingsIcon size={14} style={{ marginRight: 8, verticalAlign: "-2px" }} />
              Settings
            </Link>
            <div style={{ height: 1, background: zp.surface.border, margin: "6px 2px" }} />
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onSignOut?.();
              }}
              style={{
                ...menuItemStyle,
                width: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: zp.semantic.danger,
                textAlign: "left" as const,
              }}
            >
              <LogOut size={14} style={{ marginRight: 8, verticalAlign: "-2px" }} />
              Sign out
            </button>
          </div>
        )}
      </div>
      <style>{hidePathname(pathname)}</style>
    </header>
  );
}

// Tiny helper — we emit an empty <style> tag so React doesn't complain if
// the pathname changes during dev HMR. Future: will host transition CSS.
function hidePathname(_p: string): string {
  return "";
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "8px 12px",
  fontSize: 13,
  color: zp.text.primary,
  textDecoration: "none",
  borderRadius: zp.radius.sm,
  fontWeight: zp.weight.medium,
};

// ---------------------------------------------------------------------------

interface ModeSwitcherProps {
  mode: DashboardMode;
  onSwitch: (next: DashboardMode) => void;
}

function ModeSwitcher({ mode, onSwitch }: ModeSwitcherProps) {
  const items: Array<{ key: DashboardMode; Icon: typeof User }> = [
    { key: "personal", Icon: User },
    { key: "merchant", Icon: Building2 },
    { key: "agents",   Icon: Bot },
  ];
  return (
    <div
      role="tablist"
      aria-label="Switch ZeniPay mode"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        borderRadius: zp.radius.pill,
        background: zp.surface.bg2,
        border: `1px solid ${zp.surface.border}`,
      }}
    >
      {items.map(({ key, Icon }) => {
        const active = mode === key;
        const accent = modeAccent(key);
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onSwitch(key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 26,
              padding: "0 12px",
              borderRadius: zp.radius.pill,
              border: "none",
              cursor: "pointer",
              background: active
                ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`
                : "transparent",
              color: active ? "#fff" : zp.text.muted,
              fontSize: 11,
              fontWeight: zp.weight.semibold,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              transition: zp.motion.base,
            }}
          >
            <Icon size={12} />
            {modeLabel(key)}
          </button>
        );
      })}
    </div>
  );
}

export default TopBar;
