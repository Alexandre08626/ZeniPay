// TopBar — dashboard top chrome (logo, search, product switcher, notifs, user).
//
// Mounted by DashboardShell. Product switcher is a pill toggle with a
// gradient border that mirrors the ZeniPay logo stops, so users always
// know which side of the bank they are in.

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Bell, Search, ChevronDown, LogOut, Settings as SettingsIcon, ArrowRightLeft } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

export type DashboardMode = "merchant" | "agents";

export interface TopBarProps {
  mode: DashboardMode;
  userLabel?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function TopBar({ mode, userLabel, userEmail, onSignOut }: TopBarProps) {
  const pathname = usePathname() ?? "";
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);

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

  // Keep merchant and agents strictly separate — no prominent switcher
  // that suggests they share a session. Cross-navigation lives in the
  // user-menu dropdown and routes to the authenticated operator
  // dashboard (`/agents/dashboard`), never to the marketing
  // `/agents/overview` page.
  const crossTarget = mode === "merchant" ? "/agents/dashboard" : "/app/overview";
  const crossLabel  = mode === "merchant" ? "Switch to Agents"  : "Switch to Merchant";

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
        href={mode === "merchant" ? "/app/overview" : "/agents/dashboard"}
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

      {/* Mode badge — shows which side of the bank you're in, but does NOT
          let you switch in one click (cross-nav lives in the user menu). */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 26,
          padding: "0 10px",
          borderRadius: zp.radius.pill,
          background:
            mode === "merchant"
              ? "rgba(21,184,201,0.10)"
              : "rgba(123,79,191,0.10)",
          color: mode === "merchant" ? zp.brand.cyan : zp.brand.violet,
          fontSize: 11,
          fontWeight: zp.weight.semibold,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: mode === "merchant" ? zp.brand.cyan : zp.brand.violet,
          }}
        />
        {mode === "merchant" ? "Merchant" : "Agents"}
      </span>

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
            <Link href={mode === "merchant" ? "/app/settings" : "/agents/settings"} role="menuitem" style={menuItemStyle}>
              <SettingsIcon size={14} style={{ marginRight: 8, verticalAlign: "-2px" }} />
              Settings
            </Link>
            <Link
              href={crossTarget}
              role="menuitem"
              style={menuItemStyle}
            >
              <ArrowRightLeft size={14} style={{ marginRight: 8, verticalAlign: "-2px" }} />
              {crossLabel}
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

export default TopBar;
